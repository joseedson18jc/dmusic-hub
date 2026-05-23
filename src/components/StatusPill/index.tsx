import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * StatusPill — único componente para exibir status semânticos em todo o app.
 *
 * Substitui:
 *  - components/bookings/BookingBadges.tsx (mapeamento de 17 status com opacity ramps no mesmo verde)
 *  - badges inline em pages/Financeiro.tsx, pages/Tarefas.tsx, pages/Contratos.tsx,
 *    pages/Cobrancas.tsx, pages/Bookings.tsx
 *  - badges manuais em DJs.tsx (com label EN/PT misturado)
 *
 * Cada `variant` tem hue distinto (não opacity ramp). Mapeamento canônico:
 *
 *  Pipeline de bookings (5 fases agrupando os 17 status):
 *    - "lead"        slate       — novo_lead, qualificado, briefing_recebido
 *    - "negociacao"  warning     — proposta_enviada, negociacao, aguardando_aprovacao
 *    - "confirmacao" brand       — contrato_enviado, assinatura_pendente, sinal_pendente
 *    - "realizacao"  violet      — planejamento, pronto_para_evento, em_realizacao, evento_realizado
 *    - "pos_evento"  success     — pagto_pendente, repasse_pendente, fechado_ganho
 *    - "perdido"     destructive — fechado_perdido, cancelado
 *
 *  Status financeiro (pagamento):
 *    - "pago"     success
 *    - "pendente" warning
 *    - "vencido"  destructive
 *    - "parcial"  info (azul)
 *    - "cancelado" slate
 *
 *  Status DJ / produtor / contrato: ver variants abaixo.
 *
 * IMPORTANTE: este componente é puramente visual. O label e o `variant` ficam
 * a cargo do consumidor — o mapeamento status_db → variant + label vive nos
 * helpers exportados no final deste arquivo.
 */
