import type { Story } from '@ladle/react';
import { DonutChart, type DonutSlice } from '@/components/dashboard/DonutChart';

export default {
  title: 'Design System / DonutChart',
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const revenueMix: DonutSlice[] = [
  { id: 'cache',     label: 'Cachês',    value: 124380 * 0.62, color: 'hsl(var(--primary))' },
  { id: 'comissoes', label: 'Comissões', value: 124380 * 0.18, color: 'hsl(var(--info))' },
  { id: 'parcelas',  label: 'Parcelas',  value: 124380 * 0.12, color: 'hsl(var(--violet))' },
  { id: 'outros',    label: 'Outros',    value: 124380 * 0.08, color: 'hsl(var(--slate))' },
];

/* ── Padrão (4 fatias, hover destaca) ────────────────────── */
export const Default: Story = () => (
  <div className="p-6">
    <DonutChart
      data={revenueMix}
      centerLabel="Receita"
      centerValue={fmtBRL(124380)}
      formatValue={fmtBRL}
    />
    <p className="text-mini text-muted-foreground mt-2">
      Hover sobre as fatias pra ver detalhes no centro.
    </p>
  </div>
);

/* ── Empty state ──────────────────────────────────────────── */
export const Empty: Story = () => (
  <div className="p-6">
    <DonutChart data={[]} />
  </div>
);

/* ── 2 fatias (50/50) ────────────────────────────────────── */
export const TwoSlices: Story = () => (
  <div className="p-6">
    <DonutChart
      data={[
        { id: 'a', label: 'Receita', value: 50, color: 'hsl(var(--success))' },
        { id: 'b', label: 'Despesa', value: 50, color: 'hsl(var(--destructive))' },
      ]}
      centerLabel="Total"
    />
  </div>
);

/* ── Muitas fatias (8) ───────────────────────────────────── */
export const ManySlices: Story = () => (
  <div className="p-6">
    <DonutChart
      data={[
        { id: '1', label: 'Lead',       value: 24, color: 'hsl(var(--slate))' },
        { id: '2', label: 'Negociação', value: 18, color: 'hsl(var(--warning))' },
        { id: '3', label: 'Confirmação', value: 12, color: 'hsl(var(--primary))' },
        { id: '4', label: 'Realização', value: 10, color: 'hsl(var(--violet))' },
        { id: '5', label: 'Pós-evento', value: 8,  color: 'hsl(var(--success))' },
        { id: '6', label: 'Perdido',    value: 6,  color: 'hsl(var(--destructive))' },
        { id: '7', label: 'Cancelado',  value: 4,  color: 'hsl(var(--muted-foreground))' },
        { id: '8', label: 'Outros',     value: 2,  color: 'hsl(var(--info))' },
      ]}
      centerLabel="Bookings"
    />
  </div>
);

/* ── Size variations ─────────────────────────────────────── */
export const Sizes: Story = () => (
  <div className="flex flex-wrap items-center gap-8 p-6">
    <DonutChart data={revenueMix} size={120} thickness={14} />
    <DonutChart data={revenueMix} size={180} thickness={22} />
    <DonutChart data={revenueMix} size={240} thickness={28} />
  </div>
);

/* ── Uma fatia dominante (88%) ───────────────────────────── */
export const Dominant: Story = () => (
  <div className="p-6">
    <DonutChart
      data={[
        { id: 'main',  label: 'Cachês',  value: 88, color: 'hsl(var(--primary))' },
        { id: 'other', label: 'Outros',  value: 12, color: 'hsl(var(--slate))' },
      ]}
      centerLabel="Mix"
    />
  </div>
);
