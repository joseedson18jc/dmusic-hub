import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  novo_lead: 'bg-muted text-muted-foreground',
  qualificado: 'bg-primary/10 text-primary border-primary/20',
  briefing_recebido: 'bg-primary/15 text-primary border-primary/25',
  proposta_enviada: 'bg-primary/20 text-primary border-primary/30',
  negociacao: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20',
  aguardando_aprovacao: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25',
  contrato_enviado: 'bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30',
  assinatura_pendente: 'bg-[hsl(var(--warning))]/25 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/35',
  sinal_pendente: 'bg-[hsl(var(--warning))]/30 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/40',
  confirmado: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20',
  planejamento: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/25',
  pronto_para_evento: 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
  evento_realizado: 'bg-[hsl(var(--success))]/25 text-[hsl(var(--success))] border-[hsl(var(--success))]/35',
  pagamento_final_pendente: 'bg-[hsl(var(--success))]/30 text-[hsl(var(--success))] border-[hsl(var(--success))]/40',
  repasse_pendente: 'bg-[hsl(var(--success))]/35 text-[hsl(var(--success))] border-[hsl(var(--success))]/45',
  fechado_ganho: 'bg-[hsl(var(--success))]/40 text-[hsl(var(--success))] border-[hsl(var(--success))]/50',
  fechado_perdido: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  novo_lead: 'Novo Lead',
  qualificado: 'Qualificado',
  briefing_recebido: 'Briefing',
  proposta_enviada: 'Proposta',
  negociacao: 'Negociação',
  aguardando_aprovacao: 'Aprovação',
  contrato_enviado: 'Contrato',
  assinatura_pendente: 'Assinatura',
  sinal_pendente: 'Sinal',
  confirmado: 'Confirmado',
  planejamento: 'Planejamento',
  pronto_para_evento: 'Pronto',
  evento_realizado: 'Realizado',
  pagamento_final_pendente: 'Pgto Final',
  repasse_pendente: 'Repasse',
  fechado_ganho: 'Ganho',
  fechado_perdido: 'Perdido',
};

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', statusStyles[status] ?? statusStyles.novo_lead)}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}

export function PriorityIndicator({ priority }: { priority?: string | null }) {
  const icon = priority === 'alta' ? '🔴' : priority === 'baixa' ? '🟢' : '🟡';
  return <span className="text-xs">{icon}</span>;
}
