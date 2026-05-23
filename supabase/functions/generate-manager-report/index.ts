import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    // Check admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) throw new Error('Admin access required');

    // Fetch data
    const [bookingsRes, djsRes, financialRes, tasksRes, contractsRes] = await Promise.all([
      supabase.from('bookings').select('*, djs:dj_id(nome_artistico), producers:producer_id(nome)'),
      supabase.from('djs').select('nome_artistico, status, valor_cache_padrao'),
      supabase.from('financial_records').select('tipo, status, valor_bruto, data_vencimento, descricao'),
      supabase.from('tasks').select('titulo, status, prioridade, prazo'),
      supabase.from('contracts').select('template_name, status'),
    ]);

    const bookings = bookingsRes.data || [];
    const djs = djsRes.data || [];
    const financial = financialRes.data || [];
    const tasks = tasksRes.data || [];
    const contracts = contractsRes.data || [];

    const revenueTypes = ['receita', 'sinal', 'pagamento_final', 'parcela'];
    const expenseTypes = ['despesa', 'repasse_dj', 'repasse_produtor', 'comissao', 'imposto'];

    const totalRevenue = financial
      .filter(f => revenueTypes.includes(f.tipo) && f.status === 'pago')
      .reduce((s, f) => s + Number(f.valor_bruto), 0);
    const totalExpenses = financial
      .filter(f => expenseTypes.includes(f.tipo) && f.status === 'pago')
      .reduce((s, f) => s + Number(f.valor_bruto), 0);
    
    const activeBookings = bookings.filter(b =>
      ['confirmado', 'planejamento', 'pronto_para_evento', 'sinal_pendente', 'contrato_enviado', 'assinatura_pendente'].includes(b.status)
    ).length;
    const pendingTasks = tasks.filter(t => ['a_fazer', 'em_andamento', 'atrasada'].includes(t.status)).length;
    const overduePayments = financial.filter(f => f.status === 'vencido');

    const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Build HTML report
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Relatório Portal Manager</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a2e; background: white; }
  h1 { color: #16213e; border-bottom: 3px solid #e94560; padding-bottom: 10px; }
  h2 { color: #16213e; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
  .kpi { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; text-align: center; }
  .kpi-value { font-size: 24px; font-weight: bold; color: #16213e; }
  .kpi-label { font-size: 12px; color: #6c757d; text-transform: uppercase; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th { background: #16213e; color: white; text-align: left; padding: 10px 12px; font-size: 13px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e9ecef; font-size: 13px; }
  tr:nth-child(even) { background: #f8f9fa; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge-success { background: #d4edda; color: #155724; }
  .badge-warning { background: #fff3cd; color: #856404; }
  .badge-danger { background: #f8d7da; color: #721c24; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; color: #6c757d; font-size: 11px; }
  .profit { color: ${totalRevenue - totalExpenses >= 0 ? '#28a745' : '#dc3545'}; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>📊 Relatório Portal Manager — D.MUSIC</h1>
<p style="color: #6c757d;">Gerado em ${dateStr}</p>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-value" style="color:#28a745">${fmtBRL(totalRevenue)}</div><div class="kpi-label">Receita Total</div></div>
  <div class="kpi"><div class="kpi-value" style="color:#dc3545">${fmtBRL(totalExpenses)}</div><div class="kpi-label">Despesas</div></div>
  <div class="kpi"><div class="kpi-value profit">${fmtBRL(totalRevenue - totalExpenses)}</div><div class="kpi-label">Lucro Líquido</div></div>
  <div class="kpi"><div class="kpi-value">${activeBookings}</div><div class="kpi-label">Bookings Ativos</div></div>
  <div class="kpi"><div class="kpi-value">${pendingTasks}</div><div class="kpi-label">Tarefas Pendentes</div></div>
  <div class="kpi"><div class="kpi-value" style="color:#dc3545">${overduePayments.length}</div><div class="kpi-label">Pagamentos Vencidos</div></div>
</div>

<h2>🎵 DJs</h2>
<table>
  <tr><th>Nome Artístico</th><th>Status</th><th>Cache Padrão</th></tr>
  ${djs.map(dj => `<tr>
    <td>${dj.nome_artistico}</td>
    <td><span class="badge ${dj.status === 'ativo' ? 'badge-success' : dj.status === 'pausa' ? 'badge-warning' : 'badge-danger'}">${dj.status}</span></td>
    <td>${fmtBRL(Number(dj.valor_cache_padrao || 0))}</td>
  </tr>`).join('')}
</table>

<h2>📋 Bookings Ativos</h2>
<table>
  <tr><th>Título</th><th>DJ</th><th>Produtor</th><th>Data</th><th>Status</th></tr>
  ${bookings.filter(b => !['fechado_perdido', 'fechado_ganho'].includes(b.status)).slice(0, 20).map(b => `<tr>
    <td>${b.titulo}</td>
    <td>${(b as any).djs?.nome_artistico || '—'}</td>
    <td>${(b as any).producers?.nome || '—'}</td>
    <td>${b.data_evento ? new Date(b.data_evento).toLocaleDateString('pt-BR') : '—'}</td>
    <td><span class="badge ${['confirmado', 'planejamento', 'pronto_para_evento'].includes(b.status) ? 'badge-success' : 'badge-warning'}">${b.status.replace(/_/g, ' ')}</span></td>
  </tr>`).join('')}
</table>

${overduePayments.length > 0 ? `
<h2>⚠️ Pagamentos Vencidos</h2>
<table>
  <tr><th>Descrição</th><th>Tipo</th><th>Vencimento</th><th>Valor</th></tr>
  ${overduePayments.slice(0, 15).map(f => `<tr>
    <td>${f.descricao || '—'}</td>
    <td>${f.tipo.replace(/_/g, ' ')}</td>
    <td>${f.data_vencimento ? new Date(f.data_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
    <td style="color:#dc3545;font-weight:600">${fmtBRL(Number(f.valor_bruto))}</td>
  </tr>`).join('')}
</table>` : '<h2>✅ Sem Pagamentos Vencidos</h2>'}

<h2>📝 Contratos</h2>
<table>
  <tr><th>Template</th><th>Status</th></tr>
  ${contracts.map(c => `<tr>
    <td>${c.template_name}</td>
    <td><span class="badge ${c.status === 'assinado' ? 'badge-success' : c.status === 'cancelado' ? 'badge-danger' : 'badge-warning'}">${c.status}</span></td>
  </tr>`).join('')}
</table>

<div class="footer">
  <p>D.MUSIC Manager — Relatório gerado automaticamente em ${now.toLocaleString('pt-BR')}</p>
  <p>Este relatório contém informações confidenciais da operação.</p>
</div>
</body></html>`;

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
