import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * KPI primitives.
 *
 * Two shapes ship here:
 *
 *  1. `<KpiStat icon={Icon} label="…" value={X} tone="primary" />`
 *     The 90% case. Icon-in-rounded-bg + label + value. Used across
 *     Tarefas, Agenda, Cobranças, Djs, Produtores, Contratos, Portals…
 *
 *  2. `<KpiCard>…</KpiCard>` with composable subcomponents
 *     (`KpiCard.Header`, `Value`, `Sparkline`, `Progress`, `Footer`, `Cta`)
 *     for advanced cases on Dashboard + Financeiro that need deltas + charts.
 *
 * Both share the same tone tokens (`primary | success | warning | destructive |
 * info | violet | slate | neutral`) which resolve to the HSL semantic tokens
 * defined in src/index.css.
 */

/* ────────────────────────────────────────────────────────────
 * KpiStat — simple icon + label + value tile
 * ──────────────────────────────────────────────────────────── */

type Tone = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'violet' | 'slate' | 'neutral';

const toneClasses: Record<Tone, { bg: string; border: string; text: string; valueWarn?: string }> = {
  primary:     { bg: 'bg-primary/10',     border: 'border-primary/20',     text: 'text-primary' },
  success:     { bg: 'bg-success/10',     border: 'border-success/20',     text: 'text-success' },
  warning:     { bg: 'bg-warning/10',     border: 'border-warning/20',     text: 'text-warning',     valueWarn: 'text-warning' },
  destructive: { bg: 'bg-destructive/10', border: 'border-destructive/20', text: 'text-destructive', valueWarn: 'text-destructive' },
  info:        { bg: 'bg-info/10',        border: 'border-info/20',        text: 'text-info' },
  violet:      { bg: 'bg-violet/10',      border: 'border-violet/20',      text: 'text-violet' },
  slate:       { bg: 'bg-slate/10',       border: 'border-slate/20',       text: 'text-slate' },
  neutral:     { bg: 'bg-muted/40',       border: 'border-border',         text: 'text-muted-foreground' },
};

export interface KpiStatProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** lucide-react icon component */
  icon: LucideIcon;
  label: string;
  /** Value to display. Pass a string for currency / formatted numbers. */
  value: React.ReactNode;
  tone?: Tone;
  /** Optional caption below the value (e.g. "↑ 12% vs ontem"). */
  hint?: React.ReactNode;
  /** Color the value with the tone color (e.g. for "Atrasadas: 3" in destructive). Defaults to false. */
  emphasizeValue?: boolean;
}

