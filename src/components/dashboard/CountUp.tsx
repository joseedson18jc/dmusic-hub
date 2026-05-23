import { forwardRef, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * CountUp — anima um número de 0 (ou de `from`) até `to` ao montar.
 *
 * Útil pra dar "vida" aos KPIs do hero — o número não aparece estático, ele
 * conta pra cima rapidamente quando a página abre, dando feeling de "ao vivo".
 *
 * Aceita `format` opcional pra exibir moeda/percentuais. O easing é easeOutQuart,
 * que começa rápido e desacelera no final (parece mais "real" que linear).
 *
 * Respeita `prefers-reduced-motion: reduce` — quando o usuário tem essa
 * preferência ativa, o componente pula direto pro valor final sem animação.
 */

export interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  format?: (v: number) => string;
  className?: string;
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

export const CountUp = forwardRef<HTMLSpanElement, CountUpProps>(function CountUp(
  { to, from = 0, duration = 900, format, className },
  ref,
) {
  const reducedMotion = useReducedMotion();
  const [value, setValue] = useState(reducedMotion ? to : from);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setValue(to);
      return;
    }
    const start = performance.now();
    // Não usamos o argumento `now` do RAF callback — em jsdom o timestamp
    // pode estar num epoch diferente de `performance.now()`, gerando t<0
    // (e easeOutQuart(t<0) retorna valor negativo, pintando o KPI errado).
    // Lendo `performance.now()` aqui dentro garante a mesma origem que `start`.
    const tick = () => {
      const t = Math.max(0, Math.min(1, (performance.now() - start) / duration));
      const v = from + (to - from) * easeOutQuart(t);
      setValue(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [to, from, duration, reducedMotion]);

  return <span ref={ref} className={className}>{format ? format(value) : Math.round(value).toLocaleString('pt-BR')}</span>;
});
