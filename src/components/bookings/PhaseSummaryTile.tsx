import * as React from 'react';
import type { PipelinePhase } from '@/lib/bookingPhases';
import { cn } from '@/lib/utils';

/**
 * PhaseSummaryTile — botão-tile que mostra o resumo de uma fase do pipeline.
 *
 * Usado em:
 *   - pages/Bookings.tsx (grid de 5 tiles acima do kanban — clicável para filtrar)
 *   - pages/Index.tsx    (dashboard "Pipeline" card)
 *
 * Hue por fase via tokens semânticos (phase.bg / phase.color / phase.border).
 * O destaque visual da fase "conf" (laranja brand) vem do borderColor já
 * configurado em PIPELINE_PHASES; opcionalmente o consumidor pode passar
 * `highlight` para acentuar (shadow + ring).
 */
export interface PhaseSummaryTileProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  phase: PipelinePhase;
  /** Quantidade de bookings na fase. */
  count: number;
  /** Soma de valor potencial (R$). Passe `0` para suprimir a linha. */
  totalValue?: number;
  /** String do "X status" (default: `${phase.statuses.length} status`). */
  statusCountLabel?: string;
  /** Formato monetário (default: `Intl.NumberFormat pt-BR BRL`). */
  formatCurrency?: (v: number) => string;
  /** Sufixo da linha de valor (default: "potencial"). Ex.: "valor", "GMV". */
  valueLabel?: string;
  /** Aplica shadow + ring quando esta tile é a "estrela" (ex.: "Confirmação" no dashboard). */
  highlight?: boolean;
}

const defaultFmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);

export const PhaseSummaryTile = React.forwardRef<HTMLButtonElement, PhaseSummaryTileProps>(
  (
    {
      phase,
      count,
      totalValue,
      statusCountLabel,
      formatCurrency = defaultFmt,
      valueLabel = 'potencial',
      highlight,
      className,
      ...props
    },
    ref,
  ) => {
    const showValue = totalValue !== undefined;
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'text-left p-3 rounded-lg border transition-transform hover:-translate-y-0.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className,
        )}
        style={{
          background: phase.bg,
          color: phase.color,
          borderColor: phase.border,
          boxShadow: highlight
            ? `0 0 0 1px ${phase.accent}66, 0 8px 24px -10px ${phase.accent}99`
            : undefined,
        }}
        {...props}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className="text-micro uppercase tracking-wider opacity-80 leading-tight">
            {phase.label}
          </span>
          <span className="text-micro font-mono opacity-70 shrink-0">
            {statusCountLabel ?? `${phase.statuses.length} status`}
          </span>
        </div>
        <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{count}</div>
        {showValue && (
          <div className="mt-0.5 text-mini opacity-70 font-mono">
            {totalValue! > 0 ? `${formatCurrency(totalValue!)} ${valueLabel}` : '—'}
          </div>
        )}
      </button>
    );
  },
);
PhaseSummaryTile.displayName = 'PhaseSummaryTile';
