import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

/**
 * Defense-in-depth: even if the frontend forgets to gate, this server-side
 * check refuses to send/enqueue WhatsApp when the global automation flag
 * is disabled. The flag lives in `system_settings.automation_rules`.
 * Defaults to `true` if the row is missing.
 */
async function isWhatsappAutomationEnabled(admin: ReturnType<typeof createClient>): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("is_automation_enabled", { _channel: "whatsapp_on_confirm" });
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

const TEMPLATE_BODIES: Record<string, string> = {
  "new-event-dj": "Olá {{dj_name}}! Novo evento confirmado: {{event_name}} em {{date}} no {{venue}}.",
  "new-event-producer": "Olá {{producer_name}}! Confirmado o evento {{event_name}} com {{dj_name}} em {{date}}.",
  "payment-reminder": "Olá {{name}}, lembrete: pagamento de R$ {{amount}} vence em {{due_date}}.",
  "contract-pending": "Olá {{name}}, seu contrato do evento {{event_name}} aguarda assinatura: {{contract_link}}",
  "schedule-change": "Olá {{name}}, o horário do evento {{event_name}} mudou de {{old_time}} para {{new_time}}.",
  "cancellation": "Olá {{name}}, o evento {{event_name}} foi cancelado. Motivo: {{reason}}.",
  "repasse-liberado": "Olá {{dj_name}}, repasse de R$ {{amount}} do evento {{event_name}} liberado.",
  "task-critical": "Olá {{assignee}}, tarefa crítica: {{task_title}} (prazo: {{deadline}}).",
  "booking-reminder": "Olá {{name}}, lembrete: o evento {{event_name}} acontece em {{date}} às {{time}} no {{venue}}.",
  "contract-signed-dj": "Olá {{dj_name}}! Boas notícias: o produtor {{signer_name}} acabou de assinar o contrato \"{{contract_name}}\" do evento {{event_name}}. Acesse o sistema para conferir.",
};

function renderTemplate(template_id: string, variables: Record<string, unknown> = {}) {
  let body = TEMPLATE_BODIES[template_id] || `Template: ${template_id}`;
  for (const [k, v] of Object.entries(variables || {})) {
    body = body.replaceAll(`{{${k}}}`, String(v ?? ""));
  }
  return `[D.MUSIC]\n${body}`;
}

const RETRY_DELAYS_MIN = [1, 5, 15, 60, 360];
function nextRetryAt(attempt: number): string {
  const m = RETRY_DELAYS_MIN[Math.min(attempt, RETRY_DELAYS_MIN.length - 1)];
  return new Date(Date.now() + m * 60_000).toISOString();
}

