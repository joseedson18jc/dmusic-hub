import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import type { PipelinePhase } from '@/lib/bookingPhases';
import { cn } from '@/lib/utils';

/**
 * PhaseKanbanColumn — wrapper de coluna do kanban de bookings, com header,
 * contador, e zona de drop visualmente integrada.
 *
 * Inclui:
 *  - Card-2 com `borderTop: 2px solid phase.accent` (a "barra de fase")
 *  - Header com short-label + badge de contagem (estilizada com phase tokens)
 *  - Drop zone com feedback visual de hover (outline tracejado na cor da fase)
 *  - Overlay "Solte aqui" quando isDragOver
 *
 * Filhos = task cards (renderizados pelo consumidor). Comportamento de drag-drop
 * é controlado pelo consumidor via props (onDragOver/onDragLeave/onDrop) — este
 * componente é puramente visual.
 */
export interface PhaseKanbanColumnProps {
  phase: PipelinePhase;
  count: number;
  /** Estado: o usuário está fazendo drag por cima desta coluna? */
  isDragOver?: boolean;
  /** Disparado quando o cursor entra na drop zone com um drag em curso. */
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDragLeave?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  /** Conteúdo da coluna (cards). */
  children: React.ReactNode;
  /** Texto exibido quando vazio e sem drag (default: "sem cards"). */
  emptyLabel?: string;
  /** Texto exibido durante drag-over como hint (default: "Solte aqui"). */
  dropHint?: string;
  className?: string;
}

export const PhaseKanbanColumn = React.forwardRef<HTMLDivElement, PhaseKanbanColumnProps>(
  (
    {
      phase,
      count,
      isDragOver,
      onDragOver,
      onDragLeave,
      onDrop,
      children,
      emptyLabel = 'sem cards',
      dropHint = 'Solte aqui',
      className,
    },
    ref,
  ) => {
    // Crude check: is the column empty? We infer from React children. Empty
    // string children, null, undefined, false, true all count as "no real cards".
    const childCount = React.Children.toArray(children).filter(
      (c): c is React.ReactNode =>
        c !== null && c !== undefined && c !== false && c !== true && c !== '',
    ).length;
    const isEmpty = childCount === 0;

    return (
      <div
        ref={ref}
        className={cn('bg-card border border-border rounded-[var(--radius)] flex flex-col', className)}
        style={{ borderTop: `2px solid ${phase.accent}` }}
      >
        <header className="p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm leading-tight truncate">{phase.short}</span>
            <Badge
              variant="outline"
              className="font-mono text-mini shrink-0"
              style={{ background: phase.bg, color: phase.color, borderColor: phase.border }}
            >
              {count}
            </Badge>
          </div>
        </header>

        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className="px-3 pb-3 space-y-2 flex-1 min-h-[100px] relative transition-colors"
          style={
            isDragOver
              ? {
                  background: phase.bg.replace('/ 0.14', '/ 0.08').replace('/ 0.15', '/ 0.08'),
                  outline: `2px dashed ${phase.accent}`,
                  outlineOffset: '-8px',
                }
              : undefined
          }
        >
          {isDragOver && (
            <div
              className="absolute inset-0 flex items-center justify-center text-xs font-mono pointer-events-none"
              style={{ color: phase.color }}
            >
              {dropHint}
            </div>
          )}
          {isEmpty && !isDragOver ? (
            <p className="text-mini text-muted-foreground/50 text-center py-6 font-mono">
              {emptyLabel}
            </p>
          ) : (
            children
          )}
        </div>
      </div>
    );
  },
);
PhaseKanbanColumn.displayName = 'PhaseKanbanColumn';
