import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const { action, token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar registro de assinatura pelo token
    const { data: sig, error: sigErr } = await supabase
      .from("contract_signatures")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (sigErr || !sig) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(sig.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link de assinatura expirado" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar contrato
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, template_name, status, html_content, form_data, version")
      .eq("id", sig.contract_id)
      .maybeSingle();

    if (!contract) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "view") {
      // Registrar primeira visualização (apenas uma vez por signatura)
      try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
        const ua = req.headers.get("user-agent") || null;

        // Só loga "visualizado" se ainda não foi assinado e não há registro prévio de visualização
        if (!sig.signed_at) {
          const { data: alreadyViewed } = await supabase
            .from("contract_history")
            .select("id")
            .eq("contract_id", contract.id)
            .eq("action", "visualizado")
            .contains("details", { token_prefix: token.slice(0, 8) })
            .maybeSingle();

          if (!alreadyViewed) {
            await supabase.from("contract_history").insert({
              contract_id: contract.id,
              action: "visualizado",
              details: {
                token_prefix: token.slice(0, 8),
                ip,
                user_agent: ua,
                viewed_at: new Date().toISOString(),
              },
            });
          }
        }
      } catch (logErr) {
        // Auditoria nunca deve bloquear a visualização
        console.error("Falha ao registrar visualização:", logErr);
      }

      return new Response(JSON.stringify({
        contract: {
          id: contract.id,
          template_name: contract.template_name,
          status: contract.status,
          html_content: contract.html_content,
          form_data: contract.form_data,
          version: contract.version,
        },
        already_signed: !!sig.signed_at,
        signed_at: sig.signed_at,
        signer_name: sig.signer_name,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "sign") {
      if (sig.signed_at) {
        return new Response(JSON.stringify({ error: "Contrato já assinado" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { signer_name, signer_email, signature_data } = body;
      if (!signer_name || !signature_data) {
        return new Response(JSON.stringify({ error: "Nome e assinatura são obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      const ua = req.headers.get("user-agent") || null;
      const now = new Date().toISOString();

      const { error: upSigErr } = await supabase
        .from("contract_signatures")
        .update({
          signer_name,
          signer_email: signer_email || null,
          signature_data,
          ip_address: ip,
          user_agent: ua,
          signed_at: now,
        })
        .eq("id", sig.id);

      if (upSigErr) {
        await supabase.from("contract_history").insert({
          contract_id: sig.contract_id,
          action: "assinatura_falhou",
          old_status: contract.status,
          details: {
            stage: "update_signature",
            signer_name,
            signer_email: signer_email || null,
            ip,
            user_agent: ua,
            error: { message: upSigErr.message, code: (upSigErr as any).code || null },
            ts: now,
          },
        });
        throw upSigErr;
      }

      const { error: upContractErr } = await supabase
        .from("contracts")
        .update({ status: "assinado" })
        .eq("id", sig.contract_id);

      if (upContractErr) {
        await supabase.from("contract_history").insert({
          contract_id: sig.contract_id,
          action: "assinatura_falhou",
          old_status: contract.status,
          details: {
            stage: "update_contract_status",
            signer_name,
            ip,
            user_agent: ua,
            error: { message: upContractErr.message, code: (upContractErr as any).code || null },
            ts: now,
          },
        });
        throw upContractErr;
      }

      // Registrar no histórico
      await supabase.from("contract_history").insert({
        contract_id: sig.contract_id,
        action: "assinado",
        old_status: contract.status,
        new_status: "assinado",
        details: {
          signer_name,
          signer_email,
          ip,
          user_agent: ua,
          token_prefix: token.slice(0, 8),
          signed_at: now,
        },
      });

      // Notificar o DJ vinculado via WhatsApp (respeitando flag global de automação)
      try {
        const { data: contractFull } = await supabase
          .from("contracts")
          .select("id, template_name, dj_id, producer_id, booking_id")
          .eq("id", sig.contract_id)
          .maybeSingle();

        if (contractFull?.dj_id) {
          const { data: dj } = await supabase
            .from("djs")
            .select("id, nome_artistico, whatsapp, whatsapp_opt_in")
            .eq("id", contractFull.dj_id)
            .maybeSingle();

          // Verifica flag global antes de enfileirar
          const { data: automationEnabled } = await supabase.rpc(
            "is_automation_enabled",
            { _channel: "whatsapp_on_confirm" },
          );

          let eventName: string | null = null;
          if (contractFull.booking_id) {
            const { data: booking } = await supabase
              .from("bookings")
              .select("evento_nome, titulo")
              .eq("id", contractFull.booking_id)
              .maybeSingle();
            eventName = booking?.evento_nome || booking?.titulo || null;
          }

          const canSendWhatsapp =
            automationEnabled !== false &&
            dj?.whatsapp &&
            dj?.whatsapp_opt_in === true;

          if (canSendWhatsapp) {
            const { error: queueErr } = await supabase.from("whatsapp_queue").insert({
              template_id: "contract-signed-dj",
              recipient_phone: dj.whatsapp,
              recipient_name: dj.nome_artistico,
              variables: {
                dj_name: dj.nome_artistico,
                signer_name,
                contract_name: contract.template_name,
                event_name: eventName || contract.template_name,
              },
              entity_type: "contract",
              entity_id: sig.contract_id,
              dj_id: dj.id,
              producer_id: contractFull.producer_id,
              booking_id: contractFull.booking_id,
              status: "pending",
              max_attempts: 5,
              scheduled_for: new Date().toISOString(),
            });
            if (queueErr) console.error("Falha ao enfileirar WhatsApp:", queueErr);
          }

          // Registrar evento de notificação no histórico do contrato (sempre, mesmo sem WhatsApp)
          await supabase.from("contract_history").insert({
            contract_id: sig.contract_id,
            action: "dj_notificado",
            details: {
              dj_id: dj?.id,
              dj_name: dj?.nome_artistico,
              channels: {
                in_app: true, // já garantido pelo trigger DB
                whatsapp: !!canSendWhatsapp,
                whatsapp_skipped_reason: canSendWhatsapp
                  ? null
                  : automationEnabled === false
                    ? "automation_disabled"
                    : !dj?.whatsapp
                      ? "no_phone"
                      : !dj?.whatsapp_opt_in
                        ? "opt_out"
                        : "unknown",
              },
              notified_at: new Date().toISOString(),
            },
          });
        }
      } catch (notifyErr) {
        // Notificação nunca deve bloquear a assinatura
        console.error("Falha ao notificar DJ pós-assinatura:", notifyErr);
      }

      return new Response(JSON.stringify({ success: true, signed_at: now }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
