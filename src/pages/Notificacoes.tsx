import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bell,
  Check,
  CheckCheck,
  Inbox,
  FileSignature,
  CreditCard,
  CalendarCheck,
  AlertTriangle,
  MessageCircle,
  Filter as FilterIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState } from '@/components/states';
import { cn } from '@/lib/utils';
import { EditorialHero } from '@/components/ui/EditorialHero';

type FilterType = 'todas' | 'nao_lidas' | 'hoje';

const typeIcon: Record<string, { Icon: typeof Bell; color: string }> = {
  contrato: { Icon: FileSignature, color: 'text-info bg-info/10 border-info/20' },
  pagamento: { Icon: CreditCard, color: 'text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20' },
  booking: { Icon: CalendarCheck, color: 'text-primary bg-primary/10 border-primary/20' },
  alerta: { Icon: AlertTriangle, color: 'text-destructive bg-destructive/10 border-destructive/20' },
  mensagem: { Icon: MessageCircle, color: 'text-[hsl(var(--violet,270_70%_65%))] bg-[hsl(270_70%_65%)]/10 border-[hsl(270_70%_65%)]/20' },
  default: { Icon: Bell, color: 'text-muted-foreground bg-muted/40 border-border' },
};

export default function Notificacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('todas');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ lida: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from('notifications').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter((n: any) => !n.lida).length;

  const visible = useMemo(() => {
    if (filter === 'nao_lidas') return notifications.filter((n: any) => !n.lida);
    if (filter === 'hoje') {
      const today = new Date().toISOString().slice(0, 10);
      return notifications.filter((n: any) => n.created_at.startsWith(today));
    }
    return notifications;
  }, [notifications, filter]);

  // Group by day
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    visible.forEach((n: any) => {
      const day = n.created_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(n);
    });
    return Array.from(map.entries());
  }, [visible]);

  const FilterChip = ({ value, label, badge }: { value: FilterType; label: string; badge?: number }) => {
    const active = filter === value;
    return (
      <button
        type="button"
        onClick={() => setFilter(value)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors',
          active
            ? 'bg-primary/15 text-primary border-primary/40'
            : 'border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
        )}
      >
        {label}
        {badge !== undefined && badge > 0 && (
          <span
            className={cn(
              'tabular-nums px-1 rounded text-micro',
              active ? 'bg-primary/20' : 'bg-muted',
            )}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="NOTIFICAÇÕES"
        accentHueA="hsl(var(--warning))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'INBOX · LIVE', tone: 'live' },
          { label: `▸ ${notifications.length} total`, tone: 'muted' },
          ...(unread > 0
            ? [{ label: `◆ ${unread} não lida${unread > 1 ? 's' : ''}`, tone: 'warn' as const }]
            : []),
        ]}
        subtitle={
          <p className="font-mono uppercase tracking-[0.14em] text-mini">
            {unread > 0 ? `${unread} requer${unread > 1 ? 'em' : ''} atenção` : 'tudo em dia · zero pendências'}
          </p>
        }
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-9 gap-2 backdrop-blur-sm bg-background/60"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas como lidas
            </Button>
          ) : null
        }
      />

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <FilterChip value="todas" label="Todas" badge={notifications.length} />
        <FilterChip value="nao_lidas" label="Não lidas" badge={unread} />
        <FilterChip value="hoje" label="Hoje" />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card animate-pulse h-20" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
          description={
            filter === 'nao_lidas'
              ? 'Você está em dia. Notificações novas aparecerão aqui.'
              : 'Notificações aparecerão aqui conforme eventos ocorrem no sistema.'
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map(([day, items]) => {
            const dayDate = new Date(day + 'T12:00:00');
            const isToday = day === new Date().toISOString().slice(0, 10);
            return (
              <div key={day} className="space-y-2">
                {/* Day header */}
                <div className="flex items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1">
                  <h3 className="text-mini font-semibold uppercase tracking-wider text-muted-foreground">
                    {isToday ? 'Hoje' : format(dayDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-mini text-muted-foreground tabular-nums">{items.length}</span>
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  {items.map((n: any) => {
                    const meta = typeIcon[n.tipo as keyof typeof typeIcon] ?? typeIcon.default;
                    const Icon = meta.Icon;
                    return (
                      <Card
                        key={n.id}
                        className={cn(
                          'transition-all border-border/40',
                          !n.lida && 'border-l-2 border-l-primary bg-primary/[0.03]',
                        )}
                      >
                        <CardContent className="flex items-start gap-3 p-3.5">
                          <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border', meta.color)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn('text-sm truncate', !n.lida ? 'font-semibold' : 'font-medium')}>
                                {n.titulo}
                              </p>
                              {!n.lida && (
                                <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                            {n.mensagem && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                {n.mensagem}
                              </p>
                            )}
                            <p className="text-micro text-muted-foreground/70 mt-1 tabular-nums">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                              {' · '}
                              {format(new Date(n.created_at), 'HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                          {!n.lida && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 flex-shrink-0"
                              onClick={() => markRead.mutate(n.id)}
                              aria-label="Marcar como lida"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
