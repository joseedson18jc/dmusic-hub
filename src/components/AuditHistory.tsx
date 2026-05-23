import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface AuditHistoryProps {
  entityType: 'bookings' | 'contracts' | 'financial_records';
  entityId: string;
  trigger?: React.ReactNode;
  title?: string;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  created_at: string;
  details: {
    op: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    ts: string;
  } | null;
}

const FIELD_LABELS: Record<string, string> = {
  // bookings
  titulo: 'Título', status: 'Status', evento_nome: 'Nome do evento', evento_tipo: 'Tipo de evento',
  data_evento: 'Data', hora_inicio: 'Início', hora_fim: 'Fim', venue: 'Local', cidade: 'Cidade',
  pais: 'País', fee_acordado: 'Cachê', custo_total: 'Custo total', comissao: 'Comissão',
  valor_liquido: 'Valor líquido', sinal: 'Sinal', saldo: 'Saldo', status_pagamento: 'Status pagamento',
  dj_id: 'DJ', producer_id: 'Produtor', evento_status: 'Status do evento',
  prioridade_comercial: 'Prioridade', proximo_passo: 'Próximo passo', motivo_perda: 'Motivo perda',
  notas_internas: 'Notas internas', briefing_musical: 'Briefing musical',
  // contracts
  template_name: 'Modelo', version: 'Versão', html_content: 'Conteúdo HTML',
  form_data: 'Dados do formulário', file_url: 'Link do arquivo',
  // financial
  tipo: 'Tipo', categoria: 'Categoria', descricao: 'Descrição', valor_bruto: 'Valor bruto',
  metodo_pagamento: 'Método', data_vencimento: 'Vencimento', data_pagamento: 'Pagamento',
  moeda: 'Moeda', centro_custo: 'Centro de custo',
};

const labelFor = (key: string) => FIELD_LABELS[key] ?? key;

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80);
  const s = String(v);
  return s.length > 80 ? s.slice(0, 80) + '…' : s;
};

const actionMeta = (action: string) => {
  switch (action) {
    case 'create': return { label: 'Criação', icon: Plus, color: 'bg-success/10 text-success border-success/30' };
    case 'update': return { label: 'Edição', icon: Pencil, color: 'bg-info/10 text-info border-info/30' };
    case 'delete': return { label: 'Exclusão', icon: Trash2, color: 'bg-destructive/10 text-destructive border-destructive/30' };
    default: return { label: action, icon: Pencil, color: 'bg-muted text-muted-foreground border-border' };
  }
};

export function AuditHistory({ entityType, entityId, trigger, title = 'Histórico de mudanças' }: AuditHistoryProps) {
  const [open, setOpen] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, entityId],
    enabled: open && !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, user_id, action, created_at, details')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });

  const userIds = Array.from(new Set((logs ?? []).map(l => l.user_id).filter(Boolean))) as string[];

  const { data: profiles } = useQuery({
    queryKey: ['audit-profiles', userIds.sort().join(',')],
    enabled: open && userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      return Object.fromEntries((data ?? []).map(p => [p.user_id, p.full_name ?? 'Usuário']));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex">{trigger}</span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
          <History className="h-4 w-4" />
          Histórico
        </Button>
      )}
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-accent" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Registro automático de criação, edições e exclusões com antes/depois.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !logs?.length ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma alteração registrada ainda.
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {logs.map((log) => {
                const meta = actionMeta(log.action);
                const Icon = meta.icon;
                const userName = log.user_id ? (profiles?.[log.user_id] ?? 'Usuário') : 'Sistema';
                const after = log.details?.after ?? {};
                const before = log.details?.before ?? {};
                const changedKeys = Object.keys(after);

                return (
                  <div key={log.id} className="glass-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`${meta.color} gap-1.5`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                        <span className="text-sm font-medium">{userName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {log.action === 'update' && changedKeys.length > 0 && (
                      <div className="space-y-1.5 text-sm">
                        {changedKeys.slice(0, 12).map((key) => (
                          <div key={key} className="grid grid-cols-[140px_1fr] gap-2 items-start">
                            <span className="text-xs text-muted-foreground font-medium pt-0.5">
                              {labelFor(key)}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive/90 line-through">
                                {formatValue(before[key])}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="px-2 py-0.5 rounded bg-success/10 text-success">
                                {formatValue(after[key])}
                              </span>
                            </div>
                          </div>
                        ))}
                        {changedKeys.length > 12 && (
                          <p className="text-xs text-muted-foreground italic">
                            +{changedKeys.length - 12} campo(s) adicional(is)
                          </p>
                        )}
                      </div>
                    )}

                    {log.action === 'create' && (
                      <p className="text-xs text-muted-foreground">Registro criado.</p>
                    )}
                    {log.action === 'delete' && (
                      <p className="text-xs text-muted-foreground">Registro excluído.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}