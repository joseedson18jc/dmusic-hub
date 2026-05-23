import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Pencil, Instagram, Music2, Globe, MapPin, Mail, Phone,
  Calendar, DollarSign, FileText, Loader2, Briefcase, Users, CalendarDays,
  PenLine, Upload, Eye, Plus
} from 'lucide-react';
import { useDJ, useDJBookings, useDJFinancial } from '@/hooks/useDJs';
import { DJForm } from '@/components/djs/DJForm';
import { DJStatusBadge } from '@/components/djs/DJStatusBadge';

const fmt = (v: number | null) =>
  v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

const statusColors: Record<string, string> = {
  confirmado: 'bg-success/80 text-success-foreground',
  novo_lead: 'bg-primary/80 text-primary-foreground',
  proposta_enviada: 'bg-warning/80 text-warning-foreground',
  negociacao: 'bg-accent/80 text-accent-foreground',
  evento_realizado: 'bg-muted text-muted-foreground',
  planejamento: 'bg-success/60 text-success-foreground',
};

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export default function DJProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: dj, isLoading, refetch } = useDJ(id);
  const { data: bookings } = useDJBookings(id);
  const { data: financial } = useDJFinancial(id);
  const [formOpen, setFormOpen] = useState(false);

  // Calendar data
  const currentDate = new Date();
  const calendarMonth = currentDate.getMonth();
  const calendarYear = currentDate.getFullYear();
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (bookings ?? []).forEach((b: any) => {
      if (b.data_evento) {
        if (!map[b.data_evento]) map[b.data_evento] = [];
        map[b.data_evento].push(b);
      }
    });
    return map;
  }, [bookings]);

  const getDateKey = (day: number) => {
    const m = String(calendarMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${calendarYear}-${m}-${d}`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!dj) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-muted-foreground">DJ não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/djs')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
      </div>
    );
  }

  const totalBookings = bookings?.length ?? 0;
  const totalReceita = financial?.filter((f: any) => f.tipo === 'receita').reduce((s: number, f: any) => s + Number(f.valor_bruto), 0) ?? 0;
  const avgFee = totalBookings > 0 ? (bookings ?? []).reduce((s: number, b: any) => s + Number(b.fee_acordado || 0), 0) / totalBookings : 0;
  const upcomingCount = (bookings ?? []).filter((b: any) => b.data_evento && b.data_evento >= new Date().toISOString().split('T')[0]).length;

  // Top venues
  const venueCount: Record<string, number> = {};
  (bookings ?? []).forEach((b: any) => {
    const v = b.venue || b.cidade;
    if (v) venueCount[v] = (venueCount[v] || 0) + 1;
  });
  const topVenues = Object.entries(venueCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/djs')} className="gap-1 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Artists
      </Button>

      {/* Hero Banner */}
      <div className="relative rounded-xl overflow-hidden h-56 bg-gradient-to-r from-secondary via-card to-secondary">
        {dj.foto_url && (
          <img src={dj.foto_url} alt={dj.nome_artistico} className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-4">
            <div className="bg-card/80 backdrop-blur-md rounded-lg px-5 py-3 border border-border/50">
              <h1 className="text-2xl font-bold tracking-tight">{dj.nome_artistico}</h1>
              <p className="text-sm text-muted-foreground">
                {dj.generos_musicais?.join(' / ') || 'Sem gênero'} • Base City: {dj.cidade || 'N/A'}
              </p>
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => setFormOpen(true)} className="bg-card/60 backdrop-blur-sm">
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Gigs:', value: String(totalBookings), icon: Briefcase },
          { label: 'Avg. Fee:', value: fmt(avgFee), icon: DollarSign },
          { label: 'Social Reach:', value: '—', icon: Users },
          { label: 'Upcoming:', value: String(upcomingCount), icon: CalendarDays },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content: Calendar + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Calendar */}
        <Card className="glass-card border-border/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-px">
              {daysOfWeek.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {cells.map((day, i) => {
                const dateKey = day ? getDateKey(day) : '';
                const dayBookings = day ? bookingsByDate[dateKey] ?? [] : [];
                const isToday = day === currentDate.getDate();

                return (
                  <div
                    key={i}
                    className={`min-h-[4.5rem] p-1 border border-border/20 rounded-sm text-xs
                      ${isToday ? 'bg-primary/10 border-primary/30' : ''}
                      ${!day ? 'bg-transparent border-transparent' : ''}`}
                  >
                    {day && (
                      <>
                        <span className={`text-xs ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{day}</span>
                        <div className="mt-0.5 space-y-0.5">
                          {dayBookings.slice(0, 2).map((b: any) => {
                            const sc = statusColors[b.status] || 'bg-muted text-muted-foreground';
                            const label = b.status === 'confirmado' ? 'Confirmed' : b.status === 'negociacao' ? 'Negotiating' : b.status === 'proposta_enviada' ? 'Pending' : b.status.replace(/_/g, ' ');
                            return (
                              <Badge key={b.id} className={`text-nano px-1.5 py-0 h-4 rounded-sm font-medium w-full justify-center ${sc}`}>
                                {label}
                              </Badge>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Top Venues */}
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Top Venues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topVenues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
              ) : (
                topVenues.map(([venue, count]) => (
                  <div key={venue} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{venue}</span>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Edit Rider', icon: PenLine },
                { label: 'Update Press Kit', icon: Upload },
                { label: 'View Contracts', icon: Eye },
                { label: 'Add New Gigs', icon: Plus },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="w-full justify-start gap-2 h-10 text-sm border-accent/20 text-accent hover:bg-accent/10 hover:text-accent"
                  onClick={() => {
                    if (action.label === 'Edit Rider') setFormOpen(true);
                    else if (action.label === 'View Contracts') navigate('/contratos');
                    else if (action.label === 'Add New Gigs') navigate('/bookings');
                  }}
                >
                  <action.icon className="h-4 w-4" /> {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for detailed data */}
      <Tabs defaultValue="dados" className="w-full">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Email" value={dj.email} icon={Mail} />
                <InfoRow label="Telefone" value={dj.telefone} icon={Phone} />
                <InfoRow label="WhatsApp" value={dj.whatsapp} icon={Phone} />
                <InfoRow label="Endereço" value={dj.endereco} icon={MapPin} />
                <InfoRow label="Documento" value={dj.documento} icon={FileText} />
                <InfoRow label="Nascimento" value={dj.data_nascimento} icon={Calendar} />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-base">Redes Sociais</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Instagram" value={dj.instagram} icon={Instagram} />
                <InfoRow label="TikTok" value={dj.tiktok} icon={Music2} />
                <InfoRow label="SoundCloud" value={dj.soundcloud} icon={Music2} />
                <InfoRow label="YouTube" value={dj.youtube} icon={Globe} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <Card className="glass-card">
            {!bookings?.length ? (
              <CardContent className="empty-state"><Calendar className="h-12 w-12 text-muted-foreground/20 mb-4" /><p className="text-muted-foreground">Nenhum booking encontrado.</p></CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-sm">{b.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.data_evento ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.venue ?? b.cidade ?? '—'}</TableCell>
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
            {!financial?.length ? (
              <CardContent className="empty-state"><DollarSign className="h-12 w-12 text-muted-foreground/20 mb-4" /><p className="text-muted-foreground">Nenhum registro financeiro.</p></CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financial.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium text-sm">{f.descricao || '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{f.tipo.replace(/_/g, ' ')}</Badge></TableCell>
                      <TableCell className="text-sm">{fmt(f.valor_bruto)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.data_vencimento ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${f.status === 'pago' ? 'status-paid' : f.status === 'pendente' ? 'status-pending' : f.status === 'vencido' ? 'status-overdue' : ''}`}>{f.status.replace(/_/g, ' ')}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <DJForm open={formOpen} onOpenChange={setFormOpen} dj={dj} onSuccess={refetch} />
    </div>
  );
}
