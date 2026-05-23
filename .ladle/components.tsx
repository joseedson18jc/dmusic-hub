import type { GlobalProvider } from '@ladle/react';
import { useEffect } from 'react';
import '../src/index.css';

/**
 * Provider global do Ladle — força <html class="dark"> + injeta o index.css
 * da app para que os tokens HSL (`--primary`, `--violet`, etc) resolvam.
 *
 * Sem isso, os componentes renderizam invisíveis (token cor sobre token cor
 * que não existe). Esta é a única integração necessária entre Ladle e o
 * design system DMusic.
 */
export const Provider: GlobalProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    document.body.style.background = 'hsl(var(--background))';
    document.body.style.color = 'hsl(var(--foreground))';
    document.body.style.fontFamily = "'Inter', system-ui, sans-serif";
  }, []);

  return <>{children}</>;
};
