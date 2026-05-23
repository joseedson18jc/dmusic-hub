import type { Story } from '@ladle/react';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { generateHeatmapDemo } from '@/lib/dashboardDemo';

export default {
  title: 'Design System / ActivityHeatmap',
};

/* ── Vazio (status bar mostra "0 eventos · 0 dias ativos") ── */
export const Empty: Story = () => (
  <div className="p-6 max-w-4xl">
    <ActivityHeatmap data={{}} valueLabel="evento" />
  </div>
);

/* ── Demo data (rampa ascendente nos últimos 60 dias) ─────── */
export const WithDemoData: Story = () => (
  <div className="p-6 max-w-4xl">
    <ActivityHeatmap data={generateHeatmapDemo()} valueLabel="evento" />
  </div>
);

/* ── Curto (10 semanas) ──────────────────────────────────── */
export const ShortRange: Story = () => (
  <div className="p-6 max-w-2xl">
    <ActivityHeatmap data={generateHeatmapDemo()} weeks={10} valueLabel="evento" />
  </div>
);

/* ── Interativo (com onCellClick) ────────────────────────── */
export const Interactive: Story = () => (
  <div className="p-6 max-w-4xl space-y-3">
    <p className="text-mini text-muted-foreground">
      Hover ou Tab/Setas pra ver detalhe no status bar. Click pra ver alert
      simulando navegação para `/agenda?date=...`.
    </p>
    <ActivityHeatmap
      data={generateHeatmapDemo()}
      valueLabel="evento"
      onCellClick={(dateKey, value) =>
        alert(`Cell click: ${dateKey} (${value} eventos)`)
      }
    />
  </div>
);

/* ── Densidade alta (todas as fases têm valores) ─────────── */
export const HighDensity: Story = () => {
  // Gera dados sintéticos densos: pelo menos 1 evento em quase todo dia
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const data: Record<string, number> = {};
  for (let i = 365; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    data[key] = (i % 7 === 0 ? 8 : i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1);
  }
  return (
    <div className="p-6 max-w-4xl">
      <ActivityHeatmap data={data} valueLabel="booking" />
    </div>
  );
};
