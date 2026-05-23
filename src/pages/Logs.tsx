import { Card, CardContent } from '@/components/ui/card';
import { ScrollText, Filter as FilterIcon, RefreshCw, Plus, Pencil, Trash2, LogIn, Download, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/states';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { EditorialHero } from '@/components/ui/EditorialHero';

type ActionFilter = 'todas' | 'create' | 'update' | 'delete' | 'login' | 'export' | 'permission';

const actionMeta: Record<string, { Icon: typeof Plus; cls: string; label: string }> = {
  create: { Icon: Plus, cls: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/12 border-[hsl(var(--success))]/30', label: 'Criação' },
  update: { Icon: Pencil, cls: 'text-info bg-info/12 border-info/30', label: 'Edição' },
  delete: { Icon: Trash2, cls: 'text-destructive bg-destructive/12 border-destructive/30', label: 'Exclusão' },
  login: { Icon: LogIn, cls: 'text-[hsl(270_70%_65%)] bg-[hsl(270_70%_65%)]/12 border-[hsl(270_70%_65%)]/30', label: 'Login' },
  export: { Icon: Download, cls: 'text-primary bg-primary/12 border-primary/30', label: 'Export' },
  permission: { Icon: Shield, cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/12 border-[hsl(var(--warning))]/30', label: 'Permissão' },
};

function actionKeyFor(action: string): keyof typeof actionMeta {
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('insert') || a.includes('criar')) return 'create';
  if (a.includes('update') || a.includes('edit') || a.includes('atualiz')) return 'update';
  if (a.includes('delete') || a.includes('remove') || a.includes('excluir')) return 'delete';
  if (a.includes('login') || a.includes('signin') || a.includes('auth')) return 'login';
  if (a.includes('export') || a.includes('download')) return 'export';
  if (a.includes('permission') || a.includes('role') || a.includes('grant')) return 'permission';
  return 'update';
}

export default function Logs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('todas');

  const { data: logs = [], isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000, // light auto-refresh every 30s
  });

  const visible = useMemo(() => {
    return logs.filter((l: any) => {
      const key = actionKeyFor(l.action);
      if (actionFilter !== 'todas' && key !== actionFilter) return false;
      if (search.trim()) {
        const needle = search.toLowerCase();
        const hay = `${l.action} ${l.entity_type ?? ''} ${l.entity_id ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [logs, actionFilter, search]);

  const ChipBtn = ({ value, label }: { value: ActionFilter; label: string }) => {
    const active = actionFilter === value;
    return (
      <button
        type="button"
        onClick={() => setActionFilter(value)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-mini font-medium transition-colors',
          active
            ? 'bg-primary/15 text-primary border-primary/40'
            : 'border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="LOGS"
        size="lg"
        accentHueA="hsl(var(--info))"
        accentHueB="hsl(var(--slate))"
        status={[
          { label: 'STREAM · LIVE', tone: 'live' },
          { label: '▸ últimas 100', tone: 'muted' },
          { label: '◆ refresh 30s', tone: 'muted' },
        ]}
        subtitle={
          <p className="font-mono uppercase tracking-[0.14em] text-mini">
            histórico de ações do sistema · audit trail
          </p>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['audit-logs'] })}
            disabled={isFetching}
            className="h-9 gap-2 backdrop-blur-sm bg-background/60"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Atualizar
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Input
            placeholder="Buscar ação, tabela ou ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          <ChipBtn value="todas" label="Todas" />
          <ChipBtn value="create" label="Criação" />
          <ChipBtn value="update" label="Edição" />
          <ChipBtn value="delete" label="Exclusão" />
          <ChipBtn value="login" label="Login" />
          <ChipBtn value="export" label="Export" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="glass-card animate-pulse h-14" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhum log encontrado"
          description={
            logs.length === 0
              ? 'Ações do sistema aparecerão aqui automaticamente.'
              : 'Tente ajustar os filtros ou a busca.'
          }
        />
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="divide-y divide-border/40">
            {visible.map((log: any) => {
              const key = actionKeyFor(log.action);
              const meta = actionMeta[key];
              const Icon = meta.Icon;
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-micro font-medium flex-shrink-0 w-[88px] justify-center',
                      meta.cls,
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.action}</p>
                    <p className="text-mini text-muted-foreground truncate font-mono">
                      {log.entity_type ?? '—'}
                      {log.entity_id && <> · {log.entity_id.slice(0, 8)}…</>}
                    </p>
                  </div>
                  <span
                    className="text-mini text-muted-foreground tabular-nums flex-shrink-0 text-right"
                    title={format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  >
                    <span className="block">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}</span>
                    <span className="block opacity-60">{format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
