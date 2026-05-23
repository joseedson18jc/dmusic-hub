import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, MapPin, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const sb = supabase as any;

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function DJAgenda() {
  const { user } = useAuth();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: dj } = useQuery({
    queryKey: ['dj-profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb.from('djs').select('id').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const endOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`;

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['dj-agenda', dj?.id, currentYear, currentMonth],
    enabled: !!dj?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from('bookings')
        .select('*, producers:producer_id(nome)')
        .eq('dj_id', dj.id)
        .gte('data_evento', startOfMonth)
        .lte('data_evento', endOfMonth)
        .order('data_evento', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const eventsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    (bookings as any[]).forEach((b) => {
      if (!b.data_evento) return;
      const day = new Date(b.data_evento + 'T00:00:00').getDate();
      if (!map[day]) map[day] = [];
      map[day].push(b);
    });
    return map;
  }, [bookings]);

  const days = getMonthDays(currentYear, currentMonth);

  const prevMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const isToday = (day: number) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  if (!user) return <p className="text-muted-foreground p-8">Faça login para ver sua agenda.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Minha Agenda</h1>
        <p className="section-subtitle">Calendário de eventos</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Calendar Grid */}
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-5 w-5" /></Button>
                <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
                <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-5 w-5" /></Button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="text-center text-xs font-medium text-muted-foreground py-2">{w}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {days.map((day, i) => {
                  const hasEvents = day ? !!eventsByDay[day] : false;
                  const eventCount = day ? (eventsByDay[day]?.length || 0) : 0;
                  const selected = day === selectedDay;

                  return (
                    <button
                      key={i}
                      disabled={!day}
                      onClick={() => day && setSelectedDay(selected ? null : day)}
                      className={cn(
                        'relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors',
                        !day && 'invisible',
                        day && 'hover:bg-accent/50 cursor-pointer',
                        isToday(day!) && !selected && 'bg-primary/10 font-bold text-primary',
                        selected && 'bg-primary text-primary-foreground font-bold',
                      )}
                    >
                      {day}
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: Math.min(eventCount, 3) }).map((_, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                selected ? 'bg-primary-foreground' : 'bg-primary'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected day events panel */}
          <div className="space-y-3">
            {selectedDay ? (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {selectedDay} de {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long' })}
                </h3>
                {selectedEvents.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="flex flex-col items-center py-10">
                      <CalendarDays className="h-10 w-10 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">Nenhum evento neste dia</p>
                    </CardContent>
                  </Card>
                ) : (
                  selectedEvents.map((b: any) => (
                    <Card key={b.id} className="glass-card">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{b.titulo}</p>
                          <Badge variant="outline" className="text-micro capitalize shrink-0">
                            {(b.evento_status || 'a_confirmar').replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {b.hora_inicio && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {String(b.hora_inicio).slice(0, 5)}{b.hora_fim ? ` – ${String(b.hora_fim).slice(0, 5)}` : ''}
                            </span>
                          )}
                          {b.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.venue}</span>}
                          {b.cidade && <span>🏙️ {b.cidade}</span>}
                          {b.producers?.nome && <span>👤 {b.producers.nome}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            ) : (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center py-16">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Selecione um dia para ver os eventos</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Monthly events list */}
        {(bookings as any[]).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Todos os eventos de {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long' })}
            </h3>
            <div className="space-y-2">
              {(bookings as any[]).map((b: any) => {
                const day = b.data_evento ? new Date(b.data_evento + 'T00:00:00').getDate() : null;
                return (
                  <Card key={b.id} className="glass-card">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg h-12 w-12 shrink-0">
                        <span className="text-lg font-bold text-primary leading-none">{day}</span>
                        <span className="text-micro text-muted-foreground capitalize">
                          {day ? WEEKDAYS[new Date(currentYear, currentMonth, day).getDay()] : ''}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{b.titulo}</p>
                          <Badge variant="outline" className="text-micro capitalize shrink-0">
                            {(b.evento_status || 'a_confirmar').replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {b.hora_inicio && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {String(b.hora_inicio).slice(0, 5)}{b.hora_fim ? ` – ${String(b.hora_fim).slice(0, 5)}` : ''}
                            </span>
                          )}
                          {b.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.venue}</span>}
                          {b.cidade && <span>🏙️ {b.cidade}</span>}
                          {b.producers?.nome && <span>👤 {b.producers.nome}</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
