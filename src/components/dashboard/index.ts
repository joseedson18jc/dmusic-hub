/**
 * Barrel — `@/components/dashboard` reexporta todos os componentes
 * de visualização do Dashboard (Index.tsx + páginas que reusam).
 *
 * Convenção:
 *   import { ActivityHeatmap, RadialProgress, CountUp } from '@/components/dashboard';
 *
 * Em vez de N linhas de import path completo.
 */

export { ActivityHeatmap } from './ActivityHeatmap';
export type { ActivityHeatmapProps } from './ActivityHeatmap';

export { RadialProgress } from './RadialProgress';
export type { RadialProgressProps } from './RadialProgress';

export { CountUp } from './CountUp';
export type { CountUpProps } from './CountUp';

export { Sparkline } from './Sparkline';
export type { SparklineProps } from './Sparkline';

export { DonutChart } from './DonutChart';
export type { DonutChartProps, DonutSlice } from './DonutChart';

export { RecentActivity } from './RecentActivity';
export type { RecentActivityProps, ActivityItem, ActivityType } from './RecentActivity';
