import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/**
 * Server-side automation gate. Even if the frontend or a stale client
 * triggers a calendar sync, we refuse to call Google when the global flag
 * `google_calendar_auto_sync` is disabled in system_settings.
 * Defaults to enabled when the row is missing.
 */
async function isCalendarAutomationEnabled(admin: any): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("is_automation_enabled", { _channel: "google_calendar_auto_sync" });
    if (error) {
      console.warn("automation flag check failed, defaulting ON:", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.warn("automation flag check threw, defaulting ON:", e);
    return true;
  }
}

// Canonical list of supported timezones — must match public.supported_timezones() and BookingForm
const SUPPORTED_TIMEZONES = new Set<string>([
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Rio_Branco",
  "America/Noronha",
  "America/Argentina/Buenos_Aires",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Tokyo",
  "UTC",
]);

// ===== Sanitization =====
// Strip secrets, tokens, emails, URLs and long payloads from error messages
// so logs never store sensitive data. Admins still see full context via
// the `details` JSON column (gated by RLS on the table).
function sanitizeErrorMessage(input: unknown, maxLen = 300): string | null {
  if (input == null) return null;
  let msg = typeof input === "string" ? input : (() => {
    try { return JSON.stringify(input); } catch { return String(input); }
  })();
  if (!msg) return null;

  // Tokens / secrets — order matters
  msg = msg.replace(/(?:Bearer|Basic)\s+[A-Za-z0-9._\-+/=]+/gi, "[REDACTED_TOKEN]");
  msg = msg.replace(/ya29\.[A-Za-z0-9._\-]+/g, "[REDACTED_GOOGLE_ACCESS_TOKEN]");
  msg = msg.replace(/1\/\/0[A-Za-z0-9._\-]+/g, "[REDACTED_GOOGLE_REFRESH_TOKEN]");
  msg = msg.replace(/eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, "[REDACTED_JWT]");
  msg = msg.replace(/\bsk_(?:live|test)_[A-Za-z0-9]+/g, "[REDACTED_STRIPE_KEY]");
  // Generic key=value secrets in JSON-like text
  msg = msg.replace(/("?(?:access_token|refresh_token|id_token|client_secret|api[_-]?key|password|authorization)"?\s*[:=]\s*")[^"]+(")/gi, '$1[REDACTED]$2');
  msg = msg.replace(/\b(access_token|refresh_token|id_token|client_secret|api[_-]?key|password|authorization)=([^&\s"]+)/gi, "$1=[REDACTED]");
  // Emails
  msg = msg.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]");
  // URLs (keep host, drop path & query — paths often contain ids/tokens)
  msg = msg.replace(/https?:\/\/([^\s/"]+)\/?[^\s"]*/gi, "https://$1/[…]");
  // IPv4
  msg = msg.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IP]");
  // Collapse whitespace and truncate
  msg = msg.replace(/\s+/g, " ").trim();
  if (msg.length > maxLen) msg = msg.slice(0, maxLen) + "…";
  return msg;
}

// ===== Error classification =====
// Normalized failure taxonomy used by both `google-calendar-sync` and
// `google-calendar-retry`. The shape is intentionally stable so admins can
// query `google_calendar_sync_logs.details->>'error_code'` and build alerts
// or dashboards without parsing free-form error_message strings.
//
// category:
//   - "transient"    → network / 5xx / 408 / 429 → retriable
//   - "auth"         → 401 / token / refresh / invalid_grant → retriable (after refresh)
//   - "validation"   → 400 / 422 / invalid timezone / missing field → NOT retriable
//   - "not_found"    → 404 → NOT retriable (event already gone)
//   - "permission"   → 403 → NOT retriable (scope/access revoked)
//   - "conflict"     → 409 → NOT retriable (caller must reconcile)
//   - "quota"        → 429 / quota exceeded → retriable with backoff
//   - "client_error" → other 4xx → NOT retriable
//   - "unknown"      → no signal → retriable (defensive)
export type ErrorCategory =
  | "transient"
  | "auth"
  | "validation"
  | "not_found"
  | "permission"
  | "conflict"
  | "quota"
  | "client_error"
  | "unknown";

export interface ClassifiedError {
  retriable: boolean;
  category: ErrorCategory;
  // Stable machine code (UPPER_SNAKE) for dashboards and filters
  error_code: string;
  // Short human-readable PT-BR reason for audit / troubleshooting
  reason: string;
  http_status: number | null;
}

function classifyError(
  status: number | null | undefined,
  errorMessage?: string | null,
): ClassifiedError {
  const msg = (errorMessage ?? "").toString();
  const lower = msg.toLowerCase();

  // Token / auth signals (independent of HTTP status)
  if (/invalid_grant/i.test(msg)) {
    return {
      retriable: false, // refresh token revoked → user must reconnect
      category: "auth",
      error_code: "AUTH_INVALID_GRANT",
      reason: "Refresh token revogado pelo Google. O usuário precisa reconectar a conta do Google Calendar.",
      http_status: status ?? null,
    };
  }
  if (/token refresh failed/i.test(msg)) {
    return {
      retriable: true,
      category: "auth",
      error_code: "AUTH_REFRESH_FAILED",
      reason: "Falha ao renovar access token do Google. Nova tentativa será feita após backoff.",
      http_status: status ?? null,
    };
  }
  if (/google calendar não conectado|google calendar nao conectado/i.test(lower)) {
    return {
      retriable: false,
      category: "auth",
      error_code: "AUTH_NOT_CONNECTED",
      reason: "Usuário não conectou o Google Calendar. Conecte a integração antes de sincronizar.",
      http_status: status ?? null,
    };
  }

  // No status → assume transient (network, abort, dns)
  if (status == null) {
    return {
      retriable: true,
      category: "transient",
      error_code: "TRANSIENT_NETWORK",
      reason: "Falha de rede ou erro desconhecido sem status HTTP. Tentativa será reprogramada.",
      http_status: null,
    };
  }

  // HTTP status taxonomy
  if (status === 401) {
    return {
      retriable: true,
      category: "auth",
      error_code: "AUTH_UNAUTHORIZED",
      reason: "Access token expirado ou inválido (HTTP 401). Tentativa será feita após refresh.",
      http_status: status,
    };
  }
  if (status === 403) {
    return {
      retriable: false,
      category: "permission",
      error_code: "PERMISSION_DENIED",
      reason: "Permissão negada pelo Google (HTTP 403). Verifique os escopos OAuth do usuário.",
      http_status: status,
    };
  }
  if (status === 404) {
    return {
      retriable: false,
      category: "not_found",
      error_code: "EVENT_NOT_FOUND",
      reason: "Evento não encontrado no Google Calendar (HTTP 404). Pode já ter sido removido.",
      http_status: status,
    };
  }
  if (status === 408) {
    return {
      retriable: true,
      category: "transient",
      error_code: "REQUEST_TIMEOUT",
      reason: "Timeout na requisição ao Google (HTTP 408). Tentativa será reprogramada.",
      http_status: status,
    };
  }
  if (status === 409) {
    return {
      retriable: false,
      category: "conflict",
      error_code: "CONFLICT",
      reason: "Conflito no Google Calendar (HTTP 409). Necessário reconciliar dados antes de retentar.",
      http_status: status,
    };
  }
  if (status === 422) {
    return {
      retriable: false,
      category: "validation",
      error_code: "VALIDATION_ERROR",
      reason: "Dados inválidos (HTTP 422). Corrija o booking antes de tentar novamente.",
      http_status: status,
    };
  }
  if (status === 429) {
    return {
      retriable: true,
      category: "quota",
      error_code: "RATE_LIMITED",
      reason: "Limite de requisições do Google atingido (HTTP 429). Tentativa será reprogramada com backoff.",
      http_status: status,
    };
  }
  if (status >= 500 && status < 600) {
    return {
      retriable: true,
      category: "transient",
      error_code: "SERVER_ERROR",
      reason: `Erro no servidor do Google (HTTP ${status}). Tentativa será reprogramada.`,
      http_status: status,
    };
  }
  if (status >= 400 && status < 500) {
    return {
      retriable: false,
      category: "client_error",
      error_code: "CLIENT_ERROR",
      reason: `Erro de cliente HTTP ${status} não retriável.`,
      http_status: status,
    };
  }
  return {
    retriable: true,
    category: "unknown",
    error_code: "UNKNOWN",
    reason: `Resposta HTTP inesperada (${status}). Será tratada como transitória.`,
    http_status: status,
  };
}

// Backwards-compatible thin wrapper
function isRetriable(status: number | null | undefined, errorMessage?: string): boolean {
  return classifyError(status, errorMessage ?? null).retriable;
}

// Build the standard `details` block for sync logs so audit fields are
// always present (`error_code`, `error_category`, `retriable`, `reason`).
function buildErrorDetails(
  classification: ClassifiedError,
  extra?: Record<string, unknown> | null,
): Record<string, unknown> {
  return {
    ...(extra ?? {}),
    error_code: classification.error_code,
    error_category: classification.category,
    retriable: classification.retriable,
    reason: classification.reason,
  };
}

// Exponential backoff: 1m, 5m, 15m, 1h, 3h, 6h
function nextRetryDelayMs(attempts: number): number {
  const ladder = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 3_600_000, 6 * 3_600_000];
  return ladder[Math.min(attempts, ladder.length - 1)];
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data;
}

async function getValidToken(
  supabaseAdmin: any,
  userId: string,
): Promise<{ accessToken: string; refreshed: boolean }> {
  const { data: tokenRow, error } = await supabaseAdmin
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) throw new Error("Google Calendar não conectado");

  const expiresAt = new Date(tokenRow.token_expires_at).getTime();
  if (Date.now() < expiresAt - 60000) {
    return { accessToken: tokenRow.access_token, refreshed: false };
  }

  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  await supabaseAdmin
    .from("google_calendar_tokens")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId);

  return { accessToken: refreshed.access_token, refreshed: true };
}

async function enqueueRetry(
  supabaseAdmin: any,
  args: {
    user_id: string;
    target_user_id: string;
    booking_id: string | null;
    action: string;
    payload: any;
    error_message: string;
    http_status: number | null;
  },
) {
  // Cancel any previous pending queue items for the same booking + action to avoid stale duplicates
  if (args.booking_id) {
    await supabaseAdmin
      .from("gcal_sync_queue")
      .update({ status: "cancelled" })
      .eq("booking_id", args.booking_id)
      .eq("action", args.action)
      .eq("status", "pending");
  }

  const next = new Date(Date.now() + nextRetryDelayMs(0)).toISOString();
  await supabaseAdmin.from("gcal_sync_queue").insert({
    user_id: args.user_id,
    target_user_id: args.target_user_id,
    booking_id: args.booking_id,
    action: args.action,
    payload: args.payload,
    last_error: sanitizeErrorMessage(args.error_message, 500),
    last_http_status: args.http_status,
    next_retry_at: next,
  });
}

// When a token is successfully refreshed, mark all this user's pending items as ready right now
async function reactivateQueueAfterTokenRefresh(supabaseAdmin: any, targetUserId: string) {
  await supabaseAdmin
    .from("gcal_sync_queue")
    .update({ next_retry_at: new Date().toISOString() })
    .eq("target_user_id", targetUserId)
    .eq("status", "pending");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let logCtx: {
    userId?: string;
    bookingId?: string | null;
    action?: string;
    timezone?: string | null;
    syncMode?: string | null;
  } = {};
  let supabaseAdminGlobal: any = null;
  let calendarUserIdGlobal: string | null = null;
  let bookingPayloadGlobal: any = null;

  async function logAttempt(success: boolean, opts: {
    error_message?: string | null;
    google_event_id?: string | null;
    http_status?: number | null;
    details?: Record<string, unknown> | null;
  } = {}) {
    try {
      const admin = supabaseAdminGlobal ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      if (logCtx.action === "status" && success) return;
      const mergedDetails =
        logCtx.syncMode != null
          ? { ...(opts.details ?? {}), gcal_sync_mode: logCtx.syncMode }
          : (opts.details ?? null);
      await admin.from("google_calendar_sync_logs").insert({
        user_id: logCtx.userId ?? null,
        booking_id: logCtx.bookingId ?? null,
        action: logCtx.action ?? "unknown",
        success,
        error_message: sanitizeErrorMessage(opts.error_message),
        google_event_id: opts.google_event_id ?? null,
        timezone: logCtx.timezone ?? null,
        http_status: opts.http_status ?? null,
        details: mergedDetails,
      });
    } catch (err) {
      console.error("Failed to write sync log:", err);
    }
  }

  async function maybeEnqueue(err: any, http_status: number | null) {
    try {
      if (!supabaseAdminGlobal || !calendarUserIdGlobal) return;
      if (!logCtx.action || !["create", "update", "delete"].includes(logCtx.action)) return;
      const message = err?.message ?? String(err);
      const classification = classifyError(http_status, message);
      if (!classification.retriable) return;
      await enqueueRetry(supabaseAdminGlobal, {
        user_id: logCtx.userId!,
        target_user_id: calendarUserIdGlobal,
        booking_id: logCtx.bookingId ?? null,
        action: logCtx.action,
        payload: bookingPayloadGlobal ?? {},
        error_message: message,
        http_status,
      });
    } catch (e) {
      console.error("Failed to enqueue retry:", e);
    }
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;
    logCtx.userId = userId;

    const { action, booking, target_user_id } = await req.json();
    logCtx.action = action;
    logCtx.bookingId = booking?.id ?? null;
    logCtx.timezone = booking?.fuso_horario ?? null;
    bookingPayloadGlobal = booking ?? null;

    // Per-booking sync mode: 'off' | 'push' | 'bidirectional'
    const syncMode: string = booking?.gcal_sync_mode ?? "push";
    logCtx.syncMode = syncMode;
    if (["create", "update", "delete"].includes(action) && syncMode === "off") {
      await logAttempt(true, {
        http_status: 200,
        details: { skipped: true, reason: "sync_disabled", gcal_sync_mode: syncMode },
      });
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "sync_disabled",
          gcal_sync_mode: syncMode,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Server-side timezone validation — block sync with a clear error before hitting Google
    if (["create", "update"].includes(action)) {
      const tz = booking?.fuso_horario;
      if (tz && !SUPPORTED_TIMEZONES.has(tz)) {
        const message = `Fuso horário "${tz}" não é suportado. Selecione um dos fusos oficiais do sistema antes de sincronizar com o Google Calendar.`;
        const classification: ClassifiedError = {
          retriable: false,
          category: "validation",
          error_code: "INVALID_TIMEZONE",
          reason: `Fuso horário "${tz}" não está na lista oficial suportada.`,
          http_status: 422,
        };
        await logAttempt(false, {
          error_message: message,
          http_status: 422,
          details: buildErrorDetails(classification, { value: tz }),
        });
        return new Response(
          JSON.stringify({ error: message, code: "INVALID_TIMEZONE", timezone: tz }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    supabaseAdminGlobal = supabaseAdmin;

    // Global automation flag — block create/update/delete when disabled.
    // 'status' actions (token introspection) are allowed because the user
    // may be diagnosing the integration even when sync is paused.
    if (["create", "update", "delete"].includes(action)) {
      const allowed = await isCalendarAutomationEnabled(supabaseAdmin);
      if (!allowed) {
        await logAttempt(true, {
          http_status: 200,
          details: { skipped: true, reason: "automation_disabled" },
        });
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: "automation_disabled",
            message: "Sincronização com Google Calendar está desativada nas Configurações.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const calendarUserId = target_user_id || userId;
    calendarUserIdGlobal = calendarUserId;

    const { accessToken, refreshed } = await getValidToken(supabaseAdmin, calendarUserId);

    // Token was successfully refreshed → wake up any pending retries for this user
    if (refreshed) {
      await reactivateQueueAfterTokenRefresh(supabaseAdmin, calendarUserId);
    }

    const { data: tokenRow } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("calendar_id")
      .eq("user_id", calendarUserId)
      .single();
    const calendarId = tokenRow?.calendar_id || "primary";

    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    if (action === "create") {
      const startDate = booking.data_evento;
      const startTime = booking.hora_inicio || "20:00";
      const endTime = booking.hora_fim || "23:00";
      const tz = booking.fuso_horario || "America/Sao_Paulo";

      const event = {
        summary: `🎧 ${booking.titulo}`,
        description: `Evento: ${booking.evento_nome || booking.titulo}\nVenue: ${booking.venue || "TBD"}\nDJ: ${booking.dj_name || "TBD"}`,
        location: booking.venue || "",
        start: { dateTime: `${startDate}T${startTime}:00`, timeZone: tz },
        end: { dateTime: `${startDate}T${endTime}:00`, timeZone: tz },
      };

      const res = await fetch(baseUrl, { method: "POST", headers, body: JSON.stringify(event) });
      const data = await res.json();
      if (!res.ok) {
        const classification = classifyError(res.status, JSON.stringify(data));
        await logAttempt(false, {
          error_message: `Google API error`,
          http_status: res.status,
          details: buildErrorDetails(classification, { google_response: data }),
        });
        await maybeEnqueue(new Error(`Google API error: ${JSON.stringify(data)}`), res.status);
        throw new Error(`Google API error: ${JSON.stringify(data)}`);
      }

      if (booking.id) {
        await supabaseAdmin
          .from("bookings")
          .update({ google_calendar_event_id: data.id })
          .eq("id", booking.id);
      }

      await logAttempt(true, { google_event_id: data.id, http_status: res.status });
      return new Response(JSON.stringify({ success: true, event_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update" && booking.google_calendar_event_id) {
      const eventId = booking.google_calendar_event_id;
      const startDate = booking.data_evento;
      const startTime = booking.hora_inicio || "20:00";
      const endTime = booking.hora_fim || "23:00";
      const tz = booking.fuso_horario || "America/Sao_Paulo";

      const event = {
        summary: `🎧 ${booking.titulo}`,
        description: `Evento: ${booking.evento_nome || booking.titulo}\nVenue: ${booking.venue || "TBD"}`,
        location: booking.venue || "",
        start: { dateTime: `${startDate}T${startTime}:00`, timeZone: tz },
        end: { dateTime: `${startDate}T${endTime}:00`, timeZone: tz },
      };

      const res = await fetch(`${baseUrl}/${eventId}`, { method: "PATCH", headers, body: JSON.stringify(event) });
      const data = await res.json();
      if (!res.ok) {
        const classification = classifyError(res.status, JSON.stringify(data));
        await logAttempt(false, {
          error_message: `Google API error`,
          http_status: res.status,
          google_event_id: eventId,
          details: buildErrorDetails(classification, { google_response: data }),
        });
        await maybeEnqueue(new Error(`Google API error: ${JSON.stringify(data)}`), res.status);
        throw new Error(`Google API error: ${JSON.stringify(data)}`);
      }

      await logAttempt(true, { google_event_id: eventId, http_status: res.status });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete" && booking.google_calendar_event_id) {
      const eventId = booking.google_calendar_event_id;
      const res = await fetch(`${baseUrl}/${eventId}`, { method: "DELETE", headers });
      if (!res.ok && res.status !== 404) {
        const data = await res.text();
        const classification = classifyError(res.status, data);
        await logAttempt(false, {
          error_message: data,
          http_status: res.status,
          google_event_id: eventId,
          details: buildErrorDetails(classification, { google_response_text: data?.slice?.(0, 500) ?? null }),
        });
        await maybeEnqueue(new Error(`Google API error: ${data}`), res.status);
        throw new Error(`Google API error: ${data}`);
      }

      if (booking.id) {
        await supabaseAdmin
          .from("bookings")
          .update({ google_calendar_event_id: null })
          .eq("id", booking.id);
      }

      await logAttempt(true, { google_event_id: eventId, http_status: res.status });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      return new Response(JSON.stringify({ connected: true, calendar_id: calendarId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("google-calendar-sync error:", err);
    const message = err?.message ?? String(err);
    const classification = classifyError(null, message);
    await logAttempt(false, {
      error_message: message,
      details: buildErrorDetails(classification, { stage: "outer_catch" }),
    });
    // Token / connectivity errors → enqueue (network, refresh failed, etc.)
    await maybeEnqueue(err, null);
    return new Response(JSON.stringify({ error: err.message, connected: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
