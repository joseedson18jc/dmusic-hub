import type { Story } from '@ladle/react';
import { KpiCard, KpiStat } from '@/components/KpiCard';
import {
  Headphones,
  CalendarDays,
  Activity,
  Flame,
  Clock,
  Wallet,
  Phone,
  TrendingUp,
} from 'lucide-react';

export default {
  title: 'Design System / KpiCard',
};

const sampleSeries = [12, 18, 15, 22, 19, 28, 24, 31, 27, 35];

/* ── KpiStat — shorthand ─────────────────────────────────── */
export const KpiStatTones: Story = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-6 max-w-3xl">
    <KpiStat icon={CalendarDays} label="Eventos hoje" value={12} tone="primary" />
    <KpiStat icon={Headphones} label="Disponíveis" value={7} tone="success" />
    <KpiStat icon={Clock} label="Pendentes" value={4} tone="warning" />
    <KpiStat
      icon={Flame}
      label="Atrasadas"
      value={3}
      tone="destructive"
      emphasizeValue
    />
    <KpiStat icon={Activity} label="Em prospecção" value={9} tone="info" />
    <KpiStat icon={Headphones} label="Em realização" value={5} tone="violet" />
    <KpiStat icon={Activity} label="Inativos" value={2} tone="slate" />
    <KpiStat icon={Wallet} label="Total" value={48} tone="neutral" />
  </div>
);

/* ── KpiStat com hint ────────────────────────────────────── */
export const KpiStatWithHint: Story = () => (
  <div className="grid grid-cols-2 gap-3 p-6 max-w-xl">
    <KpiStat
      icon={CalendarDays}
      label="Eventos · maio"
      value={28}
      tone="primary"
      hint="↑ 12% vs abril"
    />
    <KpiStat
      icon={Flame}
      label="Atrasadas"
      value={3}
      tone="destructive"
      emphasizeValue
      hint="mais antigo: 12d"
    />
  </div>
);

/* ── KpiCard composable — KPI básico ─────────────────────── */
export const KpiCardBasic: Story = () => (
  <div className="grid gap-3 p-6 max-w-xs">
    <KpiCard>
      <KpiCard.Header label="Receita · Mai" delta={12} />
      <KpiCard.Value>R$ 124.380</KpiCard.Value>
      <KpiCard.Sparkline data={sampleSeries} tone="success" />
      <KpiCard.Footer>vs. R$ 110.940 · abr</KpiCard.Footer>
    </KpiCard>
  </div>
);

/* ── KpiCard com meta (Progress) ─────────────────────────── */
export const KpiCardWithGoal: Story = () => (
  <div className="grid gap-3 p-6 max-w-xs">
    <KpiCard>
      <KpiCard.Header label="Lucro líquido" delta={8} />
      <KpiCard.Value>R$ 38.150</KpiCard.Value>
      <KpiCard.Progress value={64} tone="primary" />
      <KpiCard.Footer>meta R$ 60K · 64%</KpiCard.Footer>
    </KpiCard>
  </div>
);

/* ── KpiCard crítico com CTA (Vencidos) ──────────────────── */
export const KpiCardDestructiveWithCta: Story = () => (
  <div className="grid gap-3 p-6 max-w-xs">
    <KpiCard tone="destructive">
      <KpiCard.Header label="Vencidos" delta={2} deltaUnit="absolute" invertSign />
      <KpiCard.Value className="text-destructive">R$ 8.420</KpiCard.Value>
      <KpiCard.Footer>mais antigo: 12d · Produtora Z</KpiCard.Footer>
      <KpiCard.Cta tone="destructive" icon={Phone}>
        Cobrar agora
      </KpiCard.Cta>
    </KpiCard>
  </div>
);

/* ── KpiCard despesa com sign-flip (subir é ruim) ────────── */
export const KpiCardSignFlip: Story = () => (
  <div className="grid gap-3 p-6 max-w-xs">
    <KpiCard>
      <KpiCard.Header label="Despesa · Mai" delta={4} invertSign />
      <KpiCard.Value>R$ 86.230</KpiCard.Value>
      <KpiCard.Sparkline data={[14, 18, 16, 20, 18, 24, 20, 22, 26]} tone="destructive" dashed />
      <KpiCard.Footer>vs. R$ 83.020 · abr</KpiCard.Footer>
    </KpiCard>
    <p className="text-mini text-muted-foreground">
      `invertSign` faz "subir = vermelho". Sem isso, +4% pintaria verde — bug de UX para despesa.
    </p>
  </div>
);

/* ── KpiCard clicável (asLink) ───────────────────────────── */
export const KpiCardAsLink: Story = () => (
  <div className="grid gap-3 p-6 max-w-xs">
    <KpiCard asLink="#" tone="brand">
      <KpiCard.Header label="Confirmação" icon={TrendingUp} />
      <KpiCard.Value>24</KpiCard.Value>
      <KpiCard.Footer>R$ 178.300 · ativa</KpiCard.Footer>
    </KpiCard>
  </div>
);

/* ── Density variations ──────────────────────────────────── */
export const Densities: Story = () => (
  <div className="grid grid-cols-3 gap-3 p-6">
    <KpiCard density="compact">
      <KpiCard.Header label="compact" />
      <KpiCard.Value>123</KpiCard.Value>
    </KpiCard>
    <KpiCard density="default">
      <KpiCard.Header label="default" />
      <KpiCard.Value>123</KpiCard.Value>
    </KpiCard>
    <KpiCard density="comfortable">
      <KpiCard.Header label="comfortable" />
      <KpiCard.Value>123</KpiCard.Value>
    </KpiCard>
  </div>
);
