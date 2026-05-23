import type { Story } from '@ladle/react';
import { useState, useEffect } from 'react';
import { RadialProgress } from '@/components/dashboard/RadialProgress';

export default {
  title: 'Design System / RadialProgress',
};

/* ── 4 valores em sequência ──────────────────────────────── */
export const Steps: Story = () => (
  <div className="flex flex-wrap gap-6 p-6">
    <RadialProgress value={25} label="25%" />
    <RadialProgress value={50} label="50%" />
    <RadialProgress value={75} label="75%" />
    <RadialProgress value={100} label="Concluído" />
  </div>
);

/* ── Tones (6 cores semânticas) ──────────────────────────── */
export const Tones: Story = () => (
  <div className="flex flex-wrap gap-6 p-6">
    <RadialProgress value={72} tone="primary" label="primary" />
    <RadialProgress value={72} tone="success" label="success" />
    <RadialProgress value={72} tone="warning" label="warning" />
    <RadialProgress value={72} tone="destructive" label="destructive" />
    <RadialProgress value={72} tone="info" label="info" />
    <RadialProgress value={72} tone="violet" label="violet" />
  </div>
);

/* ── Sizes ────────────────────────────────────────────────── */
export const Sizes: Story = () => (
  <div className="flex flex-wrap items-end gap-6 p-6">
    <RadialProgress value={72} size={72} strokeWidth={7} label="72" />
    <RadialProgress value={72} size={120} label="120" />
    <RadialProgress value={72} size={180} strokeWidth={14} label="180" />
  </div>
);

/* ── Custom displayValue ─────────────────────────────────── */
export const CustomDisplayValue: Story = () => (
  <div className="flex flex-wrap gap-6 p-6">
    <RadialProgress
      value={75}
      displayValue={<span className="text-base font-bold">3/4</span>}
      label="bookings"
    />
    <RadialProgress
      value={60}
      displayValue={<span className="text-mini">R$ 36K</span>}
      label="meta"
      tone="success"
    />
  </div>
);

/* ── Glow ─────────────────────────────────────────────────── */
export const Glow: Story = () => (
  <div className="flex flex-wrap gap-6 p-6">
    <RadialProgress value={72} tone="primary" glow label="glow" />
    <RadialProgress value={88} tone="success" glow label="glow" />
  </div>
);

/* ── Animado (valor muda dinamicamente) ──────────────────── */
export const Animated: Story = () => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const targets = [10, 35, 70, 95, 45];
    let i = 0;
    const t = setInterval(() => {
      setValue(targets[i++ % targets.length]);
    }, 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="p-6 space-y-3">
      <p className="text-mini text-muted-foreground">
        Valor muda a cada 1.8s — assista a animação fluir (easing easeOutCubic, 800ms).
      </p>
      <RadialProgress value={value} label="auto" />
    </div>
  );
};

/* ── Edge cases ──────────────────────────────────────────── */
export const EdgeCases: Story = () => (
  <div className="p-6 space-y-3">
    <p className="text-mini text-muted-foreground">
      Edge: valores fora de [0, 100] são clamped visualmente.
    </p>
    <div className="flex flex-wrap gap-6">
      <RadialProgress value={0} label="0%" />
      <RadialProgress value={-50} label="-50 → 0" />
      <RadialProgress value={150} label="150 → 100" />
    </div>
  </div>
);
