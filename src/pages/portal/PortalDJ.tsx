import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Music2, DollarSign, FileText, Bell, User, Loader2, MapPin, Headphones, Wallet, History, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiStat } from '@/components/KpiCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const supabaseAny = supabase as any;
const fmt = (v: number | null) => v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

export default function PortalDJ() {
  const { user } = useAuth();

  const { data: dj, isLoading } = useQuery({
    queryKey: ['portal-dj', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabaseAny.from('djs').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['portal-dj-bookings', dj?.id],
    enabled: !!dj?.id,
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('bookings')
        .select('*, producers:producer_id(nome, empresa)')
        .eq('dj_id', dj.id)
        .order('data_evento', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: financial = [] } = useQuery({
    queryKey: ['portal-dj-financial', dj?.id],
    enabled: !!dj?.id,
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('financial_records')
        .select('*')
        .eq('dj_id', dj.id)
        .in('tipo', ['repasse_dj', 'receita', 'pagamento_final'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['portal-dj-notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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

  if (!dj) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Music2 className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Perfil de DJ não encontrado</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Sua conta ainda não está vinculada a um perfil de DJ.</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = bookings.filter((b: any) => b.data_evento && b.data_evento >= todayStr);
  const pastEvents = bookings.filter((b: any) => !b.data_evento || b.data_evento < todayStr);
  const pendingRepasses = financial.filter((f: any) => f.status === 'pendente');

  return (
    <div className="space-y-6">
      {/* DJ Hero — banner + avatar */}
      <Card className="glass-card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/25 via-primary/10 to-info/15" />
        <CardContent className="pt-0 -mt-12 pb-5">
          <div className="flex items-end gap-4 flex-wrap">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              <AvatarImage src={dj.foto_url ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">
                {dj.nome_artistico?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{dj.nome_artistico}</h1>
              {dj.cidade && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {dj.cidade}{dj.pais && `, ${dj.pais}`}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-micro capitalize',
                    dj.status === 'ativo' && 'border-[hsl(var(--success))]/40 text-[hsl(var(--success))]',
                    dj.status === 'pausa' && 'border-[hsl(var(--warning))]/40 text-[hsl(var(--warning))]',
                    dj.status === 'indisponivel' && 'border-info/40 text-info',
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                  {dj.status}
                </Badge>
                {dj.generos_musicais?.slice(0, 3).map((g: string) => (
                  <Badge key={g} variant="outline" className="text-micro">{g}</Badge>
                ))}
              </div>
            </div>
            {dj.soundcloud && (
              <a
                href={dj.soundcloud.startsWith('http') ? dj.soundcloud : `https://soundcloud.com/${dj.soundcloud}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-medium transition-colors"
              >
                <Cloud className="h-3.5 w-3.5 text-[hsl(25_100%_55%)]" />
                SoundCloud
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiStat icon={CalendarDays} label="Próximos eventos" value={upcomingEvents.length} tone="primary" />
        <KpiStat icon={Wallet} label="Repasses pendentes" value={pendingRepasses.length} tone="warning" emphasizeValue={pendingRepasses.length > 0} />
        <KpiStat icon={History} label="Total de gigs" value={bookings.length} tone="info" className="col-span-2 lg:col-span-1" />
      </div>

      <Tabs defaultValue="agenda" className="w-full">
        <TabsList>
          <TabsTrigger value="agenda"><CalendarDays className="h-4 w-4 mr-1" /> Agenda</TabsTrigger>
          <TabsTrigger value="repasses"><DollarSign className="h-4 w-4 mr-1" /> Repasses</TabsTrigger>
          <TabsTrigger value="perfil"><User className="h-4 w-4 mr-1" /> Perfil</TabsTrigger>
          <TabsTrigger value="notificacoes"><Bell className="h-4 w-4 mr-1" /> Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Próximos Eventos</CardTitle></CardHeader>
            {upcomingEvents.length === 0 ? (
              <CardContent className="flex flex-col items-center py-12">
                <CalendarDays className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum evento agendado.</p>
              </CardContent>
            ) : (
              <CardContent className="space-y-3">
                {upcomingEvents.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{b.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.data_evento && new Date(b.data_evento).toLocaleDateString('pt-BR')}
                        {b.hora_inicio && ` • ${b.hora_inicio.slice(0, 5)}`}
                        {b.venue && ` • ${b.venue}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.producers?.nome ?? ''}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{b.status.replace(/_/g, ' ')}</Badge>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {pastEvents.length > 0 && (
            <Card className="glass-card mt-4">
              <CardHeader><CardTitle className="text-base">Histórico de Gigs</CardTitle></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastEvents.slice(0, 10).map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm font-medium">{b.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.data_evento ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.venue ?? b.cidade ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{b.status.replace(/_/g, ' ')}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="repasses" className="mt-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Repasses & Pagamentos</CardTitle></CardHeader>
            {financial.length === 0 ? (
              <CardContent className="flex flex-col items-center py-12">
                <DollarSign className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum registro financeiro.</p>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financial.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm">{f.descricao || '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{f.tipo.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-sm font-medium">{fmt(f.valor_bruto)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${f.status === 'pago' ? 'status-paid' : f.status === 'pendente' ? 'status-pending' : ''}`}>
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

        <TabsContent value="perfil" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {dj.nome_civil && <div><span className="text-muted-foreground">Nome Civil:</span> {dj.nome_civil}</div>}
                {dj.email && <div><span className="text-muted-foreground">Email:</span> {dj.email}</div>}
                {dj.telefone && <div><span className="text-muted-foreground">Telefone:</span> {dj.telefone}</div>}
                {dj.whatsapp && <div><span className="text-muted-foreground">WhatsApp:</span> {dj.whatsapp}</div>}
                {dj.mini_bio && <div className="pt-2"><span className="text-muted-foreground">Bio:</span> <p className="mt-1">{dj.mini_bio}</p></div>}
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Links & Redes</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {dj.instagram && <div><span className="text-muted-foreground">Instagram:</span> {dj.instagram}</div>}
                {dj.soundcloud && <div className="flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-[hsl(25_100%_55%)]" /><span className="text-muted-foreground">SoundCloud:</span> <a href={dj.soundcloud.startsWith('http') ? dj.soundcloud : `https://soundcloud.com/${dj.soundcloud}`} className="text-primary underline" target="_blank" rel="noreferrer">{dj.soundcloud}</a></div>}
                {dj.press_kit_url && <div><span className="text-muted-foreground">Press Kit:</span> <a href={dj.press_kit_url} className="text-primary underline" target="_blank" rel="noreferrer">Abrir</a></div>}
                {dj.rider_tecnico_url && <div><span className="text-muted-foreground">Rider Técnico:</span> <a href={dj.rider_tecnico_url} className="text-primary underline" target="_blank" rel="noreferrer">Abrir</a></div>}
              </CardContent>
            </Card>
          </div>
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
