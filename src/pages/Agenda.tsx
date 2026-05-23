import { useState, useMemo, useCallback, DragEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
  GripVertical,
  CalendarRange,
  CalendarCheck,
  Users,
  Activity,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBookings, useUpdateBookingDate } from '@/hooks/useBookings';
import { useDJs } from '@/hooks/useDJs';
import { cn } from '@/lib/utils';
import { KpiStat } from '@/components/KpiCard';
import { EditorialHero } from '@/components/ui/EditorialHero';

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const statusColors: Record<string, string> = {
  confirmado: 'bg-[hsl(var(--success))]/15 border-[hsl(var(--success))]/40 text-[hsl(var(--success))]',
  novo_lead: 'bg-primary/10 border-primary/30 text-primary',
  proposta_enviada: 'bg-[hsl(var(--warning))]/15 border-[hsl(var(--warning))]/40 text-[hsl(var(--warning))]',
  negociacao: 'bg-[hsl(var(--warning))]/20 border-[hsl(var(--warning))]/50 text-[hsl(var(--warning))]',
  evento_realizado: 'bg-muted border-border text-muted-foreground',
  fechado_perdido: 'bg-destructive/10 border-destructive/30 text-destructive',
  planejamento: 'bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30 text-[hsl(var(--success))]',
};

