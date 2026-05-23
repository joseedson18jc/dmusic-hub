import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 25;

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

// ===== Sanitization (mirrors google-calendar-sync) =====
function sanitizeErrorMessage(input: unknown, maxLen = 300): string | null {
  if (input == null) return null;
  let msg = typeof input === "string" ? input : (() => {
    try { return JSON.stringify(input); } catch { return String(input); }
  })();
  if (!msg) return null;
  msg = msg.replace(/(?:Bearer|Basic)\s+[A-Za-z0-9._\-+/=]+/gi, "[REDACTED_TOKEN]");
  msg = msg.replace(/ya29\.[A-Za-z0-9._\-]+/g, "[REDACTED_GOOGLE_ACCESS_TOKEN]");
  msg = msg.replace(/1\/\/0[A-Za-z0-9._\-]+/g, "[REDACTED_GOOGLE_REFRESH_TOKEN]");
  msg = msg.replace(/eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, "[REDACTED_JWT]");
  msg = msg.replace(/\bsk_(?:live|test)_[A-Za-z0-9]+/g, "[REDACTED_STRIPE_KEY]");
  msg = msg.replace(/("?(?:access_token|refresh_token|id_token|client_secret|api[_-]?key|password|authorization)"?\s*[:=]\s*")[^"]+(")/gi, '$1[REDACTED]$2');
  msg = msg.replace(/\b(access_token|refresh_token|id_token|client_secret|api[_-]?key|password|authorization)=([^&\s"]+)/gi, "$1=[REDACTED]");
  msg = msg.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]");
  msg = msg.replace(/https?:\/\/([^\s/"]+)\/?[^\s"]*/gi, "https://$1/[…]");
  msg = msg.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IP]");
  msg = msg.replace(/\s+/g, " ").trim();
  if (msg.length > maxLen) msg = msg.slice(0, maxLen) + "…";
  return msg;
}

// ===== Error classification (kept in sync with google-calendar-sync) =====
type ErrorCategory =
  | "transient"
  | "auth"
  | "validation"
  | "not_found"
  | "permission"
  | "conflict"
  | "quota"
  | "client_error"
  | "unknown";

interface ClassifiedError {
  retriable: boolean;
  category: ErrorCategory;
  error_code: string;
  reason: string;
  http_status: number | null;
}

function classifyError(
  status: number | null | undefined,
  errorMessage?: string | null,
): ClassifiedError {
  const msg = (errorMessage ?? "").toString();
  const lower = msg.toLowerCase();

  if (/invalid_grant/i.test(msg)) {
    return { retriable: false, category: "auth", error_code: "AUTH_INVALID_GRANT",
      reason: "Refresh token revogado pelo Google. O usuário precisa reconectar a conta do Google Calendar.",
      http_status: status ?? null };
  }
  if (/token refresh failed/i.test(msg)) {
    return { retriable: true, category: "auth", error_code: "AUTH_REFRESH_FAILED",
      reason: "Falha ao renovar access token do Google. Nova tentativa será feita após backoff.",
      http_status: status ?? null };
  }
  if (/google calendar não conectado|google calendar nao conectado/i.test(lower)) {
    return { retriable: false, category: "auth", error_code: "AUTH_NOT_CONNECTED",
      reason: "Usuário não conectou o Google Calendar. Conecte a integração antes de sincronizar.",
      http_status: status ?? null };
  }
  if (/invalid_timezone/i.test(msg)) {
    return { retriable: false, category: "validation", error_code: "INVALID_TIMEZONE",
      reason: "Fuso horário não suportado. Selecione um dos fusos oficiais antes de sincronizar.",
      http_status: status ?? 422 };
  }
  if (/missing google_calendar_event_id/i.test(msg)) {
    return { retriable: false, category: "validation", error_code: "MISSING_EVENT_ID",
      reason: "Booking sem google_calendar_event_id para update. Recrie o evento ou cancele a fila.",
      http_status: status ?? null };
  }

  if (status == null) {
    return { retriable: true, category: "transient", error_code: "TRANSIENT_NETWORK",
      reason: "Falha de rede ou erro desconhecido sem status HTTP. Tentativa será reprogramada.",
      http_status: null };
  }
  if (status === 401) return { retriable: true, category: "auth", error_code: "AUTH_UNAUTHORIZED",
    reason: "Access token expirado ou inválido (HTTP 401).", http_status: status };
  if (status === 403) return { retriable: false, category: "permission", error_code: "PERMISSION_DENIED",
    reason: "Permissão negada pelo Google (HTTP 403).", http_status: status };
  if (status === 404) return { retriable: false, category: "not_found", error_code: "EVENT_NOT_FOUND",
    reason: "Evento não encontrado no Google Calendar (HTTP 404).", http_status: status };
  if (status === 408) return { retriable: true, category: "transient", error_code: "REQUEST_TIMEOUT",
    reason: "Timeout na requisição ao Google (HTTP 408).", http_status: status };
  if (status === 409) return { retriable: false, category: "conflict", error_code: "CONFLICT",
    reason: "Conflito no Google Calendar (HTTP 409).", http_status: status };
  if (status === 422) return { retriable: false, category: "validation", error_code: "VALIDATION_ERROR",
    reason: "Dados inválidos (HTTP 422).", http_status: status };
  if (status === 429) return { retriable: true, category: "quota", error_code: "RATE_LIMITED",
    reason: "Limite de requisições do Google atingido (HTTP 429).", http_status: status };
  if (status >= 500 && status < 600) return { retriable: true, category: "transient", error_code: "SERVER_ERROR",
    reason: `Erro no servidor do Google (HTTP ${status}).`, http_status: status };
  if (status >= 400 && status < 500) return { retriable: false, category: "client_error", error_code: "CLIENT_ERROR",
    reason: `Erro de cliente HTTP ${status} não retriável.`, http_status: status };
  return { retriable: true, category: "unknown", error_code: "UNKNOWN",
    reason: `Resposta HTTP inesperada (${status}). Tratada como transitória.`, http_status: status };
}

function isRetriable(status: number | null | undefined, errorMessage?: string): boolean {
  return classifyError(status, errorMessage ?? null).retriable;
}

function buildErrorDetails(c: ClassifiedError, extra?: Record<string, unknown> | null) {
  return {
    ...(extra ?? {}),
    error_code: c.error_code,
    error_category: c.category,
    retriable: c.retriable,
    reason: c.reason,
  };
}

function nextRetryDelayMs(attempts: number): number {
  // 1m, 5m, 15m, 1h, 3h, 6h
  const ladder = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 3_600_000, 6 * 3_600_000];
  return ladder[Math.min(attempts, ladder.length - 1)];
}

async function refreshAccessToken(refreshToken: string) {
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
  return data as { access_token: string; expires_in: number };
}

async function getValidToken(admin: any, userId: string): Promise<string> {
  const { data: tokenRow, error } = await admin
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !tokenRow) throw new Error("Google Calendar não conectado");

  const expiresAt = new Date(tokenRow.token_expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) return tokenRow.access_token;

  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  await admin
    .from("google_calendar_tokens")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId);
  return refreshed.access_token;
}

async function logAttempt(admin: any, item: any, success: boolean, opts: {
  error_message?: string | null;
  google_event_id?: string | null;
  http_status?: number | null;
  details?: Record<string, unknown> | null;
} = {}) {
  try {
    await admin.from("google_calendar_sync_logs").insert({
      user_id: item.user_id,
      booking_id: item.booking_id,
      action: `${item.action}_retry`,
      success,
      error_message: sanitizeErrorMessage(opts.error_message),
      google_event_id: opts.google_event_id ?? null,
      timezone: item.payload?.fuso_horario ?? null,
      http_status: opts.http_status ?? null,
      details: {
        ...(opts.details ?? {}),
        queue_id: item.id,
        attempt: item.attempts + 1,
        gcal_sync_mode: item.payload?.gcal_sync_mode ?? "push",
      },
    });
  } catch (e) {
    console.error("retry log failed", e);
  }
}

async function processItem(admin: any, item: any): Promise<{ ok: boolean; status: number | null; message?: string; eventId?: string | null }> {
  const booking = item.payload || {};

  // Honor per-booking sync mode — if disabled, do not retry against Google
  const syncMode: string = booking.gcal_sync_mode ?? "push";
  if (syncMode === "off") {
    return {
      ok: true,
      status: 200,
      message: "skipped: sync_disabled",
    };
  }

  // Hard-stop: invalid timezone is not retriable, mark immediately
  if (["create", "update"].includes(item.action)) {
    const tz = booking.fuso_horario;
    if (tz && !SUPPORTED_TIMEZONES.has(tz)) {
      return {
        ok: false,
        status: 422,
        message: `INVALID_TIMEZONE: "${tz}" não é suportado.`,
      };
    }
  }

  const accessToken = await getValidToken(admin, item.target_user_id);

  const { data: tokenRow } = await admin
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", item.target_user_id)
    .single();
  const calendarId = tokenRow?.calendar_id || "primary";
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const startDate = booking.data_evento;
  const startTime = booking.hora_inicio || "20:00";
  const endTime = booking.hora_fim || "23:00";
  const tz = booking.fuso_horario || "America/Sao_Paulo";

  if (item.action === "create") {
    const event = {
      summary: `🎧 ${booking.titulo}`,
      description: `Evento: ${booking.evento_nome || booking.titulo}\nVenue: ${booking.venue || "TBD"}\nDJ: ${booking.dj_name || "TBD"}`,
      location: booking.venue || "",
      start: { dateTime: `${startDate}T${startTime}:00`, timeZone: tz },
      end: { dateTime: `${startDate}T${endTime}:00`, timeZone: tz },
    };
    const res = await fetch(baseUrl, { method: "POST", headers, body: JSON.stringify(event) });
    const data = await res.json();
    if (!res.ok) return { ok: false, status: res.status, message: JSON.stringify(data) };
    if (item.booking_id) {
      await admin.from("bookings").update({ google_calendar_event_id: data.id }).eq("id", item.booking_id);
    }
    return { ok: true, status: res.status, eventId: data.id };
  }

  if (item.action === "update") {
    const eventId = booking.google_calendar_event_id;
    if (!eventId) return { ok: false, status: null, message: "missing google_calendar_event_id" };
    const event = {
      summary: `🎧 ${booking.titulo}`,
      description: `Evento: ${booking.evento_nome || booking.titulo}\nVenue: ${booking.venue || "TBD"}`,
      location: booking.venue || "",
      start: { dateTime: `${startDate}T${startTime}:00`, timeZone: tz },
      end: { dateTime: `${startDate}T${endTime}:00`, timeZone: tz },
    };
    const res = await fetch(`${baseUrl}/${eventId}`, { method: "PATCH", headers, body: JSON.stringify(event) });
    const data = await res.json();
    if (!res.ok) return { ok: false, status: res.status, message: JSON.stringify(data), eventId };
    return { ok: true, status: res.status, eventId };
  }

  if (item.action === "delete") {
    const eventId = booking.google_calendar_event_id;
    if (!eventId) return { ok: true, status: 204 }; // nothing to delete
    const res = await fetch(`${baseUrl}/${eventId}`, { method: "DELETE", headers });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      return { ok: false, status: res.status, message: text, eventId };
    }
    if (item.booking_id) {
      await admin.from("bookings").update({ google_calendar_event_id: null }).eq("id", item.booking_id);
    }
    return { ok: true, status: res.status, eventId };
  }

  return { ok: false, status: null, message: `Unknown action: ${item.action}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Pull a batch of due items
  const { data: items, error } = await admin
    .from("gcal_sync_queue")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("queue fetch error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!items || items.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const item of items) {
    // Lock item
    const { data: locked } = await admin
      .from("gcal_sync_queue")
      .update({ status: "processing", last_attempt_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "pending")
      .select()
      .single();
    if (!locked) continue;

    try {
      const result = await processItem(admin, item);
      const newAttempts = item.attempts + 1;

      if (result.ok) {
        await admin
          .from("gcal_sync_queue")
          .update({
            status: "done",
            attempts: newAttempts,
            completed_at: new Date().toISOString(),
            last_http_status: result.status,
            last_error: null,
          })
          .eq("id", item.id);
        await logAttempt(admin, item, true, {
          google_event_id: result.eventId ?? null,
          http_status: result.status,
          details: { resolved: true },
        });
        results.push({ id: item.id, status: "done" });
      } else {
        const classification = classifyError(result.status, result.message);
        const retriable = classification.retriable;
        const exhausted = newAttempts >= item.max_attempts;
        if (!retriable || exhausted) {
          await admin
            .from("gcal_sync_queue")
            .update({
              status: "failed",
              attempts: newAttempts,
              last_http_status: result.status,
              last_error: sanitizeErrorMessage(result.message, 500),
            })
            .eq("id", item.id);
          await logAttempt(admin, item, false, {
            error_message: result.message ?? "non-retriable",
            http_status: result.status,
            google_event_id: result.eventId ?? null,
            details: buildErrorDetails(classification, {
              terminal: true,
              exhausted,
              attempts: newAttempts,
              max_attempts: item.max_attempts,
            }),
          });
          results.push({ id: item.id, status: "failed" });
        } else {
          const next = new Date(Date.now() + nextRetryDelayMs(newAttempts)).toISOString();
          await admin
            .from("gcal_sync_queue")
            .update({
              status: "pending",
              attempts: newAttempts,
              next_retry_at: next,
              last_http_status: result.status,
              last_error: sanitizeErrorMessage(result.message, 500),
            })
            .eq("id", item.id);
          await logAttempt(admin, item, false, {
            error_message: result.message ?? "retry scheduled",
            http_status: result.status,
            details: buildErrorDetails(classification, {
              next_retry_at: next,
              attempts: newAttempts,
              max_attempts: item.max_attempts,
            }),
          });
          results.push({ id: item.id, status: "rescheduled", next });
        }
      }
    } catch (err: any) {
      const message = err?.message ?? String(err);
      const newAttempts = item.attempts + 1;
      const exhausted = newAttempts >= item.max_attempts;
      const classification = classifyError(null, message);
      const retriable = classification.retriable;

      if (!retriable || exhausted) {
          await admin
            .from("gcal_sync_queue")
            .update({
              status: "failed",
              attempts: newAttempts,
              last_error: sanitizeErrorMessage(message, 500),
            })
          .eq("id", item.id);
        await logAttempt(admin, item, false, {
          error_message: message,
          details: buildErrorDetails(classification, {
            terminal: true,
            exhausted,
            attempts: newAttempts,
            max_attempts: item.max_attempts,
            stage: "processor_exception",
          }),
        });
        results.push({ id: item.id, status: "failed", error: message });
      } else {
        const next = new Date(Date.now() + nextRetryDelayMs(newAttempts)).toISOString();
        await admin
          .from("gcal_sync_queue")
          .update({
            status: "pending",
            attempts: newAttempts,
            next_retry_at: next,
            last_error: sanitizeErrorMessage(message, 500),
          })
          .eq("id", item.id);
        await logAttempt(admin, item, false, {
          error_message: message,
          details: buildErrorDetails(classification, {
            next_retry_at: next,
            attempts: newAttempts,
            max_attempts: item.max_attempts,
            stage: "processor_exception",
          }),
        });
        results.push({ id: item.id, status: "rescheduled", next });
      }
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