async function callTwilio(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: toFormatted, From: TWILIO_WHATSAPP_FROM!, Body: body }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as any));
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---- Service-role action (cron): process queue ----
    if (body.action === "process_queue") {
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
        return new Response(JSON.stringify({ processed: 0, skipped: "twilio_not_configured" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const limit = Math.min(Number(body.limit) || 10, 50);
      const { data: items } = await supabaseAdmin
        .from("whatsapp_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(limit);

      let processed = 0, sent = 0, failed = 0, skipped = 0;
      for (const item of items || []) {
        const attempts = (item.attempts || 0) + 1;
        // Atomic claim: only proceed if this worker successfully transitions
        // pending -> processing. A concurrent worker that already claimed
        // the row gets 0 rows back and we skip — prevents double-sends.
        const { data: claimed } = await supabaseAdmin.from("whatsapp_queue")
          .update({ status: "processing", attempts })
          .eq("id", item.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();
        if (!claimed) { skipped++; continue; }
        processed++;

        const message = renderTemplate(item.template_id, item.variables || {});
        const result = await callTwilio(item.recipient_phone, message);

        const { data: logged } = await supabaseAdmin.from("whatsapp_messages").insert({
          template_id: item.template_id,
          recipient_phone: item.recipient_phone,
          recipient_name: item.recipient_name,
          variables: item.variables || {},
          status: result.ok ? "delivered" : "failed",
          error_message: result.ok ? null : (result.data?.message || `HTTP ${result.status}`),
          twilio_sid: result.data?.sid || null,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          producer_id: item.producer_id,
          dj_id: item.dj_id,
          booking_id: item.booking_id,
          sent_by: item.created_by,
        }).select("id").single();

        if (result.ok) {
          sent++;
          await supabaseAdmin.from("whatsapp_queue").update({
            status: "sent", last_error: null, message_id: logged?.id || null,
          }).eq("id", item.id);
        } else {
          failed++;
          const isFinal = attempts >= (item.max_attempts || 5);
          await supabaseAdmin.from("whatsapp_queue").update({
            status: isFinal ? "failed" : "pending",
            last_error: result.data?.message || `HTTP ${result.status}`,
            next_retry_at: isFinal ? null : nextRetryAt(attempts),
            scheduled_for: isFinal ? item.scheduled_for : nextRetryAt(attempts),
            message_id: logged?.id || null,
          }).eq("id", item.id);
        }
      }
      return new Response(JSON.stringify({ processed, sent, failed, skipped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Authenticated actions ----
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

    if (body.action === "status") {
      const configured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM);
      const { count: totalCount } = await supabaseAdmin.from("whatsapp_messages").select("*", { count: "exact", head: true });
      const { count: deliveredCount } = await supabaseAdmin.from("whatsapp_messages").select("*", { count: "exact", head: true }).eq("status", "delivered");
      const { count: failedCount } = await supabaseAdmin.from("whatsapp_messages").select("*", { count: "exact", head: true }).eq("status", "failed");
      const { count: queuedCount } = await supabaseAdmin.from("whatsapp_queue").select("*", { count: "exact", head: true }).eq("status", "pending");
      return new Response(JSON.stringify({
        configured,
        stats: {
          total: totalCount || 0,
          delivered: deliveredCount || 0,
          failed: failedCount || 0,
          queued: queuedCount || 0,
          rate: totalCount ? Math.round(((deliveredCount || 0) / totalCount) * 100) : 0,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "enqueue") {
      const { template_id, to, variables, recipient_name, entity_type, entity_id,
              producer_id, dj_id, booking_id, scheduled_for, max_attempts } = body;
      if (!to || !template_id) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios: to, template_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await isWhatsappAutomationEnabled(supabaseAdmin))) {
        return new Response(JSON.stringify({
          success: false,
          skipped: true,
          reason: "automation_disabled",
          message: "Automação de WhatsApp está desativada nas Configurações.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await supabaseAdmin.from("whatsapp_queue").insert({
        template_id,
        recipient_phone: to,
        recipient_name: recipient_name || null,
        variables: variables || {},
        producer_id: producer_id || null,
        dj_id: dj_id || null,
        booking_id: booking_id || null,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        scheduled_for: scheduled_for || new Date().toISOString(),
        max_attempts: Math.max(1, Math.min(10, Number(max_attempts) || 5)),
        created_by: userId,
      }).select("id").single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, queue_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "queue") {
      const { data } = await supabaseAdmin.from("whatsapp_queue")
        .select("*").order("scheduled_for", { ascending: true }).limit(100);
      return new Response(JSON.stringify({ queue: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "cancel") {
      if (!body.id) {
        return new Response(JSON.stringify({ error: "id é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabaseAdmin.from("whatsapp_queue")
        .update({ status: "cancelled" }).eq("id", body.id).in("status", ["pending"]);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "history_by_producer") {
      if (!body.producer_id) {
        return new Response(JSON.stringify({ error: "producer_id é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await supabaseAdmin.from("whatsapp_messages")
        .select("*").eq("producer_id", body.producer_id)
        .order("created_at", { ascending: false }).limit(100);
      return new Response(JSON.stringify({ messages: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "send") {
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
        return new Response(JSON.stringify({ error: "Twilio WhatsApp não configurado. Adicione TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { template_id, to, variables, recipient_name, entity_type, entity_id,
              producer_id, dj_id, booking_id } = body;
      if (!to || !template_id) {
        return new Response(JSON.stringify({ error: "Campos obrigatórios: to, template_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await isWhatsappAutomationEnabled(supabaseAdmin))) {
        return new Response(JSON.stringify({
          success: false,
          skipped: true,
          reason: "automation_disabled",
          message: "Automação de WhatsApp está desativada nas Configurações.",
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const messageBody = renderTemplate(template_id, variables || {});
      const result = await callTwilio(to, messageBody);

      await supabaseAdmin.from("whatsapp_messages").insert({
        template_id,
        recipient_phone: to,
        recipient_name: recipient_name || null,
        variables: variables || {},
        status: result.ok ? "delivered" : "failed",
        error_message: result.ok ? null : (result.data?.message || "Unknown error"),
        twilio_sid: result.data?.sid || null,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        producer_id: producer_id || null,
        dj_id: dj_id || null,
        booking_id: booking_id || null,
        sent_by: userId,
      });

      if (!result.ok) {
        return new Response(JSON.stringify({ error: result.data?.message || "Falha ao enviar" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, sid: result.data?.sid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "messages") {
      const { data: messages } = await supabaseAdmin.from("whatsapp_messages")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return new Response(JSON.stringify({ messages: messages || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-whatsapp error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