const statusPillVariants = cva(
  'inline-flex items-center gap-1 rounded-full text-mini leading-tight border whitespace-nowrap font-medium transition-colors',
  {
    variants: {
      variant: {
        // Pipeline / kanban (bookings)
        lead:        'bg-slate/15 text-slate border-slate/40',
        negociacao:  'bg-warning/15 text-warning border-warning/40',
        confirmacao: 'bg-brand/15 text-brand border-brand/45',
        realizacao:  'bg-violet/15 text-violet border-violet/40',
        pos_evento:  'bg-success/15 text-success border-success/40',
        perdido:     'bg-destructive/15 text-destructive border-destructive/40',

        // Financeiro / cobrança
        pago:      'bg-success/15 text-success border-success/40',
        pendente:  'bg-warning/15 text-warning border-warning/40',
        vencido:   'bg-destructive/15 text-destructive border-destructive/40',
        parcial:   'bg-info/15 text-info border-info/40',
        cancelado: 'bg-slate/15 text-slate border-slate/40',

        // DJ status
        ativo:        'bg-success/15 text-success border-success/40',
        pausa:        'bg-warning/15 text-warning border-warning/40',
        indisponivel: 'bg-info/15 text-info border-info/40',
        vip:          'bg-brand/15 text-brand border-brand/45',

        // Produtor (extras não cobertos acima)
        prospeccao: 'bg-info/15 text-info border-info/40',
        inativo:    'bg-slate/15 text-slate border-slate/40',
        bloqueado:  'bg-destructive/15 text-destructive border-destructive/40',

        // Contrato
        rascunho: 'bg-slate/15 text-slate border-slate/40',
        enviado:  'bg-info/15 text-info border-info/40',
        aberto:   'bg-warning/15 text-warning border-warning/40',
        assinado: 'bg-success/15 text-success border-success/40',
        expirado: 'bg-destructive/15 text-destructive border-destructive/40',

        // Genérico (fallback)
        neutral: 'bg-muted/40 text-muted-foreground border-border',
      },
      size: {
        sm: 'px-1.5 py-0 text-micro',
        md: 'px-2 py-0.5 text-mini',
        lg: 'px-2.5 py-1 text-xs',
      },
      pulse: {
        true: 'before:content-[\'\'] before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:mr-0.5 before:animate-pulse',
        false: '',
      },
      /**
       * `interactive` aplica afordâncias de clicabilidade sem precisar envolver
       * o pill num <button>. Use quando o pill em si dispara navegação ou ação.
       *
       * O componente continua renderizando <span> por default — o consumer pode
       * passar `role="button"` + `tabIndex={0}` + `onKeyDown` se quiser
       * acessibilidade por teclado completa. (Ou simplesmente envolver em
       * <button>, que é o caminho mais seguro.)
       */
      interactive: {
        true: 'cursor-pointer hover:brightness-110 active:brightness-95 transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'lead',
      size: 'md',
      pulse: false,
      interactive: false,
    },
  },
);

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  /** Texto exibido. Não passe enum cru (ex.: "novo_lead"); use os helpers `*StatusToPill`. */
  children: React.ReactNode;
  /** Ícone opcional à esquerda do label (recomendado: 12x12). */
  icon?: React.ReactNode;
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className, variant, size, pulse, interactive, icon, children, onClick, onKeyDown, ...props }, ref) => {
    // Se interactive=true, garantimos affordance de teclado por default
    // (Enter + Espaço disparam onClick), tabIndex e role=button. Consumer pode
    // sobrescrever via props se quiser comportamento custom.
    const computedRole = interactive ? (props.role ?? 'button') : props.role;
    const computedTabIndex = interactive ? (props.tabIndex ?? 0) : props.tabIndex;
    const handleKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = (e) => {
      if (interactive && (e.key === 'Enter' || e.key === ' ') && onClick) {
        e.preventDefault();
        // Cast pra qualquer evento — onClick aceita MouseEvent, mas precisamos
        // disparar do KeyboardEvent. React typing aceita o cast porque ambos
        // são SyntheticEvent.
        onClick(e as unknown as React.MouseEvent<HTMLSpanElement>);
      }
      onKeyDown?.(e);
    };

    return (
    <span
      ref={ref}
      className={cn(statusPillVariants({ variant, size, pulse, interactive }), className)}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : onKeyDown}
      role={computedRole}
      tabIndex={computedTabIndex}
      {...props}
    >
      {icon ? <span className="shrink-0 inline-flex">{icon}</span> : null}
      {children}
    </span>
    );
  },
);
StatusPill.displayName = 'StatusPill';

export { statusPillVariants };

/* ─────────────────────────────────────────────────────────────
 * Helper: mapeia o enum cru do banco para o par {variant, label}.
 * Mantenha sincronizado com supabase migrations + types.ts.
 * ───────────────────────────────────────────────────────────── */
export type BookingStatus =
  | 'novo_lead' | 'qualificado' | 'briefing_recebido'
  | 'proposta_enviada' | 'negociacao' | 'aguardando_aprovacao'
  | 'contrato_enviado' | 'assinatura_pendente' | 'sinal_pendente'
  | 'confirmado'
  | 'planejamento' | 'pronto_para_evento' | 'em_realizacao' | 'evento_realizado'
  | 'pagamento_final_pendente' | 'repasse_pendente' | 'fechado_ganho'
  | 'fechado_perdido' | 'cancelado';

type Variant = NonNullable<VariantProps<typeof statusPillVariants>['variant']>;

