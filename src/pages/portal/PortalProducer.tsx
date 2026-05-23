import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, DollarSign, FileSignature, Bell, Building2, Loader2, Wallet, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiStat } from '@/components/KpiCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const supabaseAny = supabase as any;
const fmt = (v: number | null) => v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

export default function PortalProducer() {
  const { user } = useAuth();

  // For producer portal, we match by owner_id (the user who manages this producer account)
  const { data: producer, isLoading } = useQuery({
    queryKey: ['portal-producer', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabaseAny.from('producers').select('*').eq('owner_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['portal-producer-bookings', producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('bookings')
        .select('*, djs:dj_id(nome_artistico)')
        .eq('producer_id', producer.id)
        .order('data_evento', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: financial = [] } = useQuery({
    queryKey: ['portal-producer-financial', producer?.id],
    enabled: !!producer?.id,
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('financial_records')
        .select('*')
        .eq('producer_id', producer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['portal-producer-notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!producer) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Building2 className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Portal do Produtor</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Sua conta não está vinculada a um perfil de produtor.</p>
      </div>
    );
  }

  const upcomingEvents = bookings.filter((b: any) => b.data_evento && new Date(b.data_evento) >= new Date());
  const pendingPayments = financial.filter((f: any) => f.status === 'pendente');
  const totalSpent = financial.filter((f: any) => f.status === 'pago').reduce((s: number, f: any) => s + Number(f.valor_bruto), 0);

  return (
    <div className="space-y-6">
      {/* Hero — banner + producer info */}
      <Card className="glass-card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-info/25 via-primary/15 to-transparent" />
        <CardContent className="pt-0 -mt-10 pb-5">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="h-20 w-20 rounded-2xl ring-4 ring-card bg-gradient-to-br from-info to-info/60 flex items-center justify-center text-info-foreground text-2xl font-bold">
              {producer.nome?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{producer.nome}</h1>
              {producer.empresa && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" />
                  {producer.empresa}
                </p>
              )}
              {producer.cidade && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {producer.cidade}{producer.pais && `, ${producer.pais}`}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiStat icon={CalendarDays} label="Próximos eventos" value={upcomingEvents.length} tone="primary" />
        <KpiStat icon={Wallet} label="Pagamentos pendentes" value={pendingPayments.length} tone="warning" emphasizeValue={pendingPayments.length > 0} />
        <KpiStat icon={TrendingUp} label="Total investido" value={fmt(totalSpent)} tone="success" className="col-span-2 lg:col-span-1" />
      </div>

      <Tabs defaultValue="eventos" className="w-full">
        <TabsList>
          <TabsTrigger value="eventos"><CalendarDays className="h-4 w-4 mr-1" /> Eventos</TabsTrigger>
          <TabsTrigger value="financeiro"><DollarSign className="h-4 w-4 mr-1" /> Financeiro</TabsTrigger>
          <TabsTrigger value="contratos"><FileSignature className="h-4 w-4 mr-1" /> Contratos</TabsTrigger>
          <TabsTrigger value="notificacoes"><Bell className="h-4 w-4 mr-1" /> Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="eventos" className="mt-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Eventos</CardTitle></CardHeader>
            {bookings.length === 0 ? (
              <CardContent className="flex flex-col items-center py-12">
                <CalendarDays className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum evento.</p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>DJ</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm font-medium">{b.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.djs?.nome_artistico ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.data_evento ?? '—'}</TableCell>
                      <TableCell className="text-sm">{fmt(b.fee_acordado)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{b.status.replace(/_/g, ' ')}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Histórico Financeiro</CardTitle></CardHeader>
            {financial.length === 0 ? (
              <CardContent className="flex flex-col items-center py-12">
                <DollarSign className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum registro.</p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financial.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm">{f.descricao || '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(f.valor_bruto)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.data_vencimento ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${f.status === 'pago' ? 'status-paid' : f.status === 'pendente' ? 'status-pending' : f.status === 'vencido' ? 'status-overdue' : ''}`}>
                          {f.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="mt-4">
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center py-16">
              <FileSignature className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-medium">Contratos</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Seus contratos aparecerão aqui quando gerados.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Notificações</CardTitle></CardHeader>
            {notifications.length === 0 ? (
              <CardContent className="flex flex-col items-center py-12">
                <Bell className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma notificação.</p>
              </CardContent>
            ) : (
              <CardContent className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className={`p-3 rounded-lg border ${!n.lida ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20'}`}>
                    <p className="text-sm font-medium">{n.titulo}</p>
                    {n.mensagem && <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>}
                    <p className="text-micro text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
