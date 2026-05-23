import { useEffect } from 'react';

/**
 * Paleta única: Cyberpunk Neon Syndicate (#05050A).
 * O tema alternativo "Dark Slate" (#08090d) foi descontinuado para alinhar
 * com a regra Core do projeto. Garante que nenhum atributo `data-theme`
 * residual continue ativo no documento.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
  }, []);

  return <>{children}</>;
}