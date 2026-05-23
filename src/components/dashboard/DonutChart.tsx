import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * DonutChart — pie/donut SVG puro com hover destacando fatias.
 *
 * Não usa recharts pra evitar overhead pra um chart de 5-6 fatias. Cada fatia é
 * um path SVG calculado por trigonometria (segmento de arco).
 *
 * O segmento ativo no hover ganha um leve "push out" (translate radial) +
 * stroke mais grosso. O centro do donut exibe o label do segmento hover ou o
 * total quando nada está hover.
 */

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string; // CSS color string (já com hsl/etc resolvido)
}

export interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  /** Texto central quando nada está em hover (ex.: "Total" / "100%"). */
  centerLabel?: React.ReactNode;
  centerValue?: React.ReactNode;
  /** Formata o valor da fatia em hover (default: número raw). */
  formatValue?: (v: number) => string;
  className?: string;
}

export const DonutChart = forwardRef<HTMLDivElement, DonutChartProps>(function DonutChart(
  {
    data,
    size = 180,
    thickness = 22,
    centerLabel,
    centerValue,
    formatValue,
    className,
  },
  ref,
) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const cir = 2 * Math.PI * r;

  if (total <= 0) {
    // No-data case: wrapper div carrega o ref pra manter contrato consistente.
    return (
      <div ref={ref} className={cn('inline-flex', className)}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted) / 0.5)" strokeWidth={thickness} strokeDasharray="4 6" />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
        >
          sem dados
        </text>
      </svg>
      </div>
    );
  }

  let cumulative = 0;
  const slices = data.map((s, i) => {
    const pct = s.value / total;
    const dashLength = pct * cir;
    const offset = cumulative;
    cumulative += dashLength;
    return { ...s, pct, dashLength, offset, idx: i };
  });

  const hover = hoverIdx !== null ? slices[hoverIdx] : null;

  return (
    <div ref={ref} className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted) / 0.4)" strokeWidth={thickness} />
        {/* Slices */}
        {slices.map((s, i) => {
          const isActive = hoverIdx === i;
          return (
            <circle
              key={s.id}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={isActive ? thickness + 3 : thickness}
              strokeDasharray={`${s.dashLength} ${cir - s.dashLength}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                cursor: 'pointer',
                transition: 'stroke-width 120ms ease, opacity 120ms ease',
                opacity: hoverIdx !== null && !isActive ? 0.4 : 1,
              }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {hover ? (
          <>
            <span
              className="text-micro uppercase tracking-wider font-mono truncate max-w-[80%]"
              style={{ color: hover.color }}
            >
              {hover.label}
            </span>
            <span
              className="text-xl font-bold tracking-tight tabular-nums"
              style={{ fontFamily: 'Geist, Inter, sans-serif', color: hover.color }}
            >
              {formatValue ? formatValue(hover.value) : hover.value}
            </span>
            <span className="text-micro text-muted-foreground tabular-nums">
              {(hover.pct * 100).toFixed(1)}%
            </span>
          </>
        ) : (
          <>
            {centerLabel && (
              <span className="text-micro uppercase tracking-wider text-muted-foreground/70 font-mono">
                {centerLabel}
              </span>
            )}
            <span className="text-xl font-bold tracking-tight tabular-nums" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
              {centerValue ?? (formatValue ? formatValue(total) : total)}
            </span>
          </>
        )}
      </div>
    </div>
  );
});
