import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: 'Ativo', className: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20' },
  prospeccao: { label: 'Prospecção', className: 'bg-primary/10 text-primary border-primary/20' },
  inativo: { label: 'Inativo', className: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20' },
  bloqueado: { label: 'Bloqueado', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function ProducerStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.ativo;
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

export function HealthScoreBadge({ score }: { score: number | null }) {
  const s = score ?? 5;
  const color = s >= 7
    ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20'
    : s >= 4
    ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20'
    : 'bg-destructive/10 text-destructive border-destructive/20';

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', color)}>
      {s.toFixed(1)}
    </Badge>
  );
}

export function PapelBadge({ papel }: { papel: string }) {
  const labels: Record<string, string> = {
    contratante: 'Contratante',
    intermediador: 'Intermediador',
    promoter: 'Promoter',
    agencia: 'Agência',
    parceiro_estrategico: 'Parceiro',
    produtor_executivo: 'Prod. Executivo',
    responsavel_financeiro: 'Resp. Financeiro',
  };
  return (
    <Badge variant="secondary" className="text-xs">
      {labels[papel] ?? papel}
    </Badge>
  );
}
