/**
 * Canonical categorical chart palette.
 * Source-of-truth tokens are defined in `src/index.css` under `--chart-1..10`.
 *
 * Use this single ordered array everywhere — multiple pages previously had
 * their own arrays in different orderings, which produced inconsistent
 * colours for the same dataset across screens.
 */
export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--chart-7))',
  'hsl(var(--chart-8))',
  'hsl(var(--chart-9))',
  'hsl(var(--chart-10))',
] as const;
