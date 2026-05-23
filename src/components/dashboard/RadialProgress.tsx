import { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * RadialProgress — anel SVG animado para representar progresso em metas.
 *
 * Render: dois círculos SVG concêntricos. O de trás é o "track" (muted), o
 * da frente é o arc colorido. O `stroke-dasharray` é calculado da circunferência;
 * `stroke-dashoffset` faz o "preenchimento" animado.
 *
 * O componente anima do valor anterior pro novo via requestAnimationFrame —
 * dura 800ms com easing easeOutCubic. Bonito quando o valor muda em tempo real
 * (após salvar uma meta, marcar um booking, etc).
 *
 * O centro mostra o `displayValue` (tipicamente "${pct}%" ou "${count}/${target}").
 */

type Tone = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'violet';

export interface RadialProgressProps {
  /** Percentual atingido (0–100). Pode passar > 100 que clampa visualmente em 100%. */
  value: number;
  /** Texto exibido no centro. Default: `${Math.round(value)}%`. */
  displayValue?: React.ReactNode;
  /** Sub-label exibido abaixo do valor central. */
  label?: React.ReactNode;
  /** Tamanho do SVG em px (default 120). */
  size?: number;
  /** Largura da linha do anel em px (default 10). */
  strokeWidth?: number;
  /** Cor do anel via token semântico. Default `primary`. */
  tone?: Tone;
  /** Renderiza glow externo (sombra colorida). */
  glow?: boolean;
  className?: string;
}

const TONE_HSL: Record<Tone, string> = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  info: 'hsl(var(--info))',
  violet: 'hsl(var(--violet))',
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export const RadialProgress = forwardRef<HTMLDivElement, RadialProgressProps>(function RadialProgress({
  value,
  displayValue,
  label,
  size = 120,
  strokeWidth = 10,
  tone = 'primary',
  glow = false,
  className,
}, ref) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const reducedMotion = useReducedMotion();

  /* ── Animate from previous value to the new one ── */
  const [animated, setAnimated] = useState(reducedMotion ? clamped : 0);
  useEffect(() => {
    if (reducedMotion) {
      setAnimated(clamped);
      return;
    }
    const start = animated;
    const delta = clamped - start;
    const duration = 800;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      setAnimated(start + delta * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, reducedMotion]);

  const dash = (animated / 100) * circumference;
  const offset = circumference - dash;
  const color = TONE_HSL[tone];

  return (
    <div ref={ref} className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn(glow && 'filter drop-shadow(0 0 8px currentColor)')}
        style={{ color, transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.4}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 50ms linear' }}
        />
      </svg>

      {/* Center content (outside SVG so it doesn't inherit the rotation) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
        <span
          className="text-2xl font-bold tracking-tight tabular-nums leading-none"
          style={{ color, fontFamily: 'Geist, Inter, sans-serif' }}
        >
          {displayValue ?? `${Math.round(animated)}%`}
        </span>
        {label && (
          <span className="text-micro uppercase tracking-wider text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  );
});
