/**
 * Ladle config — preview visual de componentes do design system.
 *
 * Rodar: `bun run ladle` (serve em http://localhost:61000)
 * Build: `bun run ladle:build` (estático em ./build)
 *
 * Convenção de stories: arquivos `*.stories.tsx` em `src/components/`.
 * Cada story exporta funções nomeadas (uma por variante visual a mostrar).
 */
export default {
  stories: 'src/**/*.stories.{js,jsx,ts,tsx}',
  // Story IDs no Ladle são `<level>--<level>--<exportName-kebab>`.
  // Os nossos exports vivem em "Design system / <Component>" (slash do title).
  defaultStory: 'design-system--designtokens--paleta',
  appendToHead: '',
  addons: {
    a11y: {
      enabled: true,
    },
    action: { enabled: true },
    control: { enabled: true },
    ladle: { enabled: true },
    mode: { enabled: true, defaultState: 'full' },
    rtl: { enabled: false },
    source: { enabled: true },
    theme: {
      // Ladle UI theme — não confundir com o tema da app (que é controlado por .dark)
      enabled: true,
      defaultState: 'dark',
    },
    width: { enabled: true },
  },
};
