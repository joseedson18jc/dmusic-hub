import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * EditorialHero — hero header com aesthetic "editorial cyberpunk".
 *
 * Visual:
 *  • Container glass com backdrop-blur + ambient glow blobs
 *  • Grid scan-line overlay sutil com mask radial
 *  • 4 corner brackets HUD na borda
 *  • Status strip (live dot, badges mono caps) acima do título
 *  • Título massivo com gradient text (foreground → accent)
 *  • Live ticker (mono caps) abaixo do título
 *  • Slot pra ações no canto direito
 *
 * Uso em pages: Dashboard, Bookings, DJs, Produtores, Financeiro (todas com mesma linguagem).
 */

export interface StatusBadge {
  label: string;
  /** "live" | "info" | "warn" | "danger" — controla cor da dot/texto */
  tone?: 'live' | 'info' | 'warn' | 'danger' | 'muted';
  icon?: ReactNode;
}

export interface TickerItem {
  /** Label da métrica (mono caps) */
  label: string;
  /** Valor formatado (será destacado em bold) */
  value: string;
  /** Cor opcional do valor (default: foreground) */
  valueColor?: string;
}

export interface EditorialHeroProps {
  title: string;
  /** Status badges no topo (live dot, data, etc.) */
  status?: StatusBadge[];
  /** Métricas inline embaixo do título */
  ticker?: TickerItem[];
  /** Slot direito (botões, period selector, etc.) */
  actions?: ReactNode;
  /** Cor secundária no gradient do título (default: primary) */
  accentHueA?: string;
  accentHueB?: string;
  /** Subtítulo simples (alternativa ao ticker) */
  subtitle?: ReactNode;
  /** Tamanho do título — default xl */
  size?: 'lg' | 'xl' | '2xl';
  /** Mostrar/esconder grid overlay (default true) */
  gridOverlay?: boolean;
  className?: string;
}

const TONE_COLOR: Record<NonNullable<StatusBadge['tone']>, string> = {
  live: 'hsl(var(--success))',
  info: 'hsl(var(--info))',
  warn: 'hsl(var(--warning))',
  danger: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
};

export function EditorialHero({
  title,
  status,
  ticker,
  actions,
  subtitle,
  accentHueA = 'hsl(var(--primary))',
  accentHueB = 'hsl(var(--magenta, 320 70% 65%))',
  size = 'xl',
  gridOverlay = true,
  className,
}: EditorialHeroProps) {
  const titleSize =
    size === 'lg' ? 'text-3xl md:text-4xl'
    : size === '2xl' ? 'text-5xl md:text-7xl'
    : 'text-4xl md:text-6xl';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 via-card/50 to-card/30 backdrop-blur-sm',
        className,
      )}
    >
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-success/15 blur-3xl opacity-50" />

      {/* Grid scan-line overlay */}
      {gridOverlay && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 75%)',
          }}
        />
      )}

      {/* Corner brackets — HUD aesthetic */}
      <span aria-hidden className="pointer-events-none absolute top-3 left-3 h-3 w-3 border-l-2 border-t-2 border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute top-3 right-3 h-3 w-3 border-r-2 border-t-2 border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-l-2 border-b-2 border-primary/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-r-2 border-b-2 border-primary/60" />

      <div className="relative p-6 md:p-8">
        {/* Status strip */}
        {status && status.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap mb-4">
            {status.map((s, i) => {
              const tone = s.tone ?? 'muted';
              const color = TONE_COLOR[tone];
              return (
                <span
                  key={`${s.label}-${i}`}
                  className="flex items-center gap-1.5 text-mini font-mono uppercase tracking-[0.18em]"
                  style={{ color }}
                >
                  {tone === 'live' && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                    </span>
                  )}
                  {s.icon}
                  <span>{s.label}</span>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <h1
              className={cn(titleSize, 'font-black tracking-tighter leading-[0.95]')}
              style={{
                background: `linear-gradient(115deg, hsl(var(--foreground)) 0%, hsl(var(--foreground)) 40%, ${accentHueA} 70%, ${accentHueB} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {title}
            </h1>
            {ticker && ticker.length > 0 && (
              <p className="text-xs md:text-sm text-muted-foreground/80 font-mono uppercase tracking-[0.14em] flex items-center gap-2 flex-wrap pt-1">
                {ticker.map((t, i) => (
                  <span key={`${t.label}-${i}`} className="flex items-center gap-2">
                    {i > 0 && <span className="opacity-40">/</span>}
                    <span>{t.label}</span>
                    <span className="font-semibold" style={{ color: t.valueColor ?? 'hsl(var(--foreground))' }}>
                      {t.value}
                    </span>
                  </span>
                ))}
              </p>
            )}
            {!ticker && subtitle && (
              <div className="text-xs md:text-sm text-muted-foreground/80 pt-1">{subtitle}</div>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
