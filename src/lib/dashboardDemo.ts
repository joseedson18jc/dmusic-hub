/**
 * Dashboard demo data — gera dados sintéticos determinísticos quando o DB
 * está vazio, pra que o Dashboard pareça "vivo" mesmo no estado fresh-install.
 *
 * Todos os geradores usam um seed fixo + função pseudoaleatória reproducível
 * (mulberry32) — o que significa que o mesmo Dashboard sempre mostra os
 * mesmos números demo, evitando flicker entre re-renders. Pra "trocar a
 * paisagem" basta mudar o `SEED` aqui.
 *
 * O Dashboard checa `isEmpty` antes de injetar — quando dados reais aparecem,
 * o demo desaparece automaticamente.
 */

const SEED = 0xC0FFEE;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);

/* ── Heatmap: 365 dias, picos em weekends + ramp ascendente nos últimos 60d ── */
export function generateHeatmapDemo(): Record<string, number> {
  const out: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 365; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${dd}`;

    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const recencyBoost = Math.max(0, (60 - i) / 60); // últimos 60d ramping up

    let value = 0;
    const roll = rand();
    if (roll < 0.4) value = 0;
    else if (roll < 0.75) value = 1 + Math.floor(rand() * 2);
    else if (roll < 0.92) value = 3 + Math.floor(rand() * 3);
    else value = 6 + Math.floor(rand() * 4);

    if (isWeekend) value = Math.round(value * 1.6);
    value = Math.round(value * (1 + recencyBoost * 0.8));
    if (value > 0) out[key] = value;
  }

  return out;
}

/* ── Revenue series: tendência ascendente com ruído ── */
export function generateRevenueDemo(months: number): Array<{
  month: string;
  receita: number;
  despesa: number;
  lucro: number;
}> {
  const out: Array<{ month: string; receita: number; despesa: number; lucro: number }> = [];
  const now = new Date();
  const baseRevenue = 28000;
  const baseExpense = 18000;

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const factor = 1 + (months - i) * 0.06 + (rand() - 0.5) * 0.3;
    const receita = Math.round(baseRevenue * factor);
    const despesa = Math.round(baseExpense * (1 + (rand() - 0.5) * 0.4));
    out.push({
      month: d.toLocaleDateString('pt-BR', { month: 'short' }),
      receita,
      despesa,
      lucro: receita - despesa,
    });
  }
  return out;
}

/* ── Donut: distribuição de receita por categoria ── */
export function generateRevenueMixDemo(total = 124380): Array<{
  id: string;
  label: string;
  value: number;
  color: string;
}> {
  return [
    { id: 'cache',     label: 'Cachês',         value: Math.round(total * 0.62), color: 'hsl(var(--primary))' },
    { id: 'comissoes', label: 'Comissões',      value: Math.round(total * 0.18), color: 'hsl(var(--info))' },
    { id: 'parcelas',  label: 'Parcelas',       value: Math.round(total * 0.12), color: 'hsl(var(--violet))' },
    { id: 'outros',    label: 'Outros',         value: Math.round(total * 0.08), color: 'hsl(var(--slate))' },
  ];
}

/* ── Top DJs: nomes fictícios com ranking ── */
export function generateTopDjsDemo(): Array<{ name: string; bookings: number; revenue: number }> {
  return [
    { name: 'Yara Bellucci',     bookings: 14, revenue: 89400 },
    { name: 'Tomás Reverb',      bookings: 11, revenue: 64200 },
    { name: 'Nina Sequence',     bookings: 9,  revenue: 51800 },
    { name: 'Mateus Quasar',     bookings: 7,  revenue: 38100 },
    { name: 'Lia Pulse',         bookings: 5,  revenue: 24600 },
  ];
}

/* ── Activity feed: 8 itens cruzando bookings/financial/contracts/tasks ── */
export function generateActivityDemo(): Array<{
  id: string;
  type: 'booking' | 'financial' | 'contract' | 'task' | 'producer';
  title: string;
  detail?: string;
  amount?: number;
  at: string;
}> {
  const now = Date.now();
  const min = 60 * 1000;
  return [
    { id: 'a1', type: 'booking',   title: 'Novo booking confirmado — Festival Neon',          detail: 'Yara Bellucci · 22/06', amount: 12800, at: new Date(now - 8 * min).toISOString() },
    { id: 'a2', type: 'financial', title: 'Pagamento recebido — Acme Eventos',                detail: 'sinal 50%',             amount: 6400,  at: new Date(now - 24 * min).toISOString() },
    { id: 'a3', type: 'contract',  title: 'Contrato assinado — Underground Open Air',         detail: 'v2 · Tomás Reverb',                     at: new Date(now - 56 * min).toISOString() },
    { id: 'a4', type: 'task',      title: 'Tarefa atribuída — confirmar rider técnico',       detail: 'prazo amanhã',                          at: new Date(now - 90 * min).toISOString() },
    { id: 'a5', type: 'booking',   title: 'Nova proposta — Bar Hertz',                        detail: 'Nina Sequence',         amount: 4200,  at: new Date(now - 4 * 60 * min).toISOString() },
    { id: 'a6', type: 'producer',  title: 'Produtor adicionado — Slowburn Coletivo',          detail: 'São Paulo · ativo',                     at: new Date(now - 5 * 60 * min).toISOString() },
    { id: 'a7', type: 'financial', title: 'Repasse emitido — Mateus Quasar',                  detail: 'sinal · maio/26',       amount: 2800,  at: new Date(now - 7 * 60 * min).toISOString() },
    { id: 'a8', type: 'contract',  title: 'Contrato enviado — Lia Pulse',                     detail: 'aguardando assinatura',                 at: new Date(now - 11 * 60 * min).toISOString() },
  ];
}

/* ── Today events ── */
export function generateTodayEventsDemo(): Array<{
  id: string;
  hora_evento: string;
  titulo: string;
  status: string;
  fee_acordado: number;
  djs?: { nome_artistico: string };
  producers?: { nome: string };
}> {
  return [
    { id: 'te1', hora_evento: '20:00', titulo: 'Open Air Underground',  status: 'confirmado',         fee_acordado: 8400,  djs: { nome_artistico: 'Yara Bellucci' }, producers: { nome: 'Acme Eventos' } },
    { id: 'te2', hora_evento: '23:30', titulo: 'After · Club Hertz',    status: 'pronto_para_evento', fee_acordado: 5200,  djs: { nome_artistico: 'Tomás Reverb' },  producers: { nome: 'Slowburn Co.' } },
    { id: 'te3', hora_evento: '02:00', titulo: 'Closing · Quartzo',     status: 'planejamento',       fee_acordado: 3800,  djs: { nome_artistico: 'Nina Sequence' }, producers: { nome: 'Quartzo Crew' } },
  ];
}
