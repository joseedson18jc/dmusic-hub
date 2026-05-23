import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Sparkline — micro-chart inline (sem dependência de recharts).
 *
 * SVG puro, escala automaticamente o `data` pela altura disponível. O gradient
 * abaixo da linha é opcional (mostly visual flourish). Cor controlada pelo
 * token semântico (`success`, `primary`, `destructive`, etc).
 *
 * Hover: mostra o último valor por padrão; pode passar `interactive` pra
 * destacar o ponto mais próximo do cursor (não implementado nesta versão —
 * fica como ponto futuro).
 */

type Tone = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'violet';

const TONE_HSL: Record<Tone, string> = {
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
  info: 'var(--info)',
  violet: 'var(--violet)',
};

export interface SparklineProps {
  data: number[];
  tone?: Tone;
  width?: number;
  height?: number;
  filled?: boolean;
  dashed?: boolean;
  className?: string;
}

export const Sparkline = forwardRef<SVGSVGElement, SparklineProps>(function Sparkline(
  {
    data,
    tone = 'primary',
    width = 120,
    height = 32,
    filled = true,
    dashed = false,
    className,
  },
  ref,
) {
  const id = useId();
  if (!data || data.length < 2) {
    return (
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={cn(className)} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={`hsl(${TONE_HSL[tone]} / 0.4)`}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={cn(className)}
      aria-hidden
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`hsl(${TONE_HSL[tone]})`} stopOpacity={0.35} />
              <stop offset="100%" stopColor={`hsl(${TONE_HSL[tone]})`} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#spark-${id})`} />
        </>
      )}
      <path
        d={linePath}
        fill="none"
        stroke={`hsl(${TONE_HSL[tone]})`}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '3 3' : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Endpoint dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2}
        fill={`hsl(${TONE_HSL[tone]})`}
      />
    </svg>
  );
});
