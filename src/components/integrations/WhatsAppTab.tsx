import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, CheckCircle2, Clock, Loader2, Send, Play, X, AlertTriangle } from 'lucide-react';
import { useWhatsAppStatus, useWhatsAppMessages, useWhatsAppQueue } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';

const WHATSAPP_TEMPLATES = [
  { id: 'new-event-dj', name: 'Novo Evento (DJ)', trigger: 'Booking confirmado', variables: ['dj_name', 'event_name', 'date', 'venue'] },
  { id: 'new-event-producer', name: 'Novo Evento (Produtor)', trigger: 'Booking confirmado', variables: ['producer_name', 'event_name', 'dj_name', 'date'] },
  { id: 'payment-reminder', name: 'Lembrete de Pagamento', trigger: '3 dias antes do vencimento', variables: ['name', 'amount', 'due_date'] },
  { id: 'contract-pending', name: 'Contrato Pendente', trigger: 'Contrato enviado', variables: ['name', 'event_name', 'contract_link'] },
  { id: 'schedule-change', name: 'Alteração de Horário', trigger: 'Booking atualizado', variables: ['name', 'event_name', 'old_time', 'new_time'] },
  { id: 'cancellation', name: 'Cancelamento', trigger: 'Booking cancelado', variables: ['name', 'event_name', 'reason'] },
  { id: 'repasse-liberado', name: 'Repasse Liberado', trigger: 'Pagamento confirmado', variables: ['dj_name', 'amount', 'event_name'] },
  { id: 'task-critical', name: 'Tarefa Crítica', trigger: 'Tarefa com prioridade alta', variables: ['assignee', 'task_title', 'deadline'] },
];

export default function WhatsAppTab() {
  const { status, loading } = useWhatsAppStatus();
  const { messages } = useWhatsAppMessages();
  const { queue, loading: queueLoading, cancel, processNow, refresh } = useWhatsAppQueue();

  const stats = status?.stats || { total: 0, delivered: 0, failed: 0, queued: 0, rate: 0 };

  const handleProcess = async () => {
    const res = await processNow();
    if (res?.processed != null) {
      toast.success(`Fila processada: ${res.sent} enviadas, ${res.failed} falhas`);
    } else {
      toast.info('Nada para processar agora.');
    }
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-[hsl(var(--success))]" />
            <div>
              <h3 className="font-semibold">WhatsApp Business API</h3>
              <p className="text-xs text-muted-foreground">Notificações automáticas via Twilio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status?.configured ? (
              <Badge variant="outline" className="status-paid text-micro">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Configurado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-micro text-muted-foreground border-border">
                <Clock className="h-3 w-3 mr-1" /> Aguardando Twilio
              </Badge>
            )}
          </div>
        </div>

        {!status?.configured && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">
              Para ativar o WhatsApp, configure os secrets: <code className="text-primary">TWILIO_ACCOUNT_SID</code>, <code className="text-primary">TWILIO_AUTH_TOKEN</code> e <code className="text-primary">TWILIO_WHATSAPP_FROM</code>.
            </p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-3">Templates de Mensagem</h4>
          <div className="space-y-2">
            {WHATSAPP_TEMPLATES.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">Trigger: {t.trigger}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {t.variables.map((v) => (
                      <Badge key={v} variant="secondary" className="text-micro">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-micro ${status?.configured ? 'status-paid' : ''}`}>
                    {status?.configured ? 'Ativo' : 'Pendente'}
                  </Badge>
                  <Switch checked={!!status?.configured} disabled={!status?.configured} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Configurações</h4>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Opt-in obrigatório</Label>
              <Switch defaultChecked disabled={!status?.configured} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Reenvio automático em falha</Label>
              <Switch defaultChecked disabled={!status?.configured} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Rate limiting (máx/hora)</Label>
              <Input type="number" defaultValue={60} className="w-20 h-8" disabled={!status?.configured} />
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Estatísticas</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded border border-border/50 text-center">
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-micro text-muted-foreground">Enviadas</p>
              </div>
              <div className="p-3 rounded border border-border/50 text-center">
                <p className="text-lg font-bold">{stats.delivered}</p>
                <p className="text-micro text-muted-foreground">Entregues</p>
              </div>
              <div className="p-3 rounded border border-border/50 text-center">
                <p className="text-lg font-bold">{stats.failed}</p>
                <p className="text-micro text-muted-foreground">Falhas</p>
              </div>
              <div className="p-3 rounded border border-border/50 text-center">
                <p className="text-lg font-bold">{stats.rate}%</p>
                <p className="text-micro text-muted-foreground">Taxa Entrega</p>
              </div>
              <div className="p-3 rounded border border-border/50 text-center col-span-2">
                <p className="text-lg font-bold">{stats.queued ?? 0}</p>
                <p className="text-micro text-muted-foreground">Na fila</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Fila de Envio</h4>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => refresh()} disabled={queueLoading}>
                {queueLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Atualizar'}
              </Button>
              <Button size="sm" onClick={handleProcess} disabled={!status?.configured}>
                <Play className="h-3 w-3 mr-1" /> Processar agora
              </Button>
            </div>
          </div>
          {queue.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border/50 rounded">
              Nenhuma mensagem na fila.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {queue.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-2 rounded border border-border/50 text-xs gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{q.template_id}</span>
                      <span className="text-muted-foreground truncate">→ {q.recipient_phone}</span>
                    </div>
                    <p className="text-micro text-muted-foreground">
                      {new Date(q.scheduled_for).toLocaleString('pt-BR')} • tentativas {q.attempts}/{q.max_attempts}
                    </p>
                    {q.last_error && (
                      <p className="text-micro text-destructive truncate flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {q.last_error}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-micro ${
                    q.status === 'sent' ? 'status-paid'
                    : q.status === 'failed' ? 'text-destructive border-destructive/40'
                    : q.status === 'cancelled' ? 'text-muted-foreground'
                    : ''
                  }`}>{q.status}</Badge>
                  {q.status === 'pending' && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(q.id)} title="Cancelar">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Mensagens Recentes</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.slice(0, 10).map((msg) => (
                <div key={msg.id} className="flex items-center justify-between p-2 rounded border border-border/50 text-xs">
                  <div>
                    <span className="font-medium">{msg.recipient_name || msg.recipient_phone}</span>
                    <span className="text-muted-foreground ml-2">{msg.template_id}</span>
                  </div>
                  <Badge variant="outline" className={`text-micro ${msg.status === 'delivered' ? 'status-paid' : msg.status === 'failed' ? 'text-destructive' : ''}`}>
                    {msg.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
