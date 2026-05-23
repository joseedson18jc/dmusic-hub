import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, CheckCircle2, Clock, PauseCircle, XCircle, ChevronDown, ChevronUp, Loader2, MapPin, DollarSign, Car, UtensilsCrossed, Receipt, User, Phone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

const EVENTO_TABS = [
  { value: 'confirmado', label: 'Confirmado', icon: CheckCircle2, color: 'text-[hsl(var(--success))]' },
  { value: 'a_confirmar', label: 'A Confirmar', icon: Clock, color: 'text-[hsl(var(--warning))]' },
  { value: 'adiado', label: 'Adiado', icon: PauseCircle, color: 'text-muted-foreground' },
  { value: 'cancelado', label: 'Cancelado', icon: XCircle, color: 'text-destructive' },
] as const;

const statusColors: Record<string, string> = {
  confirmado: 'border-[hsl(var(--success))]/30 text-[hsl(var(--success))] bg-[hsl(var(--success))]/10',
  a_confirmar: 'border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10',
  adiado: 'border-border text-muted-foreground bg-muted/50',
  cancelado: 'border-destructive/30 text-destructive bg-destructive/10',
};

const fmt = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

const formatDate = (date: string | null) => {
  if (!date) return '—';
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value && value !== '0') return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <span className="text-muted-foreground min-w-[140px]">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EventCard({ booking, tabLabel }: { booking: any; tabLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const evStatus = booking.evento_status || 'a_confirmar';

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-0">
        {/* Header - always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold truncate">{booking.titulo}</p>
              <Badge variant="outline" className={`text-micro ${statusColors[evStatus] || ''}`}>
                {tabLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {booking.data_evento && <span>📅 {formatDate(booking.data_evento)}</span>}
              {booking.hora_inicio && <span>🕐 {String(booking.hora_inicio).slice(0, 5)}{booking.hora_fim ? ` - ${String(booking.hora_fim).slice(0, 5)}` : ''}</span>}
              {booking.venue && <span>📍 {booking.venue}</span>}
              {booking.cidade && <span>🏙️ {booking.cidade}{booking.pais && booking.pais !== 'Brasil' ? `, ${booking.pais}` : ''}</span>}
            </div>
          </div>
          <div className="ml-2 flex-shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-border/30 px-4 py-4 space-y-4 bg-muted/10">
            {/* Evento / Local */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evento / Local</p>
              <InfoRow icon={CalendarDays} label="Evento / Clube" value={booking.venue || booking.evento_nome} />
              <InfoRow icon={CalendarDays} label="Festa" value={booking.titulo} />
              <InfoRow icon={CalendarDays} label="Tipo" value={booking.evento_tipo} />
              <InfoRow icon={MapPin} label="Cidade" value={booking.cidade ? `${booking.cidade}${booking.pais && booking.pais !== 'Brasil' ? `, ${booking.pais}` : ''}` : null} />
              <InfoRow icon={CalendarDays} label="Data" value={formatDate(booking.data_evento)} />
              <InfoRow icon={Clock} label="Horário" value={booking.hora_inicio ? `${String(booking.hora_inicio).slice(0, 5)}${booking.hora_fim ? ` - ${String(booking.hora_fim).slice(0, 5)}` : ''}` : null} />
            </div>

            {/* Contratante */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contratante / Produtor</p>
              <InfoRow icon={User} label="Contratante" value={booking.producers?.nome} />
              {booking.producers?.empresa && <InfoRow icon={User} label="Empresa" value={booking.producers.empresa} />}
              <InfoRow icon={Phone} label="Contatos Local" value={booking.contatos_local} />
            </div>

            {/* Financeiro */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Financeiro</p>
              <InfoRow icon={DollarSign} label="Cachê" value={booking.fee_acordado != null ? fmt(booking.fee_acordado) : null} />
              <InfoRow icon={DollarSign} label="Sinal" value={booking.sinal != null && booking.sinal > 0 ? fmt(booking.sinal) : null} />
              <InfoRow icon={DollarSign} label="Saldo" value={booking.saldo != null && booking.saldo > 0 ? fmt(booking.saldo) : null} />
              {booking.status_pagamento && (
                <div className="flex items-start gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground min-w-[140px]">Status Pagamento:</span>
                  <Badge variant="outline" className={`text-xs ${booking.status_pagamento === 'pago' ? 'border-[hsl(var(--success))]/30 text-[hsl(var(--success))]' : 'border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))]'}`}>
                    {booking.status_pagamento.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}
            </div>

            {/* Logística */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logística</p>
              <InfoRow icon={Car} label="Transporte" value={booking.transporte} />
              <InfoRow icon={UtensilsCrossed} label="Alimentação" value={booking.alimentacao} />
              <InfoRow icon={Receipt} label="Reembolso Uber" value={booking.reembolso_uber != null && booking.reembolso_uber > 0 ? fmt(booking.reembolso_uber) : null} />
            </div>

            {/* Pagamento */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</p>
              <InfoRow icon={CalendarDays} label="Data Pagamento" value={formatDate(booking.data_pagamento)} />
              <InfoRow icon={User} label="Resp. Pagamento" value={booking.responsavel_pagamento} />
              <InfoRow icon={Phone} label="Contato Resp." value={booking.contato_responsavel_pagamento} />
            </div>

            {/* Briefing */}
            {booking.briefing_musical && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Briefing Musical</p>
                <p className="text-sm text-foreground/80">{booking.briefing_musical}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DJEventos() {
  const { user } = useAuth();

  const { data: dj } = useQuery({
    queryKey: ['dj-profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb.from('djs').select('id, nome_artistico').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['dj-events', dj?.id],
    enabled: !!dj?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from('bookings')
        .select('*, producers:producer_id(nome, empresa)')
        .eq('dj_id', dj.id)
        .order('data_evento', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getFiltered = (status: string) =>
    bookings.filter((b: any) => (b.evento_status || 'a_confirmar') === status);

  if (!user) return <p className="text-muted-foreground p-8">Faça login para ver seus eventos.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Meus Eventos</h1>
        <p className="section-subtitle">Toque em um evento para ver todos os detalhes</p>
      </div>

      <Tabs defaultValue="confirmado" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {EVENTO_TABS.map((tab) => {
            const count = getFiltered(tab.value).length;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                <tab.icon className={`h-3.5 w-3.5 ${tab.color}`} />
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 bg-muted rounded-full px-1.5 py-0.5 text-micro font-semibold">{count}</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {EVENTO_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {isLoading ? (
              <Card className="glass-card">
                <CardContent className="empty-state"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent>
              </Card>
            ) : getFiltered(tab.value).length === 0 ? (
              <Card className="glass-card">
                <CardContent className="empty-state">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">Nenhum evento {tab.label.toLowerCase()}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {getFiltered(tab.value).map((booking: any) => (
                  <EventCard key={booking.id} booking={booking} tabLabel={tab.label} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