const BOOKING_STATUS_MAP: Record<BookingStatus, { variant: Variant; label: string }> = {
  novo_lead:                { variant: 'lead',        label: 'Possível evento' },
  qualificado:              { variant: 'lead',        label: 'Qualificado' },
  briefing_recebido:        { variant: 'lead',        label: 'Briefing' },
  proposta_enviada:         { variant: 'negociacao',  label: 'Proposta enviada' },
  negociacao:               { variant: 'negociacao',  label: 'Em negociação' },
  aguardando_aprovacao:     { variant: 'negociacao',  label: 'Aguardando aprovação' },
  contrato_enviado:         { variant: 'confirmacao', label: 'Contrato enviado' },
  assinatura_pendente:      { variant: 'confirmacao', label: 'Aguardando assinatura' },
  sinal_pendente:           { variant: 'confirmacao', label: 'Sinal pendente' },
  confirmado:               { variant: 'confirmacao', label: 'Confirmado' },
  planejamento:             { variant: 'realizacao',  label: 'Planejamento' },
  pronto_para_evento:       { variant: 'realizacao',  label: 'Pronto' },
  em_realizacao:            { variant: 'realizacao',  label: 'Em realização' },
  evento_realizado:         { variant: 'realizacao',  label: 'Evento realizado' },
  pagamento_final_pendente: { variant: 'pos_evento',  label: 'Pagto. final pendente' },
  repasse_pendente:         { variant: 'pos_evento',  label: 'Repasse pendente' },
  fechado_ganho:            { variant: 'pos_evento',  label: 'Fechado ✓' },
  fechado_perdido:          { variant: 'perdido',     label: 'Perdido' },
  cancelado:                { variant: 'perdido',     label: 'Cancelado' },
};

export function bookingStatusToPill(status: string) {
  return BOOKING_STATUS_MAP[status as BookingStatus] ?? { variant: 'neutral' as const, label: status };
}

/* Status financeiro mapeado para as variants. */
export type FinancialStatus =
  | 'pago' | 'pendente' | 'vencido' | 'parcial' | 'cancelado'
  | 'em_disputa' | 'reembolsado' | 'falhou';

export function financialStatusToPill(status: string): { variant: Variant; label: string } {
  switch (status) {
    case 'pago':        return { variant: 'pago',      label: 'Pago' };
    case 'pendente':    return { variant: 'pendente',  label: 'Pendente' };
    case 'vencido':     return { variant: 'vencido',   label: 'Vencido' };
    case 'parcial':     return { variant: 'parcial',   label: 'Parcial' };
    case 'cancelado':   return { variant: 'cancelado', label: 'Cancelado' };
    case 'em_disputa':  return { variant: 'vencido',   label: 'Em disputa' };
    case 'reembolsado': return { variant: 'cancelado', label: 'Reembolsado' };
    case 'falhou':      return { variant: 'vencido',   label: 'Falhou' };
    default:            return { variant: 'neutral',   label: status };
  }
}

/* Status de contrato mapeado para as variants. */
export function contractStatusToPill(status: string): { variant: Variant; label: string } {
  switch (status) {
    case 'rascunho': return { variant: 'rascunho', label: 'Rascunho' };
    case 'enviado':  return { variant: 'enviado',  label: 'Enviado' };
    case 'aberto':   return { variant: 'aberto',   label: 'Aberto' };
    case 'assinado': return { variant: 'assinado', label: 'Assinado' };
    case 'expirado': return { variant: 'expirado', label: 'Expirado' };
    case 'cancelado': return { variant: 'cancelado', label: 'Cancelado' };
    default:         return { variant: 'neutral',  label: status };
  }
}

/* Status de DJ. */
export function djStatusToPill(status: string): { variant: Variant; label: string } {
  switch (status) {
    case 'ativo':        return { variant: 'ativo',        label: 'Disponível' };
    case 'pausa':        return { variant: 'pausa',        label: 'Em estúdio' };
    case 'indisponivel': return { variant: 'indisponivel', label: 'Em turnê' };
    case 'vip':          return { variant: 'vip',          label: 'VIP' };
    default:             return { variant: 'neutral',      label: status };
  }
}

/* Status de produtor. */
export function producerStatusToPill(status: string): { variant: Variant; label: string } {
  switch (status) {
    case 'ativo':      return { variant: 'ativo',      label: 'Ativo' };
    case 'prospeccao': return { variant: 'prospeccao', label: 'Prospecção' };
    case 'inativo':    return { variant: 'inativo',    label: 'Inativo' };
    case 'bloqueado':  return { variant: 'bloqueado',  label: 'Bloqueado' };
    default:           return { variant: 'neutral',    label: status };
  }
}
