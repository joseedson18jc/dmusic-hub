/**
 * ModernChartTooltip — tooltip estilizado pra recharts.
 *
 * Visual:
 *   • Glass effect com backdrop-blur
 *   • Header com período em UPPERCASE
 *   • Cada linha tem dot colorido + label + valor formatado
 *   • Border accent na cor do dataset principal
 */

interface RechartsPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
  fill?: string;
  stroke?: string;
}

interface ModernChartTooltipProps {
  active?: boolean;
  payload?: RechartsPayloadItem[];
  label?: string;
  /** Formatador customizado por dataKey */
  formatter?: (value: number, name: string, dataKey: string) => string;
  /** Subtitle/secondary text (opcional) */
  subtitle?: string;
  /** Mostra delta vs período anterior se disponível */
  showDelta?: boolean;
}

const defaultFormatter = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export function ModernChartTooltip({
  active,
  payload,
  label,
  formatter = defaultFormatter,
  subtitle,
}: ModernChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const accentColor = payload[0]?.color || payload[0]?.stroke || 'hsl(var(--primary))';

  return (
    <div
      className="rounded-xl border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl p-3 min-w-[180px]"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
    >
      {label && (
        <div className="text-mini uppercase tracking-wider text-muted-foreground font-mono mb-2 pb-2 border-b border-border/40">
          {label}
          {subtitle && <span className="ml-2 text-foreground/60 normal-case">· {subtitle}</span>}
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, idx) => {
          const color = entry.color || entry.stroke || entry.fill || 'hsl(var(--primary))';
          return (
            <div key={`${entry.dataKey}-${idx}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full ring-2 ring-background flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-muted-foreground truncate">{entry.name}</span>
              </span>
              <span
                className="font-mono font-bold tabular-nums whitespace-nowrap"
                style={{ color }}
              >
                {formatter(Number(entry.value || 0), entry.name, entry.dataKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Gradient defs pra usar com Area/Bar charts.
   Coloca <ChartGradients /> dentro do <defs> do chart antes do dataset.
   ════════════════════════════════════════════════════════════════ */
export function ChartGradients({ id = 'chart' }: { id?: string }) {
  return (
    <>
      <linearGradient id={`${id}-gradSuccess`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.55} />
        <stop offset="60%" stopColor="hsl(var(--success))" stopOpacity={0.12} />
        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
      </linearGradient>
      <linearGradient id={`${id}-gradPrimary`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
        <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
      </linearGradient>
      <linearGradient id={`${id}-gradDanger`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
      </linearGradient>
      <linearGradient id={`${id}-gradInfo`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.5} />
        <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
      </linearGradient>
      {/* Glow filter pra linhas chamativas */}
      <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </>
  );
}

/**
 * Helper: classNames padronizados pros axes do chart.
 * Usa css vars em vez de hex pra acompanhar o tema.
 */
export const chartAxisProps = {
  stroke: 'hsl(var(--chart-axis))',
  fontSize: 10,
  tickLine: false,
  axisLine: false,
  className: 'font-mono',
} as const;

export const chartGridProps = {
  stroke: 'hsl(var(--chart-grid))',
  strokeDasharray: '2 4',
  vertical: false as const,
} as const;

/**
 * Helper: composed style pra Bar com gradient + radius arredondado.
 */
export function getBarStyle(gradientId: string): { fill: string; radius: [number, number, number, number] } {
  return {
    fill: `url(#${gradientId})`,
    radius: [6, 6, 0, 0] as [number, number, number, number],
  };
}

export default ModernChartTooltip;