export const KpiStat = React.forwardRef<HTMLDivElement, KpiStatProps>(
  ({ icon: Icon, label, value, tone = 'primary', hint, emphasizeValue, className, ...props }, ref) => {
    const t = toneClasses[tone];
    return (
      <Card ref={ref} className={cn('glass-card', className)} {...props}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={cn('h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0', t.bg, t.border, t.text)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-mini text-muted-foreground">{label}</p>
            <p className={cn('text-xl font-bold tabular-nums truncate', emphasizeValue && t.valueWarn)}>
              {value}
            </p>
            {hint && <p className="text-micro text-muted-foreground mt-0.5 truncate">{hint}</p>}
          </div>
        </CardContent>
      </Card>
    );
  },
);
KpiStat.displayName = 'KpiStat';

/* ────────────────────────────────────────────────────────────
 * KpiCard — composable for advanced KPIs (Dashboard, Financeiro)
 * ──────────────────────────────────────────────────────────── */

const kpiCardVariants = cva(
  'rounded-[var(--radius)] border bg-card p-4 flex flex-col gap-1.5 transition-colors',
  {
    variants: {
      tone: {
        default:     'border-border',
        success:     'border-success/35',
        warning:     'border-warning/35',
        destructive: 'border-destructive/35 bg-destructive/[0.02]',
        info:        'border-info/35',
        brand:       'border-primary/45 shadow-[0_8px_24px_-10px_hsl(var(--primary)/.45)]',
      },
      density: {
        compact:     'p-3 gap-1',
        default:     'p-4 gap-1.5',
        comfortable: 'p-5 gap-2',
      },
      interactive: {
        true:  'cursor-pointer hover:border-primary/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'default',
      density: 'default',
      interactive: false,
    },
  },
);

export interface KpiCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kpiCardVariants> {
  /** Optional href — renders as `<a>` instead of `<div>`. */
  asLink?: string;
}

const KpiCardRoot = React.forwardRef<HTMLDivElement, KpiCardProps>(
  ({ className, tone, density, interactive, asLink, children, ...props }, ref) => {
    if (asLink) {
      return (
        <a
          href={asLink}
          className={cn(kpiCardVariants({ tone, density, interactive: true }), className)}
          {...(props as unknown as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      );
    }
    return (
      <div
        ref={ref}
        className={cn(kpiCardVariants({ tone, density, interactive }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
KpiCardRoot.displayName = 'KpiCard';

/* ─── Header (label + optional delta + optional icon) ─── */

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  /** Variação percentual ou absoluta. Positivo = up, negativo = down, 0 = flat. */
  delta?: number;
  /** "%" (default), "pp" (percentage points), "absolute" (R$ ou unidades cruas). */
  deltaUnit?: '%' | 'pp' | 'absolute';
  /** Inverte a semântica: se true, queda é boa (ex.: despesa, vencidos). */
  invertSign?: boolean;
  icon?: LucideIcon;
}

const Header: React.FC<HeaderProps> = ({ label, delta, deltaUnit = '%', invertSign, icon: Icon, className, ...props }) => {
  const isUp = (delta ?? 0) > 0;
  const isDown = (delta ?? 0) < 0;
  const positive = invertSign ? isDown : isUp;
  const negative = invertSign ? isUp : isDown;
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'flex items-center justify-between text-mini uppercase tracking-wider text-muted-foreground font-medium',
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </span>
      {delta !== undefined && (
        <span
          className={cn(
            'font-mono inline-flex items-center gap-0.5 normal-case tracking-normal',
            positive && 'text-success',
            negative && 'text-destructive',
            !positive && !negative && 'text-muted-foreground',
          )}
        >
          <TrendIcon className="h-3 w-3" />
          {isUp ? '+' : ''}
          {deltaUnit === 'absolute' ? formatAbs(delta) : `${delta}${deltaUnit === 'pp' ? ' pp' : '%'}`}
        </span>
      )}
    </div>
  );
};

function formatAbs(n: number): string {
  if (Math.abs(n) >= 1000) return new Intl.NumberFormat('pt-BR').format(n);
  return String(n);
}

/* ─── Value (the big number) ─── */

const Value: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('text-display-sm leading-none font-semibold tracking-tight tabular-nums', className)} {...props}>
    {children}
  </div>
);

/* ─── Sparkline ─── */

type SparkTone = 'success' | 'warning' | 'destructive' | 'info' | 'primary';

interface SparklineProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'data'> {
  data: number[];
  tone?: SparkTone;
  dashed?: boolean;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, tone = 'primary', dashed, height = 32, className, ...props }) => {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  const path = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const stroke = `hsl(var(--${tone}))`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={h}
      className={cn('mt-2', className)}
      aria-hidden
      {...props}
    >
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray={dashed ? '3 3' : undefined} />
    </svg>
  );
};

/* ─── Progress bar ─── */

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0–100
  tone?: SparkTone;
}

const Progress: React.FC<ProgressProps> = ({ value, tone = 'primary', className, ...props }) => (
  <div className={cn('mt-2 h-2 rounded-full overflow-hidden bg-muted', className)} {...props}>
    <div
      className="h-full transition-[width] duration-500"
      style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        backgroundColor: `hsl(var(--${tone}))`,
      }}
    />
  </div>
);

/* ─── Footer ─── */

const Footer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('text-mini text-muted-foreground font-mono', className)} {...props}>
    {children}
  </div>
);

/* ─── CTA button ─── */

interface CtaProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'brand' | 'destructive' | 'ghost';
  icon?: LucideIcon;
}

const Cta: React.FC<CtaProps> = ({ tone = 'ghost', icon: Icon, className, children, ...props }) => (
  <button
    className={cn(
      'mt-2 h-7 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 w-full border transition-colors',
      tone === 'brand' && 'bg-primary text-primary-foreground border-transparent hover:brightness-110',
      tone === 'destructive' && 'border-destructive/40 text-destructive hover:bg-destructive/10',
      tone === 'ghost' && 'border-border hover:bg-muted',
      className,
    )}
    {...props}
  >
    {Icon ? <Icon className="h-3 w-3" /> : null}
    {children}
  </button>
);

/* ─── Composable export ─── */

export const KpiCard = Object.assign(KpiCardRoot, {
  Header,
  Value,
  Sparkline,
  Progress,
  Footer,
  Cta,
});

export { kpiCardVariants };
