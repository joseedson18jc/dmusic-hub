import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * ActivityHeatmap — GitHub-style 53-week × 7-day contributions grid.
 *
 * Inputs are a sparse Record<dateKey,value>; missing dates default to 0.
 * Cells are color-tinted by quintile of the value distribution (so the
 * scale is robust to outliers and self-adjusts to whatever data shows up).
 *
 * Interactive: hover any cell to see a tooltip with the exact date + value.
 * Click handler optional — used by the dashboard to navigate to /agenda
 * filtered by the clicked date.
 *
 * Visually: rounded squares, 11px on desktop, 9px on mobile. The "today"
 * cell gets a subtle ring. Empty cells use `bg-muted/30` for the grid
 * texture; filled cells transition through the primary hue with opacity
 * ramps (15% → 30% → 55% → 80% → 100%).
 */

export interface ActivityHeatmapProps {
  /** Date key (`YYYY-MM-DD`) → numeric value. Missing keys treated as 0. */
  data: Record<string, number>;
  /** Total weeks to display (default 53). */
  weeks?: number;
  /** Optional label for the value in tooltips (e.g. "evento", "booking"). */
  valueLabel?: string;
  /** Optional click handler — receives the date key + value. */
  onCellClick?: (dateKey: string, value: number) => void;
  className?: string;
}

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAY_LABELS = ['', 'seg', '', 'qua', '', 'sex', ''];

