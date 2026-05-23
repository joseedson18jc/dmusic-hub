import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CreditCard, CheckCircle2, Clock, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { useStripeStatus } from '@/hooks/useStripe';

export default function StripeTab() {
  const { status, loading, refresh } = useStripeStatus();

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold">Stripe</h3>
                <p className="text-xs text-muted-foreground">Pagamentos e cobranças automatizadas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              {status?.connected ? (
                <Badge className="status-paid text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" /> Desconectado
                </Badge>
              )}
            </div>
          </div>

          {status?.connected && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Conta</span>
                  <p className="font-medium">{status.business_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">ID</span>
                  <p className="font-mono text-xs">{status.account_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">País</span>
                  <p className="font-medium">{status.country?.toUpperCase()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Moeda</span>
                  <p className="font-medium">{status.currency?.toUpperCase()}</p>
                </div>
              </div>
            </div>
          )}

          {!status?.connected && !loading && (
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-muted-foreground">
              {status?.error || 'Stripe não está configurado. Adicione a chave secreta nas configurações do projeto.'}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Funcionalidades</h4>
              {[
                { name: 'Links de Pagamento', active: !!status?.connected },
                { name: 'Checkout Sessions', active: !!status?.connected },
                { name: 'Webhooks Automáticos', active: false },
                { name: 'Reconciliação Financeira', active: false },
                { name: 'Invoices', active: false },
                { name: 'Customer Sync', active: false },
              ].map((f) => (
                <div key={f.name} className="flex items-center justify-between p-2 rounded border border-border/50">
                  <span className="text-sm">{f.name}</span>
                  <Badge variant="outline" className={`text-micro ${f.active ? 'status-paid' : ''}`}>
                    {f.active ? 'Ativo' : 'Pendente'}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Automações</h4>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Gerar link ao confirmar booking</Label>
                <Switch disabled={!status?.connected} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Confirmar pagamento via webhook</Label>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Reconciliar automaticamente</Label>
                <Switch disabled />
              </div>
              {status?.connected && (
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> Abrir Dashboard Stripe
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
