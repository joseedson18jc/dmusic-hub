import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useProducerWhatsAppHistory } from '@/hooks/useWhatsApp';

export function ProducerWhatsAppHistory({ producerId }: { producerId: string }) {
  const { messages, loading } = useProducerWhatsAppHistory(producerId);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-[hsl(var(--success))]" />
          Histórico de WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma mensagem enviada para este produtor.
          </p>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{msg.template_id}</span>
                    <span className="text-xs text-muted-foreground">→ {msg.recipient_phone}</span>
                  </div>
                  {msg.error_message && (
                    <p className="text-xs text-destructive mt-1 truncate">{msg.error_message}</p>
                  )}
                  <p className="text-micro text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-micro shrink-0 ${
                    msg.status === 'delivered'
                      ? 'status-paid'
                      : msg.status === 'failed'
                      ? 'text-destructive border-destructive/40'
                      : ''
                  }`}
                >
                  {msg.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
