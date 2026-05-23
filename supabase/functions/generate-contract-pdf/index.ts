import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATES: Record<string, (data: any) => string> = {
  "booking-standard": (d) => `
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
      .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { font-size: 24px; margin: 0; color: #f97316; }
      .header p { font-size: 12px; color: #666; margin: 5px 0 0; }
      .section { margin-bottom: 25px; }
      .section h2 { font-size: 16px; color: #f97316; border-bottom: 1px solid #eee; padding-bottom: 5px; }
      .field { display: flex; margin-bottom: 8px; }
      .field-label { font-weight: 600; width: 200px; color: #555; }
      .field-value { flex: 1; }
      .clause { margin-bottom: 15px; }
      .clause h3 { font-size: 13px; font-weight: 600; margin-bottom: 5px; }
      .clause p { font-size: 12px; color: #444; }
      .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
      .sig-block { text-align: center; width: 45%; }
      .sig-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 8px; font-size: 12px; }
      .footer { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; }
    </style></head>
    <body>
      <div class="header">
        <h1>D.MUSIC MANAGER</h1>
        <p>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS</p>
      </div>

      <div class="section">
        <h2>1. PARTES</h2>
        <div class="field"><span class="field-label">Contratante (Produtor):</span><span class="field-value">${d.produtor || '_______________'}</span></div>
        <div class="field"><span class="field-label">Contratado (DJ):</span><span class="field-value">${d.dj || '_______________'}</span></div>
      </div>

      <div class="section">
        <h2>2. OBJETO</h2>
        <p style="font-size: 13px;">Prestação de serviços artísticos de discotecagem no evento descrito abaixo.</p>
      </div>

      <div class="section">
        <h2>3. EVENTO</h2>
        <div class="field"><span class="field-label">Nome do Evento:</span><span class="field-value">${d.evento || '_______________'}</span></div>
        <div class="field"><span class="field-label">Data:</span><span class="field-value">${d.data || '_______________'}</span></div>
        <div class="field"><span class="field-label">Horário:</span><span class="field-value">${d.horario || '_______________'}</span></div>
        <div class="field"><span class="field-label">Local:</span><span class="field-value">${d.local || '_______________'}</span></div>
        <div class="field"><span class="field-label">Cidade:</span><span class="field-value">${d.cidade || '_______________'}</span></div>
      </div>

      <div class="section">
        <h2>4. CONDIÇÕES FINANCEIRAS</h2>
        <div class="field"><span class="field-label">Cachê Acordado:</span><span class="field-value">R$ ${d.cache || '_______________'}</span></div>
        <div class="field"><span class="field-label">Forma de Pagamento:</span><span class="field-value">${d.pagamento || '_______________'}</span></div>
        <div class="field"><span class="field-label">Sinal (50%):</span><span class="field-value">R$ ${d.cache ? (Number(d.cache) / 2).toFixed(2) : '_______________'}</span></div>
      </div>

      <div class="section">
        <h2>5. CLÁUSULAS</h2>
        <div class="clause">
          <h3>5.1 Cancelamento</h3>
          <p>Em caso de cancelamento pelo CONTRATANTE com menos de 15 dias de antecedência, será devido o valor integral do cachê. Cancelamentos com mais de 15 dias terão reembolso de 50% do sinal pago.</p>
        </div>
        <div class="clause">
          <h3>5.2 Rider Técnico</h3>
          <p>O CONTRATANTE se compromete a fornecer a estrutura técnica conforme rider técnico anexo a este contrato.</p>
        </div>
        <div class="clause">
          <h3>5.3 Logística</h3>
          <p>Transporte e hospedagem, quando aplicáveis, são de responsabilidade do CONTRATANTE.</p>
        </div>
        ${d.observacoes ? `<div class="clause"><h3>5.4 Observações</h3><p>${d.observacoes}</p></div>` : ''}
      </div>

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line">${d.produtor || 'CONTRATANTE'}<br/>CPF/CNPJ: _______________</div>
        </div>
        <div class="sig-block">
          <div class="sig-line">${d.dj || 'CONTRATADO'}<br/>CPF/CNPJ: _______________</div>
        </div>
      </div>

      <div class="footer">
        <p>Documento gerado por D.MUSIC Manager em ${new Date().toLocaleDateString('pt-BR')}</p>
        <p>Este contrato possui validade jurídica após assinatura de ambas as partes.</p>
      </div>
    </body>
    </html>
  `,

  "proposta-comercial": (d) => `
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
      .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { font-size: 24px; margin: 0; color: #f97316; }
      .header p { font-size: 14px; color: #666; margin: 5px 0 0; }
      .section { margin-bottom: 25px; }
      .section h2 { font-size: 16px; color: #f97316; border-bottom: 1px solid #eee; padding-bottom: 5px; }
      .highlight { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 15px 0; }
      .price { font-size: 28px; font-weight: bold; color: #f97316; }
      .footer { text-align: center; font-size: 10px; color: #999; margin-top: 40px; }
    </style></head>
    <body>
      <div class="header">
        <h1>D.MUSIC MANAGER</h1>
        <p>PROPOSTA COMERCIAL</p>
      </div>
      <div class="section">
        <h2>Para</h2>
        <p><strong>${d.produtor || '_______________'}</strong></p>
      </div>
      <div class="section">
        <h2>Artista</h2>
        <p><strong>${d.dj || '_______________'}</strong></p>
      </div>
      <div class="section">
        <h2>Evento</h2>
        <p>${d.evento || '_______________'} — ${d.data || '_______________'}</p>
      </div>
      <div class="highlight">
        <p style="margin: 0 0 5px; color: #666; font-size: 12px;">CACHÊ PROPOSTO</p>
        <p class="price">R$ ${d.cache || '_______________'}</p>
        <p style="margin: 5px 0 0; font-size: 12px; color: #666;">Forma de pagamento: ${d.pagamento || '_______________'}</p>
      </div>
      ${d.observacoes ? `<div class="section"><h2>Condições Especiais</h2><p>${d.observacoes}</p></div>` : ''}
      <div class="section">
        <h2>Validade</h2>
        <p>Esta proposta é válida por 7 dias a partir da data de emissão.</p>
      </div>
      <div class="footer">
        <p>Proposta gerada por D.MUSIC Manager em ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    </body>
    </html>
  `,

  "recibo": (d) => `
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
      .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { font-size: 24px; margin: 0; color: #f97316; }
      .section { margin-bottom: 25px; }
      .amount { font-size: 32px; font-weight: bold; color: #16a34a; text-align: center; margin: 20px 0; }
      .sig-line { border-top: 1px solid #333; margin-top: 80px; padding-top: 8px; font-size: 12px; text-align: center; max-width: 300px; margin-left: auto; margin-right: auto; }
    </style></head>
    <body>
      <div class="header">
        <h1>RECIBO DE PAGAMENTO</h1>
      </div>
      <p>Recebi de <strong>${d.produtor || '_______________'}</strong> a importância de:</p>
      <p class="amount">R$ ${d.cache || '_______________'}</p>
      <p>Referente a: ${d.evento || '_______________'}</p>
      <p>Data: ${d.data || new Date().toLocaleDateString('pt-BR')}</p>
      <p>Forma de pagamento: ${d.pagamento || '_______________'}</p>
      ${d.observacoes ? `<p>Observações: ${d.observacoes}</p>` : ''}
      <div class="sig-line">${d.dj || 'RECEBEDOR'}<br/>CPF: _______________</div>
    </body>
    </html>
  `,
};

