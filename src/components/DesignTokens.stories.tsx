import type { Story } from '@ladle/react';

export default {
  title: 'Design System / DesignTokens',
};

/* ── Paleta completa de cores semânticas ─────────────────── */
const colors: { name: string; token: string; usage: string }[] = [
  { name: 'background',  token: '--background',  usage: 'fundo da app (cyber dark)' },
  { name: 'foreground',  token: '--foreground',  usage: 'texto primário' },
  { name: 'card',        token: '--card',        usage: 'fundo de cards' },
  { name: 'muted',       token: '--muted',       usage: 'fundo neutro (skeleton, tracks)' },
  { name: 'border',      token: '--border',      usage: 'borda decorativa' },
  { name: 'primary',     token: '--primary',     usage: 'brand (laranja) — ações principais' },
  { name: 'accent',      token: '--accent',      usage: 'azul (antigo brand) — agora info-secundário' },
  { name: 'success',     token: '--success',     usage: 'verde — pago, ok, confirmado' },
  { name: 'warning',     token: '--warning',     usage: 'âmbar — pendente, negociação' },
  { name: 'destructive', token: '--destructive', usage: 'vermelho — vencido, perdido, erro' },
  { name: 'info',        token: '--info',        usage: 'azul — informativo, parcial' },
  { name: 'violet',      token: '--violet',      usage: 'roxo — fase realização' },
  { name: 'slate',       token: '--slate',       usage: 'cinza-azulado — neutral, lead, inativo' },
  { name: 'magenta',     token: '--magenta',     usage: 'rosa — acento decorativo (top-DJ winner)' },
];

export const Paleta: Story = () => (
  <div className="p-6 space-y-3 max-w-3xl">
    <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
      Paleta semântica
    </h2>
    <p className="text-mini text-muted-foreground">
      Tokens HSL definidos em <code>src/index.css</code> e expostos como classes
      Tailwind via <code>tailwind.config.ts</code>. Use sempre via token, nunca hex.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
      {colors.map((c) => (
        <div
          key={c.name}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
        >
          <div
            className="h-10 w-10 rounded shrink-0"
            style={{ background: `hsl(var(${c.token}))` }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{c.name}</p>
            <p className="text-mini font-mono text-muted-foreground">{c.token}</p>
            <p className="text-mini text-muted-foreground mt-0.5">{c.usage}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Typography scale (incluindo micro-tokens da P2.1) ───── */
export const Typography: Story = () => (
  <div className="p-6 space-y-4 max-w-3xl">
    <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
      Typography scale
    </h2>
    <p className="text-mini text-muted-foreground">
      A escala inclui tokens micro (formalizados na P2.1) entre 9–11px e display sizes acima de 24px,
      complementando os padrões do Tailwind.
    </p>

    <div className="space-y-2 border border-border rounded-lg p-4 bg-card">
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-display-md</span>
        <span className="text-display-md font-semibold tracking-tight">28 px · Hero h1</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-display-sm</span>
        <span className="text-display-sm font-semibold tracking-tight">26 px · KPI value</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-2xl (Tailwind)</span>
        <span className="text-2xl">24 px · Section title</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-base (Tailwind)</span>
        <span className="text-base">16 px · Body</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-sm (Tailwind)</span>
        <span className="text-sm">14 px · Body small</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-xs (Tailwind)</span>
        <span className="text-xs">12 px · Caption</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-mini</span>
        <span className="text-mini">11 px · KPI label / metadata</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-micro</span>
        <span className="text-micro">10 px · Status chip label</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-mini font-mono text-muted-foreground w-32 shrink-0">text-nano</span>
        <span className="text-nano">9 px · Super-micro (axis tick)</span>
      </div>
    </div>
  </div>
);

/* ── Phase palette (5 phases + lost) ─────────────────────── */
export const PipelinePhases: Story = () => {
  const phases = [
    { key: 'lead',   label: 'Lead',          token: '--slate',   text: '--lead-text' },
    { key: 'negoc',  label: 'Negociação',    token: '--warning', text: '--warning-text' },
    { key: 'conf',   label: 'Confirmação',   token: '--primary', text: '--primary-text' },
    { key: 'realiz', label: 'Realização',    token: '--violet',  text: '--violet-text' },
    { key: 'pos',    label: 'Pós-evento',    token: '--success', text: '--success-foreground' },
    { key: 'lost',   label: 'Perdido',       token: '--destructive', text: '--destructive-text' },
  ];

  return (
    <div className="p-6 space-y-3 max-w-3xl">
      <h2 className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Geist, Inter, sans-serif' }}>
        Pipeline phases · 17 status agrupados em 5+1 fases
      </h2>
      <p className="text-mini text-muted-foreground">
        Cada fase tem hue distinto via tokens em <code>bookingPhases.ts</code>.
        Documentação completa em <code>src/lib/bookingPhases.README.md</code>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        {phases.map((p) => (
          <div
            key={p.key}
            className="p-4 rounded-lg border"
            style={{
              background: `hsl(var(${p.token}) / 0.14)`,
              borderColor: `hsl(var(${p.token}) / 0.35)`,
            }}
          >
            <p className="text-mini uppercase tracking-wider opacity-80 font-mono" style={{ color: `hsl(var(${p.text}))` }}>
              {p.key}
            </p>
            <p className="text-2xl font-semibold tracking-tight mt-1" style={{ color: `hsl(var(${p.text}))` }}>
              {p.label}
            </p>
            <p className="text-mini font-mono opacity-70 mt-0.5">{p.token}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
