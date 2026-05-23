import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle, CheckCircle2, Loader2, Unplug, RefreshCw, XCircle } from 'lucide-react';
import { useGoogleCalendarStatus, useGoogleCalendarAuth } from '@/hooks/useGoogleCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

export default function GoogleCalendarTab() {
  const { status, loading, refresh } = useGoogleCalendarStatus();
  const { connect, disconnect, loading: authLoading } = useGoogleCalendarAuth();
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    // Admins receive the full sanitized payload; non-admins never see error_message.
    const baseCols = 'id, action, success, google_event_id, timezone, http_status, created_at, booking_id';
    const cols = isAdmin ? `${baseCols}, error_message` : baseCols;
    const { data, error } = await (supabase as any)
      .from('google_calendar_sync_logs')
      .select(cols)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error) setLogs(data ?? []);
    setLogsLoading(false);
  }, [isAdmin]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleConnect = async () => {
    await connect();
    toast.info('Uma janela será aberta para autenticação com o Google.');
    // Refresh status after a delay to check if auth completed
    setTimeout(refresh, 5000);
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.success('Google Calendar desconectado.');
    refresh();
  };

  const successCount = logs.filter(l => l.success).length;
  const failCount = logs.length - successCount;

  // Generic, non-sensitive failure label for non-admin viewers
  const genericFailureLabel = (status?: number | null): string => {
    if (!status) return 'Falha de conexão';
    if (status === 401 || status === 403) return 'Falha de autorização';
    if (status === 404) return 'Recurso não encontrado';
    if (status === 408 || status === 429) return 'Limite/temporário, será reprocessado';
    if (status === 422) return 'Dados inválidos';
    if (status >= 500) return 'Erro do Google Calendar';
    return 'Falha na sincronização';
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-semibold">Google Calendar</h3>
              <p className="text-xs text-muted-foreground">Sincronização bidirecional com OAuth2</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status.connected ? (
              <>
                <Badge variant="outline" className="status-paid text-micro">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                </Badge>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Unplug className="h-3 w-3 mr-1" /> Desconectar
                </Button>
              </>
            ) : (
              <Button onClick={handleConnect} disabled={authLoading}>
                {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Conectar Conta Google
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Agendas Sincronizadas</h4>
            {['Agenda Master D.MUSIC', 'Agenda Financeira (vencimentos)', 'Agenda de Tarefas'].map((cal) => (
              <div key={cal} className="flex items-center justify-between p-2 rounded border border-border/50">
                <span className="text-sm">{cal}</span>
                <Switch checked={status.connected} disabled={!status.connected} />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Configurações</h4>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Criar evento ao confirmar booking</Label>
              <Switch defaultChecked disabled={!status.connected} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Atualizar ao mudar data/hora</Label>
              <Switch defaultChecked disabled={!status.connected} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Cancelar evento ao cancelar booking</Label>
              <Switch defaultChecked disabled={!status.connected} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Detectar conflitos externos</Label>
              <Switch defaultChecked disabled={!status.connected} />
            </div>
          </div>
        </div>

        {status.connected ? (
          <div className="p-3 rounded-lg bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20">
            <p className="text-xs text-[hsl(var(--success))] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Google Calendar conectado. Calendário: {status.calendar_id || 'primary'}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Clique em "Conectar Conta Google" para iniciar a autenticação OAuth2.
            </p>
          </div>
        )}

        {/* Histórico de sincronizações */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Histórico de Sincronizações</h4>
              <p className="text-mini text-muted-foreground">
                Últimas 20 tentativas — {successCount} sucesso(s), {failCount} falha(s)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={logsLoading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${logsLoading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
          {logs.length === 0 ? (
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-xs text-muted-foreground text-center">
              Nenhuma sincronização registrada ainda.
            </div>
          ) : (
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <div className="grid grid-cols-[80px_70px_1fr_120px_110px] gap-2 px-3 py-2 bg-secondary/40 text-mini font-medium text-muted-foreground uppercase tracking-wide">
                <span>Status</span>
                <span>Ação</span>
                <span>Detalhe</span>
                <span>TZ</span>
                <span>Quando</span>
              </div>
              <div className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="grid grid-cols-[80px_70px_1fr_120px_110px] gap-2 px-3 py-2 text-xs items-center">
                    {log.success ? (
                      <Badge variant="outline" className="status-paid text-micro w-fit">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-micro w-fit">
                        <XCircle className="h-3 w-3 mr-1" /> Falha
                      </Badge>
                    )}
                    <span className="font-medium uppercase text-micro tracking-wide text-muted-foreground">{log.action}</span>
                    <span
                      className="truncate"
                      title={isAdmin ? (log.error_message || log.google_event_id || '') : (log.google_event_id || '')}
                    >
                      {log.success
                        ? <span className="text-muted-foreground">evento {log.google_event_id?.slice(0, 12) ?? '—'}…</span>
                        : (
                          <span className="text-destructive">
                            {isAdmin
                              ? (log.error_message || 'Erro desconhecido')
                              : genericFailureLabel(log.http_status)}
                          </span>
                        )}
                      {log.http_status ? <span className="ml-2 text-muted-foreground">[{log.http_status}]</span> : null}
                    </span>
                    <span className="text-muted-foreground truncate">{log.timezone || '—'}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