type View = 'mensal' | 'semanal' | 'diario';

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [djFilter, setDjFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [draggedBookingId, setDraggedBookingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [view, setView] = useState<View>('mensal');

  const { data: bookings = [] } = useBookings({});
  const { data: djs = [] } = useDJs({});
  const updateDate = useUpdateBookingDate();

  const month = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  const filteredBookings = useMemo(() => {
    return (bookings as any[]).filter((b: any) => {
      if (djFilter !== 'todos' && b.dj_id !== djFilter) return false;
      if (statusFilter !== 'todos' && b.status !== statusFilter) return false;
      return true;
    });
  }, [bookings, djFilter, statusFilter]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredBookings.forEach((b: any) => {
      if (b.data_evento) {
        const key = b.data_evento;
        if (!map[key]) map[key] = [];
        map[key].push(b);
      }
    });
    return map;
  }, [filteredBookings]);

  const conflicts = useMemo(() => {
    const conflictDates = new Set<string>();
    Object.entries(bookingsByDate).forEach(([date, evts]) => {
      const djIds = evts.map((e: any) => e.dj_id).filter(Boolean);
      const unique = new Set(djIds);
      if (unique.size < djIds.length) conflictDates.add(date);
    });
    return conflictDates;
  }, [bookingsByDate]);

  // KPI computations
  const monthStats = useMemo(() => {
    const ym = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const events = filteredBookings.filter((b: any) => b.data_evento?.startsWith(ym));
    const confirmed = events.filter((b: any) => b.status === 'confirmado');
    const negotiating = events.filter((b: any) =>
      ['novo_lead', 'proposta_enviada', 'negociacao'].includes(b.status),
    );
    return {
      total: events.length,
      confirmed: confirmed.length,
      negotiating: negotiating.length,
      conflicts: conflicts.size,
    };
  }, [filteredBookings, currentDate, conflicts]);

  const getDateKey = (day: number) => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /* ── DnD ── */
  const handleDragStart = useCallback((e: DragEvent, bookingId: string) => {
    setDraggedBookingId(bookingId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookingId);
  }, []);

  const handleDragOver = useCallback((e: DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== dateKey) setDragOverKey(dateKey);
  }, [dragOverKey]);

  const handleDrop = useCallback(
    (e: DragEvent, dateKey: string) => {
      e.preventDefault();
      const bookingId = e.dataTransfer.getData('text/plain') || draggedBookingId;
      if (bookingId) {
        updateDate.mutate({ id: bookingId, data_evento: dateKey });
      }
      setDraggedBookingId(null);
      setDragOverKey(null);
    },
    [draggedBookingId, updateDate],
  );

  /* ── Weekly view ── */
  const getWeekDays = () => {
    const baseDate = selectedDay ? new Date(selectedDay + 'T12:00:00') : today;
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() - baseDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();
  const dailyBookings = selectedDay ? (bookingsByDate[selectedDay] ?? []) : [];

  /* ── View segment control ── */
  const ViewButton = ({ v, label, Icon }: { v: View; label: string; Icon: typeof CalendarDays }) => (
    <button
      type="button"
      onClick={() => { setView(v); if (v !== 'diario') setSelectedDay(null); }}
      disabled={v === 'diario' && !selectedDay}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
        view === v
          ? 'bg-card shadow-sm text-foreground'
          : 'text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="AGENDA"
        accentHueA="hsl(var(--primary))"
        accentHueB="hsl(var(--success))"
        status={[
          { label: 'CALENDAR · LIVE', tone: 'live' },
          { label: `▸ ${month.toUpperCase()}`, tone: 'muted' },
          ...(conflicts.size > 0
            ? [{ label: `⚠ ${conflicts.size} conflito${conflicts.size > 1 ? 's' : ''}`, tone: 'danger' as const }]
            : []),
        ]}
        ticker={[
          { label: 'eventos', value: String(monthStats.total), valueColor: 'hsl(var(--primary))' },
          { label: 'confirmados', value: String(monthStats.confirmed), valueColor: 'hsl(var(--success))' },
          { label: 'em negociação', value: String(monthStats.negotiating), valueColor: 'hsl(var(--warning))' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={goToday} className="h-9 gap-1.5 backdrop-blur-sm bg-background/60">
            <Sparkles className="h-3.5 w-3.5" /> Hoje
          </Button>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiStat icon={CalendarDays} label={`Eventos · ${month.split(' ')[0]}`} value={monthStats.total} tone="primary" />
        <KpiStat icon={CalendarCheck} label="Confirmados" value={monthStats.confirmed} tone="success" />
        <KpiStat icon={Activity} label="Em negociação" value={monthStats.negotiating} tone="warning" />
        <KpiStat
          icon={Users}
          label="Conflitos"
          value={monthStats.conflicts}
          tone={monthStats.conflicts > 0 ? 'destructive' : 'neutral'}
          emphasizeValue={monthStats.conflicts > 0}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={djFilter} onValueChange={setDjFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Filtrar DJ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos DJs</SelectItem>
            {(djs as any[]).map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.nome_artistico}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="novo_lead">Novo lead</SelectItem>
            <SelectItem value="proposta_enviada">Proposta enviada</SelectItem>
            <SelectItem value="negociacao">Negociação</SelectItem>
            <SelectItem value="evento_realizado">Evento realizado</SelectItem>
          </SelectContent>
        </Select>
        {selectedDay && (
          <Button variant="outline" size="sm" onClick={() => setSelectedDay(null)} className="h-9">
            ← Voltar
          </Button>
        )}

        {/* View segment control */}
        <div className="ml-auto inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
          <ViewButton v="mensal" label="Mensal" Icon={CalendarRange} />
          <ViewButton v="semanal" label="Semanal" Icon={CalendarDays} />
          <ViewButton v="diario" label={selectedDay ? `Diário · ${new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : 'Diário'} Icon={CalendarCheck} />
        </div>
      </div>

      {/* Monthly View */}
      {view === 'mensal' && (
        <Card className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold capitalize tracking-tight">{month}</h2>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <CardContent className="pt-4">
            <div className="grid grid-cols-7 gap-1">
              {daysOfWeek.map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    'text-center text-micro uppercase tracking-wider font-semibold py-1',
                    i === 0 || i === 6 ? 'text-primary/60' : 'text-muted-foreground',
                  )}
                >
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                const dateKey = day ? getDateKey(day) : '';
                const dayBookings = day ? bookingsByDate[dateKey] ?? [] : [];
                const isToday = isCurrentMonth && day === today.getDate();
                const hasConflict = conflicts.has(dateKey);
                const isDragOver = day && dragOverKey === dateKey;

                return (
                  <div
                    key={i}
                    className={cn(
                      'min-h-[5.5rem] p-1.5 rounded-md text-xs transition-all',
                      day ? 'border cursor-pointer' : 'border-transparent cursor-default',
                      day && !isToday && !hasConflict && 'border-border/40 hover:bg-muted/20 hover:border-border',
                      isToday && 'border-primary/50 bg-primary/[0.06] ring-1 ring-primary/30',
                      hasConflict && 'border-destructive/40 bg-destructive/[0.04]',
                      isDragOver && 'ring-2 ring-primary border-primary',
                    )}
                    onDragOver={day ? (e) => handleDragOver(e, dateKey) : undefined}
                    onDragLeave={() => setDragOverKey((k) => (k === dateKey ? null : k))}
                    onDrop={day ? (e) => handleDrop(e, dateKey) : undefined}
                    onClick={() => {
                      if (!day) return;
                      setSelectedDay(dateKey);
                      setView('diario');
                    }}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              'inline-flex h-5 w-5 items-center justify-center rounded text-mini font-semibold tabular-nums',
                              isToday
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground/80',
                            )}
                          >
                            {day}
                          </span>
                          {hasConflict && <AlertTriangle className="h-3 w-3 text-destructive" />}
                        </div>
                        <div className="space-y-0.5">
                          {dayBookings.slice(0, 3).map((b: any) => (
                            <div
                              key={b.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, b.id)}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-micro truncate border cursor-grab active:cursor-grabbing flex items-center gap-1',
                                statusColors[b.status] ?? 'bg-muted border-border text-muted-foreground',
                              )}
                              title={`${b.titulo} — arraste para mover`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-2.5 w-2.5 opacity-40 flex-shrink-0" />
                              <span className="truncate">{b.titulo}</span>
                            </div>
                          ))}
                          {dayBookings.length > 3 && (
                            <span className="text-micro text-muted-foreground pl-1.5">
                              +{dayBookings.length - 3} mais
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly View */}
      {view === 'semanal' && (
        <Card className="glass-card">
          <CardContent className="pt-5">
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((d) => {
                const dateKey = d.toISOString().split('T')[0];
                const dayBookings = bookingsByDate[dateKey] ?? [];
                const isDayToday = d.toDateString() === today.toDateString();
                const hasConflict = conflicts.has(dateKey);
                const isDragOver = dragOverKey === dateKey;

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      'min-h-[220px] rounded-lg border p-2 transition-all cursor-pointer',
                      isDayToday
                        ? 'border-primary/50 bg-primary/[0.06] ring-1 ring-primary/30'
                        : hasConflict
                        ? 'border-destructive/40 bg-destructive/[0.04]'
                        : 'border-border/40 hover:border-border hover:bg-muted/20',
                      isDragOver && 'ring-2 ring-primary border-primary',
                    )}
                    onDragOver={(e) => handleDragOver(e, dateKey)}
                    onDragLeave={() => setDragOverKey((k) => (k === dateKey ? null : k))}
                    onDrop={(e) => handleDrop(e, dateKey)}
                    onClick={() => { setSelectedDay(dateKey); setView('diario'); }}
                  >
                    <div className="text-center mb-2">
                      <p className="text-micro uppercase tracking-wider text-muted-foreground">
                        {daysOfWeek[d.getDay()]}
                      </p>
                      <p
                        className={cn(
                          'text-xl font-bold tabular-nums mt-0.5',
                          isDayToday && 'text-primary',
                        )}
                      >
                        {d.getDate()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      {dayBookings.map((b: any) => (
                        <div
                          key={b.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, b.id)}
                          className={cn(
                            'p-1.5 rounded border cursor-grab active:cursor-grabbing',
                            statusColors[b.status] ?? 'bg-muted/50 border-border/30',
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-micro font-medium truncate">{b.titulo}</p>
                          {b.hora_inicio && (
                            <p className="text-micro opacity-70 tabular-nums">
                              {b.hora_inicio.slice(0, 5)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily View */}
      {view === 'diario' && selectedDay && (
        <Card className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
            <h2 className="text-sm font-semibold capitalize">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              })}
            </h2>
            {conflicts.has(selectedDay) && (
              <Badge variant="destructive" className="gap-1 text-micro">
                <AlertTriangle className="h-3 w-3" /> Conflito de DJ
              </Badge>
            )}
          </div>
          <CardContent className="pt-4">
            {dailyBookings.length === 0 ? (
              <div className="flex flex-col items-center py-16 space-y-2">
                <CalendarDays className="h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm font-medium">Nenhum evento neste dia</p>
                <p className="text-xs text-muted-foreground">Arraste um booking para esta data ou crie um novo.</p>
              </div>
            ) : (
              <div className="relative">
                {HOURS.map((hour) => {
                  const hourStr = String(hour).padStart(2, '0');
                  const hourBookings = dailyBookings.filter((b: any) => {
                    if (!b.hora_inicio) return hour === 0;
                    return b.hora_inicio.startsWith(hourStr);
                  });
                  const isCurrentHour =
                    selectedDay === today.toISOString().split('T')[0] &&
                    today.getHours() === hour;

                  return (
                    <div
                      key={hour}
                      className={cn(
                        'flex border-t border-border/30 min-h-[3rem]',
                        isCurrentHour && 'bg-primary/[0.04]',
                      )}
                    >
                      <div
                        className={cn(
                          'w-16 py-2 text-xs font-mono text-right pr-3 flex-shrink-0',
                          isCurrentHour ? 'text-primary font-semibold' : 'text-muted-foreground',
                        )}
                      >
                        {hourStr}:00
                      </div>
                      <div className="flex-1 py-1 px-2">
                        {hourBookings.map((b: any) => (
                          <div
                            key={b.id}
                            className={cn(
                              'p-2 rounded-md mb-1 border',
                              statusColors[b.status] ?? 'bg-muted border-border text-muted-foreground',
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{b.titulo}</p>
                              <Badge variant="outline" className="text-micro capitalize flex-shrink-0">
                                {b.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-mini text-muted-foreground flex-wrap">
                              {b.hora_inicio && (
                                <span className="tabular-nums">
                                  {b.hora_inicio.slice(0, 5)}–{b.hora_fim?.slice(0, 5) ?? '??:??'}
                                </span>
                              )}
                              {b.venue && <span>📍 {b.venue}</span>}
                              {b.djs?.nome_artistico && <span>🎧 {b.djs.nome_artistico}</span>}
                              {b.producers?.nome && <span>👤 {b.producers.nome}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