// Fallback for templates without specific HTML
const defaultTemplate = (d: any, templateName: string) => `
  <html>
  <head><meta charset="utf-8"><style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
    .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 24px; margin: 0; color: #f97316; }
    .field { margin-bottom: 10px; }
    .field-label { font-weight: 600; color: #555; }
  </style></head>
  <body>
    <div class="header"><h1>D.MUSIC MANAGER</h1><p>${templateName.toUpperCase()}</p></div>
    ${Object.entries(d).filter(([_, v]) => v).map(([k, v]) => `<div class="field"><span class="field-label">${k}:</span> ${v}</div>`).join('')}
    <p style="margin-top: 40px; font-size: 10px; color: #999;">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  </body>
  </html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_id, template_name, data, html_template, save_to_storage, contract_id } = await req.json();

    if (!template_id || !data) {
      return new Response(
        JSON.stringify({ error: "template_id and data are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let html: string;
    if (typeof html_template === "string" && html_template.trim().length > 0) {
      // Custom user-defined template with {{var}} interpolation
      const escapeHtml = (s: string) =>
        String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const body = html_template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
        const v = data[key];
        return v === undefined || v === null ? "" : escapeHtml(v);
      });
      html = `<html><head><meta charset="utf-8"><style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.6; }
        h1,h2,h3 { color: #f97316; }
        .footer { text-align:center; font-size:10px; color:#999; margin-top:40px; border-top:1px solid #eee; padding-top:15px; }
      </style></head><body>${body}
      <div class="footer">Gerado por D.Music Manager em ${new Date().toLocaleDateString("pt-BR")}</div>
      </body></html>`;
    } else {
      const templateFn = TEMPLATES[template_id];
      html = templateFn ? templateFn(data) : defaultTemplate(data, template_name || template_id);
    }

    let file_url: string | null = null;
    let file_path: string | null = null;

    if (save_to_storage) {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const safeName = String(template_name || template_id).replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const path = `${contract_id || "draft"}/${safeName}_${ts}.html`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("contracts")
          .upload(path, new Blob([html], { type: "text/html" }), {
            contentType: "text/html",
            upsert: true,
          });
        if (upErr) throw upErr;
        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from("contracts")
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
        if (signErr) throw signErr;
        file_url = signed?.signedUrl ?? null;
        file_path = path;
      } catch (e) {
        console.error("storage upload failed", e);
      }
    }

    return new Response(
      JSON.stringify({ html, template_id, file_url, file_path }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
