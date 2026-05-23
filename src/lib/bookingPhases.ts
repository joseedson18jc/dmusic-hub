/**
 * Canonical pipeline phases — agrupa os 17 status reais do banco em 5 fases visuais.
 *
 * Hue distinto por fase (não opacity ramps no mesmo verde). Resolve o problema
 * histórico do "3 verdes empilhados" do legado BookingBadges.
 *
 * Use os helpers exportados (`phaseForStatus`, `groupByPhase`) ao invés de
 * replicar a varredura. Mantém os enum crus no banco — só muda a apresentação.
 *
 * Antes desta extração: a constante vivia inline em pages/Bookings.tsx (com 7
 * campos: key/label/short/statuses/color/bg/border/accent) E em pages/Index.tsx
 * (com 6 campos, faltando short/accent + uma diferença em `realiz.statuses`).
 * Esta versão unifica e canoniza.
 */

export interface PipelinePhase {
  key: 'lead' | 'negoc' | 'conf' | 'realiz' | 'pos';
  /** Label completo para uso em sumários e tooltips. */
  label: string;
  /** Versão curta (≤ 8 char) para usar em headers de coluna kanban. */
  short: string;
  /** Status crus do banco que pertencem a esta fase. */
  statuses: readonly string[];
  /** Cor do texto (foreground sobre o bg). */
  color: string;
  /** Cor de fundo (já com opacity). */
  bg: string;
  /** Cor da borda. */
  border: string;
  /** Cor "sólida" para barras de acento (sem opacity). */
  accent: string;
}

export const PIPELINE_PHASES: readonly PipelinePhase[] = [
  {
    key: 'lead',
    label: 'Possível Evento — Produtor',
    short: 'Lead',
    statuses: ['novo_lead', 'qualificado', 'briefing_recebido'],
    color: 'hsl(var(--lead-text))',
    bg: 'hsl(var(--slate) / 0.14)',
    border: 'hsl(var(--slate) / 0.35)',
    accent: 'hsl(var(--slate))',
  },
  {
    key: 'negoc',
    label: 'Negociação',
    short: 'Negoc.',
    statuses: ['proposta_enviada', 'negociacao', 'aguardando_aprovacao'],
    color: 'hsl(var(--warning-text))',
    bg: 'hsl(var(--warning) / 0.14)',
    border: 'hsl(var(--warning) / 0.35)',
    accent: 'hsl(var(--warning))',
  },
  {
    key: 'conf',
    label: 'Confirmação',
    short: 'Confirm.',
    statuses: ['contrato_enviado', 'assinatura_pendente', 'sinal_pendente'],
    color: 'hsl(var(--primary-text))',
    bg: 'hsl(var(--primary) / 0.15)',
    border: 'hsl(var(--primary) / 0.40)',
    accent: 'hsl(var(--primary))',
  },
  {
    key: 'realiz',
    label: 'Realização',
    short: 'Realiz.',
    // União dos dois supersets históricos: `confirmado` (canônico em BOOKING_STAGES)
    // + `em_realizacao` (canônico no enum BookingStatus do StatusPill).
    statuses: [
      'confirmado',
      'planejamento',
      'pronto_para_evento',
      'em_realizacao',
      'evento_realizado',
    ],
    color: 'hsl(var(--violet-text))',
    bg: 'hsl(var(--violet) / 0.15)',
    border: 'hsl(var(--violet) / 0.40)',
    accent: 'hsl(var(--violet))',
  },
  {
    key: 'pos',
    label: 'Pós-evento',
    short: 'Pós.',
    statuses: ['pagamento_final_pendente', 'repasse_pendente', 'fechado_ganho'],
    color: 'hsl(var(--success))',
    bg: 'hsl(var(--success) / 0.14)',
    border: 'hsl(var(--success) / 0.40)',
    accent: 'hsl(var(--success))',
  },
] as const;

/** Fase "perdido" — separada porque é colapsável (Bookings) ou oculta (Index). */
export const LOST_PHASE = {
  key: 'lost' as const,
  label: 'Perdido / Cancelado',
  statuses: ['fechado_perdido', 'cancelado'] as const,
} as const;

/** Retorna a fase do pipeline para um status cru, ou `undefined` se for status "perdido"/inválido. */
export function phaseForStatus(status: string): PipelinePhase | undefined {
  return PIPELINE_PHASES.find((p) => p.statuses.includes(status));
}

/** Verifica se um status pertence à fase "perdido". */
export function isLostStatus(status: string): boolean {
  return (LOST_PHASE.statuses as readonly string[]).includes(status);
}

/** Agrupa items por fase. Items com status "perdido"/inválido vão para `lost`. */
export function groupByPhase<T extends { status: string }>(items: T[]): {
  byKey: Record<string, T[]>;
  lost: T[];
} {
  const byKey: Record<string, T[]> = Object.fromEntries(PIPELINE_PHASES.map((p) => [p.key, [] as T[]]));
  const lost: T[] = [];
  for (const item of items) {
    const phase = phaseForStatus(item.status);
    if (phase) byKey[phase.key].push(item);
    else if (isLostStatus(item.status)) lost.push(item);
  }
  return { byKey, lost };
}
