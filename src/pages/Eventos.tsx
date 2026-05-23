import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBookings, useUpdateEventoStatus } from '@/hooks/useBookings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditorialHero } from '@/components/ui/EditorialHero';

const EVENTO_TABS = [
  { value: 'confirmado', label: 'Confirmado', icon: CheckCircle2, color: 'text-[hsl(var(--success))]' },
  { value: 'a_confirmar', label: 'A Confirmar', icon: Clock, color: 'text-[hsl(var(--warning))]' },
  { value: 'adiado', label: 'Adiado', icon: PauseCircle, color: 'text-muted-foreground' },
  { value: 'cancelado', label: 'Cancelado', icon: XCircle, color: 'text-destructive' },
] as const;

function EventoStatusBadge({ status }: { status: string }) {
  const tab = EVENTO_TABS.find((t) => t.value === status);
  if (!tab) return null;
  const colorMap: Record<string, string> = {
    confirmado: 'border-[hsl(var(--success))]/30 text-[hsl(var(--success))] bg-[hsl(var(--success))]/10',
    a_confirmar: 'border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10',
    adiado: 'border-border text-muted-foreground bg-muted/50',
    cancelado: 'border-destructive/30 text-destructive bg-destructive/10',
  };
  return (
    <Badge variant="outline" className={`text-micro ${colorMap[status] || ''}`}>
      {tab.label}
    </Badge>
  );
}

export default function Eventos() {
  const { data: bookings = [], isLoading } = useBookings();
  const updateEventoStatus = useUpdateEventoStatus();

  const getFilteredBookings = (eventoStatus: string) =>
    bookings.filter((b: any) => (b.evento_status || 'a_confirmar') === eventoStatus);

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    updateEventoStatus.mutate({ id: bookingId, evento_status: newStatus });
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const eventCounts = {
    confirmado: getFilteredBookings('confirmado').length,
    a_confirmar: getFilteredBookings('a_confirmar').length,
    adiado: getFilteredBookings('adiado').length,
    cancelado: getFilteredBookings('cancelado').length,
  };

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="EVENTOS"
        accentHueA="hsl(var(--success))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'EVENTS · LIVE', tone: 'live' },
          { label: `▸ ${bookings.length} total`, tone: 'muted' },
        ]}
        ticker={[
          { label: 'confirmados', value: String(eventCounts.confirmado), valueColor: 'hsl(var(--success))' },
          { label: 'a confirmar', value: String(eventCounts.a_confirmar), valueColor: 'hsl(var(--warning))' },
          { label: 'cancelados', value: String(eventCounts.cancelado), valueColor: 'hsl(var(--destructive))' },
        ]}
      />

      <Tabs defaultValue="a_confirmar" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {EVENTO_TABS.map((tab) => {
            const count = getFilteredBookings(tab.value).length;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                <tab.icon className={`h-3.5 w-3.5 ${tab.color}`} />
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 bg-muted rounded-full px-1.5 py-0.5 text-micro font-semibold">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {EVENTO_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {isLoading ? (
              <Card className="glass-card">
                <CardContent className="empty-state">
                  <p className="text-muted-foreground text-sm">Carregando...</p>
                </CardContent>
              </Card>
            ) : getFilteredBookings(tab.value).length === 0 ? (
              <Card className="glass-card">
                <CardContent className="empty-state">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">Nenhum evento {tab.label.toLowerCase()}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {getFilteredBookings(tab.value).map((booking: any) => (
                  <Card key={booking.id} className="glass-card">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold truncate">{booking.titulo}</p>
                          <EventoStatusBadge status={booking.evento_status || 'a_confirmar'} />
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {booking.data_evento && <span>📅 {formatDate(booking.data_evento)}</span>}
                          {booking.venue && <span>📍 {booking.venue}</span>}
                          {booking.cidade && <span>🏙️ {booking.cidade}</span>}
                          {booking.djs?.nome_artistico && <span>🎧 {booking.djs.nome_artistico}</span>}
                          {booking.producers?.nome && <span>👤 {booking.producers.nome}</span>}
                        </div>
                      </div>
                      <Select
                        value={booking.evento_status || 'a_confirmar'}
                        onValueChange={(val) => handleStatusChange(booking.id, val)}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENTO_TABS.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
