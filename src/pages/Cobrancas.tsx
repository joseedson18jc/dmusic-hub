import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Link2, ExternalLink, Clock, CheckCircle2, XCircle, Plus, Loader2, Wallet, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStripeCharges, useCreatePaymentLink, useStripeStatus } from '@/hooks/useStripe';
import { toast } from 'sonner';
import { StatusPill, financialStatusToPill } from '@/components/StatusPill';
import { KpiStat } from '@/components/KpiCard';
import { EditorialHero } from '@/components/ui/EditorialHero';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function CreateChargeDialog({ onCreated }: { onCreated: () => void }) {
  const { create, loading } = useCreatePaymentLink();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async () => {
    const result = await create({
      description,
      amount: parseFloat(amount),
      customer_email: email || undefined,
    });
    if (result) {
      setOpen(false);
      setDescription('');
      setAmount('');
      setEmail('');
      onCreated();
      if (result.payment_link_url) {
        navigator.clipboard.writeText(result.payment_link_url);
        toast.success('Link copiado para a área de transferência!');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Cobrança</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Cobrança</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Descrição *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Festival Summer 2026" />
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="15000" />
          </div>
          <div>
            <Label>Email do cliente (opcional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="produtor@email.com" />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !description || !amount} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
            Gerar Link de Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Cobrancas() {
  const { status } = useStripeStatus();
  const { charges, loading, refresh } = useStripeCharges();

  const totalPago = charges.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor, 0);
  const totalPendente = charges.filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0);
  const totalVencido = charges.filter(p => p.status === 'vencido').reduce((s, p) => s + p.valor, 0);

  const filterByType = (type?: string) =>
    type ? charges.filter(c => c.tipo === type) : charges;

  const totalGeral = totalPago + totalPendente + totalVencido;
  const pctRecebido = totalGeral > 0 ? (totalPago / totalGeral) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="COBRANÇAS"
        accentHueA="hsl(var(--success))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: status?.connected ? 'STRIPE · CONNECTED' : 'STRIPE · OFF', tone: status?.connected ? 'live' : 'warn' },
          ...(status?.connected && status.business_name
            ? [{ label: `▸ ${status.business_name}`, tone: 'muted' as const }]
            : []),
          ...(totalVencido > 0
            ? [{ label: `⚠ ${fmt(totalVencido)} vencido`, tone: 'danger' as const }]
            : []),
        ]}
        ticker={[
          { label: 'recebido', value: fmt(totalPago), valueColor: 'hsl(var(--success))' },
          { label: 'pendente', value: fmt(totalPendente), valueColor: 'hsl(var(--warning))' },
          { label: 'taxa', value: `${pctRecebido.toFixed(0)}%`, valueColor: 'hsl(var(--primary))' },
        ]}
        actions={
          status?.connected ? (
            <CreateChargeDialog onCreated={refresh} />
          ) : (
            <Button size="sm" variant="outline" onClick={() => toast.info('Configure Stripe na página de Integrações')} className="h-9 gap-2 backdrop-blur-sm bg-background/60">
              <CreditCard className="h-4 w-4" /> Conectar Stripe
            </Button>
          )
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiStat icon={CheckCircle2} label="Recebido" value={fmt(totalPago)} tone="success" />
        <KpiStat icon={Clock} label="Pendente" value={fmt(totalPendente)} tone="warning" />
        <KpiStat icon={XCircle} label="Vencido" value={fmt(totalVencido)} tone="destructive" emphasizeValue={totalVencido > 0} />
        <KpiStat icon={TrendingUp} label="Taxa de recebimento" value={`${pctRecebido.toFixed(0)}%`} tone="primary" />
      </div>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="links">Links de Pagamento</TabsTrigger>
          <TabsTrigger value="checkout">Checkout Sessions</TabsTrigger>
        </TabsList>

        {['todas', 'links', 'checkout'].map((tab) => {
          const type = tab === 'links' ? 'link' : tab === 'checkout' ? 'checkout' : undefined;
          const items = filterByType(type);

          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card className="glass-card">
                {loading ? (
                  <CardContent className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </CardContent>
                ) : !status?.connected ? (
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <CreditCard className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground font-medium">Configure Stripe para habilitar cobranças</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Vá para Integrações → Stripe para conectar</p>
                  </CardContent>
                ) : items.length === 0 ? (
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <CreditCard className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="text-muted-foreground font-medium">Nenhuma cobrança encontrada</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Crie uma nova cobrança para começar</p>
                  </CardContent>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm font-medium">{p.descricao}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.customer_email || '—'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{p.tipo}</Badge></TableCell>
                          <TableCell className="text-sm font-medium">{p.valor > 0 ? fmt(p.valor) : '—'}</TableCell>
                          <TableCell>
                            {(() => {
                              const pill = financialStatusToPill(p.status);
                              return <StatusPill variant={pill.variant} size="sm">{pill.label}</StatusPill>;
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {p.url && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={p.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
