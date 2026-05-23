import type { Story } from '@ladle/react';
import { StatusPill } from '@/components/StatusPill';
import { CheckCircle2, Send, AlertTriangle, Pencil } from 'lucide-react';

export default {
  title: 'Design System / StatusPill',
};

/* ── Pipeline / kanban family ────────────────────────────── */
export const Pipeline: Story = () => (
  <div className="flex flex-wrap gap-2 p-6">
    <StatusPill variant="lead">Lead</StatusPill>
    <StatusPill variant="negociacao">Em negociação</StatusPill>
    <StatusPill variant="confirmacao">Confirmação</StatusPill>
    <StatusPill variant="realizacao">Realização</StatusPill>
    <StatusPill variant="pos_evento">Pós-evento</StatusPill>
    <StatusPill variant="perdido">Perdido</StatusPill>
  </div>
);

/* ── Financial family ────────────────────────────────────── */
export const Financial: Story = () => (
  <div className="flex flex-wrap gap-2 p-6">
    <StatusPill variant="pago" icon={<CheckCircle2 className="h-2.5 w-2.5" />}>
      Pago
    </StatusPill>
    <StatusPill variant="pendente">Pendente</StatusPill>
    <StatusPill variant="vencido" icon={<AlertTriangle className="h-2.5 w-2.5" />}>
      Vencido
    </StatusPill>
    <StatusPill variant="parcial">Parcial</StatusPill>
    <StatusPill variant="cancelado">Cancelado</StatusPill>
  </div>
);

/* ── DJ / Producer / Contract families ───────────────────── */
export const Entities: Story = () => (
  <div className="flex flex-col gap-4 p-6">
    <section>
      <h3 className="text-mini uppercase tracking-wider text-muted-foreground mb-2">DJ</h3>
      <div className="flex flex-wrap gap-2">
        <StatusPill variant="ativo">Disponível</StatusPill>
        <StatusPill variant="pausa">Em estúdio</StatusPill>
        <StatusPill variant="indisponivel">Em turnê</StatusPill>
        <StatusPill variant="vip">VIP</StatusPill>
      </div>
    </section>
    <section>
      <h3 className="text-mini uppercase tracking-wider text-muted-foreground mb-2">Produtor</h3>
      <div className="flex flex-wrap gap-2">
        <StatusPill variant="ativo">Ativo</StatusPill>
        <StatusPill variant="prospeccao">Prospecção</StatusPill>
        <StatusPill variant="inativo">Inativo</StatusPill>
        <StatusPill variant="bloqueado">Bloqueado</StatusPill>
      </div>
    </section>
    <section>
      <h3 className="text-mini uppercase tracking-wider text-muted-foreground mb-2">Contrato</h3>
      <div className="flex flex-wrap gap-2">
        <StatusPill variant="rascunho">Rascunho</StatusPill>
        <StatusPill variant="enviado" icon={<Send className="h-2.5 w-2.5" />}>
          Enviado
        </StatusPill>
        <StatusPill variant="assinado">Assinado</StatusPill>
        <StatusPill variant="expirado">Expirado</StatusPill>
      </div>
    </section>
  </div>
);

/* ── Sizes ───────────────────────────────────────────────── */
export const Sizes: Story = () => (
  <div className="flex items-center gap-3 p-6">
    <StatusPill variant="confirmacao" size="sm">small</StatusPill>
    <StatusPill variant="confirmacao" size="md">medium</StatusPill>
    <StatusPill variant="confirmacao" size="lg">large</StatusPill>
  </div>
);

/* ── Pulse (live indicator) ──────────────────────────────── */
export const Pulse: Story = () => (
  <div className="flex flex-wrap gap-2 p-6">
    <StatusPill variant="ativo" pulse>
      Ao vivo
    </StatusPill>
    <StatusPill variant="vencido" pulse>
      Vencido há 12 dias
    </StatusPill>
  </div>
);

/* ── Interactive (P2.3) ──────────────────────────────────── */
export const Interactive: Story = () => (
  <div className="flex flex-wrap gap-2 p-6">
    <StatusPill
      variant="confirmacao"
      interactive
      onClick={() => alert('Filtrar por Confirmação')}
    >
      Confirmação
    </StatusPill>
    <StatusPill
      variant="pago"
      interactive
      icon={<CheckCircle2 className="h-2.5 w-2.5" />}
      onClick={() => alert('Filtrar pagos')}
    >
      Pago
    </StatusPill>
    <StatusPill variant="vencido" interactive onClick={() => alert('Filtrar vencidos')}>
      Vencido
    </StatusPill>
    <p className="text-mini text-muted-foreground w-full mt-2">
      Tente Tab + Enter/Espaço — cada pill é keyboard-accessible.
    </p>
  </div>
);

/* ── With icons ──────────────────────────────────────────── */
export const WithIcons: Story = () => (
  <div className="flex flex-wrap gap-2 p-6">
    <StatusPill variant="rascunho" icon={<Pencil className="h-2.5 w-2.5" />}>
      Rascunho
    </StatusPill>
    <StatusPill variant="enviado" icon={<Send className="h-2.5 w-2.5" />}>
      Enviado
    </StatusPill>
    <StatusPill variant="pago" icon={<CheckCircle2 className="h-2.5 w-2.5" />}>
      Pago
    </StatusPill>
    <StatusPill variant="vencido" icon={<AlertTriangle className="h-2.5 w-2.5" />}>
      Vencido
    </StatusPill>
  </div>
);

/* ── All 23 variants (visual reference) ──────────────────── */
export const AllVariants: Story = () => {
  const families: { name: string; variants: any[] }[] = [
    {
      name: 'Pipeline (6)',
      variants: ['lead', 'negociacao', 'confirmacao', 'realizacao', 'pos_evento', 'perdido'],
    },
    { name: 'Financeiro (5)', variants: ['pago', 'pendente', 'vencido', 'parcial', 'cancelado'] },
    { name: 'DJ (4)', variants: ['ativo', 'pausa', 'indisponivel', 'vip'] },
    { name: 'Produtor (3)', variants: ['prospeccao', 'inativo', 'bloqueado'] },
    { name: 'Contrato (5)', variants: ['rascunho', 'enviado', 'aberto', 'assinado', 'expirado'] },
    { name: 'Fallback (1)', variants: ['neutral'] },
  ];

  return (
    <div className="flex flex-col gap-5 p-6">
      {families.map((f) => (
        <section key={f.name}>
          <h3 className="text-mini uppercase tracking-wider text-muted-foreground mb-2">
            {f.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {f.variants.map((v) => (
              <StatusPill key={v} variant={v}>
                {v}
              </StatusPill>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
