import { useEffect, useState } from 'react';

/**
 * `useReducedMotion` — escuta o media query `prefers-reduced-motion: reduce`.
 * Componentes que rodam animação programática (CountUp, RadialProgress, etc.)
 * devem skipar a animação quando este hook retorna `true`, respeitando o
 * setting do sistema do usuário (WCAG 2.3.3).
 *
 * Inicializa lendo o estado atual e re-renderiza se o user mudar a preferência
 * (eg trocar o setting do macOS sem refresh).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Modern API + fallback for Safari < 14
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);

  return reduced;
}