export function ActivityHeatmap({
  data,
  weeks = 53,
  valueLabel = 'evento',
  onCellClick,
  className,
}: ActivityHeatmapProps) {
  /* ── Compute date grid (53 weeks × 7 days backwards from today) ── */
  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Anchor to last Saturday of grid (Sunday = day 0)
    const dayOfWeek = today.getDay(); // 0 = Sun
    const lastCol = new Date(today);
    lastCol.setDate(today.getDate() + (6 - dayOfWeek));

    const startCol = new Date(lastCol);
    startCol.setDate(lastCol.getDate() - weeks * 7 + 1);

    const grid: Array<{
      dateKey: string;
      value: number;
      dayOfWeek: number;
      weekIndex: number;
      isToday: boolean;
      isFuture: boolean;
      monthChange: boolean;
    }> = [];

    let prevMonth = -1;
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startCol);
        cellDate.setDate(startCol.getDate() + w * 7 + d);
        const y = cellDate.getFullYear();
        const m = String(cellDate.getMonth() + 1).padStart(2, '0');
        const dd = String(cellDate.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${dd}`;
        const value = data[dateKey] ?? 0;
        const isToday = cellDate.getTime() === today.getTime();
        const isFuture = cellDate.getTime() > today.getTime();
        const monthChange = d === 0 && cellDate.getMonth() !== prevMonth;
        if (d === 0) prevMonth = cellDate.getMonth();

        grid.push({
          dateKey,
          value,
          dayOfWeek: d,
          weekIndex: w,
          isToday,
          isFuture,
          monthChange,
        });
      }
    }

    return grid;
  }, [data, weeks]);

  /* ── Compute quintile thresholds for color binning ── */
  const thresholds = useMemo(() => {
    const positive = cells.map((c) => c.value).filter((v) => v > 0).sort((a, b) => a - b);
    if (positive.length === 0) return [1, 2, 3, 4]; // fallback
    const q = (p: number) => positive[Math.floor((positive.length - 1) * p)];
    return [q(0.2), q(0.4), q(0.6), q(0.8)];
  }, [cells]);

  const intensity = (value: number): number => {
    if (value === 0) return 0;
    if (value <= thresholds[0]) return 1;
    if (value <= thresholds[1]) return 2;
    if (value <= thresholds[2]) return 3;
    if (value <= thresholds[3]) return 4;
    return 5;
  };

  /* ── Stats for the legend ── */
  const totals = useMemo(() => {
    const active = cells.filter((c) => c.value > 0 && !c.isFuture);
    const sum = active.reduce((s, c) => s + c.value, 0);
    return { activeDays: active.length, sum };
  }, [cells]);

  /* ── Hover state ── */
  const [hover, setHover] = useState<typeof cells[number] | null>(null);

  /* ── Month labels: capture week index where each month begins ── */
  const monthLabels = useMemo(() => {
    const labels: Array<{ weekIndex: number; label: string }> = [];
    let prev = -1;
    for (let w = 0; w < weeks; w++) {
      const firstCellOfWeek = cells[w * 7];
      const d = new Date(firstCellOfWeek.dateKey + 'T12:00:00');
      const m = d.getMonth();
      if (m !== prev && w > 0) {
        labels.push({ weekIndex: w, label: MONTH_LABELS[m] });
      }
      prev = m;
    }
    return labels;
  }, [cells, weeks]);

  /* Format the active date once for the status bar. */
  const hoverLabel = hover
    ? new Date(hover.dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : null;

  return (
    <div className={cn('relative', className)}>
      {/* Status bar — sempre presente; mostra info do hover OU stats agregadas.
          Substituiu o tooltip flutuante que era cortado pelo overflow do <Card>
          pai. Padrão é o mesmo do GitHub contributions: estado consistente,
          sem flicker. */}
      <div
        className="mb-3 min-h-[24px] flex items-center justify-between gap-3 text-mini text-muted-foreground font-mono"
        aria-live="polite"
      >
        {hover ? (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-[2px] bg-primary" />
            <span className="text-foreground tabular-nums">{hover.value}</span>
            <span>{valueLabel}{hover.value !== 1 ? 's' : ''}</span>
            <span className="opacity-50">·</span>
            <span className="text-foreground/80">{hoverLabel}</span>
            {hover.isToday && (
              <span className="ml-1 px-1 rounded text-nano uppercase tracking-wider bg-primary/15 text-primary">
                hoje
              </span>
            )}
          </span>
        ) : (
          <span>
            <span className="text-foreground/80 tabular-nums">{totals.sum}</span> {valueLabel}s ·{' '}
            <span className="text-foreground/80 tabular-nums">{totals.activeDays}</span> dias ativos · hover pra detalhes
          </span>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="opacity-70">menos</span>
          {[0, 1, 2, 3, 4, 5].map((lvl) => (
            <span
              key={lvl}
              className={cn(
                'w-[11px] h-[11px] rounded-[2px]',
                lvl === 0 && 'bg-muted/40',
                lvl === 1 && 'bg-primary/25',
                lvl === 2 && 'bg-primary/45',
                lvl === 3 && 'bg-primary/65',
                lvl === 4 && 'bg-primary/85',
                lvl === 5 && 'bg-primary',
              )}
            />
          ))}
          <span className="opacity-70">mais</span>
        </div>
      </div>

      {/* Month axis */}
      <div className="relative h-3 ml-8 mb-1.5">
        {monthLabels.map((ml) => (
          <span
            key={`${ml.weekIndex}-${ml.label}`}
            className="absolute text-micro uppercase tracking-wider text-muted-foreground/70 font-mono"
            style={{ left: `${(ml.weekIndex / weeks) * 100}%` }}
          >
            {ml.label}
          </span>
        ))}
      </div>

      <div className="flex gap-1.5">
        {/* Weekday axis */}
        <div className="flex flex-col gap-[3px] text-nano uppercase tracking-wider text-muted-foreground/50 font-mono pt-0.5">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="h-[11px] flex items-center w-6">
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid grid-flow-col gap-[3px]"
          style={{
            gridTemplateRows: 'repeat(7, 11px)',
            gridAutoColumns: '11px',
          }}
          onMouseLeave={() => setHover(null)}
        >
          {cells.map((c) => {
            const lvl = intensity(c.value);
            const colorClass =
              c.isFuture
                ? 'bg-muted/15'
                : lvl === 0
                ? 'bg-muted/40'
                : lvl === 1
                ? 'bg-primary/25'
                : lvl === 2
                ? 'bg-primary/45'
                : lvl === 3
                ? 'bg-primary/65'
                : lvl === 4
                ? 'bg-primary/85'
                : 'bg-primary';

            return (
              <button
                key={c.dateKey}
                type="button"
                disabled={c.isFuture}
                onMouseEnter={() => setHover(c)}
                onFocus={() => setHover(c)}
                onClick={() => onCellClick?.(c.dateKey, c.value)}
                aria-label={`${c.dateKey}: ${c.value} ${valueLabel}${c.value !== 1 ? 's' : ''}`}
                className={cn(
                  'w-[11px] h-[11px] rounded-[2px] transition-all',
                  colorClass,
                  c.isToday && 'ring-1 ring-foreground/70 ring-offset-[1px] ring-offset-background',
                  !c.isFuture && 'hover:scale-150 hover:z-10 cursor-pointer focus:scale-150 focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary',
                  c.isFuture && 'cursor-not-allowed',
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
