import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ListSkeleton, EmptyState, ErrorState } from '@/components/states';
import {
  useBookings, useUpdateBookingStatus, useDeleteBooking, BOOKING_STAGES,
} from '@/hooks/useBookings';
import { BookingForm } from '@/components/bookings/BookingForm';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Search, Columns3, LayoutGrid, Calendar as CalIcon,
  Loader2, X, Phone, MessageSquare, FileSignature, Pencil, Trash2,
  AlertTriangle, MoreHorizontal,
} from 'lucide-react';
import {
  STORAGE_PREFIX, DEFAULT_FILTERS, PAGE_SIZE_VALUES,
  loadFilters, serializeFilters,
  type FiltersState, type SortOption, type ViewMode, type PageSize,
} from '@/lib/bookingsFilters';
import { clampPage, shouldResetPage } from '@/lib/bookingsPagination';
import {
  UI_STATE_PREFIX, loadUiState, saveUiState,
} from '@/lib/bookingsUiState';
import { StatusPill, bookingStatusToPill } from '@/components/StatusPill';
import { buildConflictMap, type ConflictResult } from '@/lib/djConflicts';
import { describeHold } from '@/lib/holdDates';
import { PIPELINE_PHASES, LOST_PHASE } from '@/lib/bookingPhases';
import { PhaseSummaryTile } from '@/components/bookings/PhaseSummaryTile';
import { PhaseKanbanColumn } from '@/components/bookings/PhaseKanbanColumn';
import { EditorialHero } from '@/components/ui/EditorialHero';

const fmtBRL = (v: number | null | undefined) =>
  v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) : '—';

function statusLabel(status: string) {
  const stage = BOOKING_STAGES.find((s) => s.value === status);
  return stage?.label ?? status.replace(/_/g, ' ');
}

/** Saved filter chips — intent-based filters that map to filter state. */
const SAVED_FILTERS = [
  { key: 'all', label: 'Todos', match: () => true },
  {
    key: 'thisweek',
    label: 'Esta semana',
    match: (b: any) => {
      if (!b.data_evento) return false;
      const d = new Date(b.data_evento);
      const now = new Date();
      const diff = (d.getTime() - now.getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    },
  },
  {
    key: 'risk',
    label: 'Em risco',
    match: (b: any) =>
      b.status === 'sinal_pendente' || b.status === 'assinatura_pendente' || b.status === 'aguardando_aprovacao',
  },
  {
    key: 'norider',
    label: 'Sem rider',
    match: (b: any) => !b.rider_tecnico_url && b.status !== 'fechado_perdido',
  },
  {
    key: 'awaitsign',
    label: 'Aguardando assinatura',
    match: (b: any) => b.status === 'assinatura_pendente',
  },
] as const;

export default function Bookings() {
  const { user } = useAuth();
  const storageKey = useMemo(() => `${STORAGE_PREFIX}:${user?.id ?? 'anon'}`, [user?.id]);
  const uiKey = useMemo(() => `${UI_STATE_PREFIX}:${user?.id ?? 'anon'}`, [user?.id]);
  const initial = useMemo(() => loadFilters(storageKey), [storageKey]);
  const initialUi = useMemo(() => loadUiState(uiKey), [uiKey]);

  /* ──────────── Filter state (preserva contrato com bookingsFilters lib) ──────────── */
  const [search, setSearch] = useState(initialUi?.search ?? initial.filters.search);
  const [statusFilter, setStatusFilter] = useState(initial.filters.status);
  const [sortBy, setSortBy] = useState<SortOption>(initial.filters.sort);
  const [view, setView] = useState<ViewMode>(initial.filters.view);
  const [page, setPage] = useState(initial.filters.page);
  const [pageSize, setPageSize] = useState<PageSize>(initial.filters.pageSize);
  const [savedFilter, setSavedFilter] = useState<string>('all');

  /* ──────────── Persist filters → localStorage ──────────── */
  useEffect(() => {
    const next: FiltersState = {
      search, status: statusFilter,
      transporte: 'todos', alimentacao: 'todos', uber: 'todos',
      sort: sortBy, view, page, pageSize,
    };
    try {
      window.localStorage.setItem(storageKey, serializeFilters(next));
    } catch { /* ignore quota/private mode */ }
  }, [search, statusFilter, sortBy, view, page, pageSize, storageKey]);

  /* ──────────── Auto-reset page when list-affecting filters change ──────────── */
  useEffect(() => {
    if (shouldResetPage({ search, status: statusFilter, sort: sortBy } as any, { search: '', status: 'todos', sort: 'data_desc' } as any)) {
      // shouldResetPage compares prev/next; in this simple impl we just snap to 1
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sortBy, savedFilter]);

  /* ──────────── Live UI state (search focus survives navigation) ──────────── */
  useEffect(() => {
    saveUiState(uiKey, {
      search,
      scrollY: window.scrollY,
      focusedId: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
    });
  }, [search, uiKey]);

  /* ──────────── Data ──────────── */
  const { data: bookings, isLoading, isError, refetch } = useBookings({
    search,
    status: statusFilter !== 'todos' ? statusFilter : undefined,
  });
  const updateStatus = useUpdateBookingStatus();
  const deleteBooking = useDeleteBooking();

  const allBookings = useMemo(() => (bookings ?? []) as any[], [bookings]);

  /* ──────────── Apply saved-filter chip + sort ──────────── */
  const filtered = useMemo(() => {
    const f = SAVED_FILTERS.find((s) => s.key === savedFilter);
    let list = f ? allBookings.filter(f.match) : allBookings;
    list = [...list].sort((a: any, b: any) => {
      const ad = a.data_evento || '';
      const bd = b.data_evento || '';
      return sortBy === 'data_asc' ? ad.localeCompare(bd) : bd.localeCompare(ad);
    });
    return list;
  }, [allBookings, savedFilter, sortBy]);

  /* ──────────── Phase counts + total value ──────────── */
  const phaseStats = useMemo(() => {
    return PIPELINE_PHASES.map((p) => {
      const inPhase = filtered.filter((b: any) => (p.statuses as readonly string[]).includes(b.status));
      const totalValue = inPhase.reduce((s: number, b: any) => s + (Number(b.fee_acordado) || 0), 0);
      return { ...p, items: inPhase, count: inPhase.length, totalValue };
    });
  }, [filtered]);
  const lostItems = useMemo(
    () => filtered.filter((b: any) => LOST_PHASE.statuses.includes(b.status)),
    [filtered],
  );
  const totalActive = phaseStats.reduce((s, p) => s + p.count, 0);
  const totalValue = phaseStats.reduce((s, p) => s + p.totalValue, 0);

  /* ──────────── DnD state ──────────── */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);

  const handleDrop = (phaseKey: string, targetStatusFallback: string) => {
    if (!draggingId) return;
    const booking = allBookings.find((b: any) => b.id === draggingId);
    if (!booking) return;

    const phase = PIPELINE_PHASES.find((p) => p.key === phaseKey);
    if (!phase) return;
    // If already in this phase, no-op. If not, move to first status of that phase.
    if ((phase.statuses as readonly string[]).includes(booking.status)) {
      setDraggingId(null);
      setDragOverPhase(null);
      return;
    }
    const target = (phase.statuses[0] as string) ?? targetStatusFallback;
    updateStatus.mutate(
      { id: booking.id, status: target as any },
      {
        onSuccess: () => {
          toast.success(`Movido para ${phase.label}`);
        },
      },
    );
    setDraggingId(null);
    setDragOverPhase(null);
  };

  /* ──────────── Form/Drawer state ──────────── */
  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  const openCreate = () => {
    setEditingBooking(null);
    setFormOpen(true);
  };
  const openEdit = (b: any) => {
    setEditingBooking(b);
    setFormOpen(true);
  };

  /* ──────────── DJ-mgmt conflict detection (overlap + travel-time) ──────────── */
  const conflictMap = useMemo(
    () => buildConflictMap(allBookings as any),
    [allBookings],
  );
  const conflictFor = (b: any): ConflictResult | undefined => conflictMap.get(b.id);
  const hasConflict = (b: any): boolean => conflictMap.has(b.id);
  const totalConflicts = conflictMap.size;

  /* ──────────── Pagination (apenas para Tabela) ──────────── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = clampPage(page, filtered.length, pageSize);
  const pageItems = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);
  useEffect(() => {
    if (pageClamped !== page) setPage(pageClamped);
  }, [pageClamped, page]);

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="PIPELINE"
        size="xl"
        accentHueA="hsl(var(--info))"
        accentHueB="hsl(var(--primary))"
        status={[
          { label: 'KANBAN · LIVE', tone: 'live' },
          { label: `▸ ${totalActive} ativos`, tone: 'muted' },
          ...(totalConflicts > 0
            ? [{ label: `⚠ ${totalConflicts} conflito${totalConflicts !== 1 ? 's' : ''}`, tone: 'danger' as const }]
            : []),
        ]}
        ticker={[
          { label: 'valor potencial', value: fmtBRL(totalValue), valueColor: 'hsl(var(--success))' },
          { label: 'fases', value: '6', valueColor: 'hsl(var(--info))' },
        ]}
        actions={
          <>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as ViewMode)}
              className="bg-background/60 backdrop-blur-sm border border-border/60 rounded-xl p-1"
            >
              <ToggleGroupItem value="kanban" aria-label="Pipeline" className="h-8 px-3 text-xs gap-1.5 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <Columns3 className="h-3.5 w-3.5" /> Pipeline
              </ToggleGroupItem>
              <ToggleGroupItem value="tabela" aria-label="Tabela" className="h-8 px-3 text-xs gap-1.5 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <LayoutGrid className="h-3.5 w-3.5" /> Tabela
              </ToggleGroupItem>
              <ToggleGroupItem value="cartoes" aria-label="Cards" className="h-8 px-3 text-xs gap-1.5 rounded-lg data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <CalIcon className="h-3.5 w-3.5" /> Cards
              </ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={openCreate} className="h-9 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Booking</span>
            </Button>
          </>
        }
      />

      {/* ════════ FILTERS BAR ════════ */}
      <Card className="p-3 md:p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex items-center grow min-w-[240px] max-w-md">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              id="bookings-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por evento, produtor, DJ ou local…"
              className="pl-8 h-9 bg-muted/30 border-border"
            />
          </div>

          {/* Saved-filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {SAVED_FILTERS.map((sf) => {
              const count =
                sf.key === 'all'
                  ? totalActive
                  : allBookings.filter(sf.match).length;
              const isActive = savedFilter === sf.key;
              return (
                <button
                  key={sf.key}
                  onClick={() => setSavedFilter(sf.key)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors"
                  style={{
                    background: isActive ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted))',
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                    borderColor: isActive ? 'hsl(var(--primary) / 0.45)' : 'hsl(var(--border-strong))',
                  }}
                  aria-pressed={isActive}
                >
                  {sf.label}
                  <span className="font-mono text-micro opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="grow" />

          {/* Status select */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[180px] bg-muted/30 border-border text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {BOOKING_STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-9 w-[150px] bg-muted/30 border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data_desc">Data: recente</SelectItem>
              <SelectItem value="data_asc">Data: antiga</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ════════ PHASE STRIP ════════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {phaseStats.map((p) => (
          <PhaseSummaryTile
            key={p.key}
            phase={p}
            count={p.count}
            totalValue={p.totalValue}
            onClick={() => setSavedFilter('all') /* reset; future: filter by phase */}
          />
        ))}
      </div>

      {/* ════════ KANBAN VIEW ════════ */}
      {view === 'kanban' && (
        <div className="overflow-x-auto -mx-4 md:mx-0 pb-2">
          <div
            className="grid grid-flow-col gap-3 px-4 md:px-0"
            style={{ gridAutoColumns: 'minmax(280px, 1fr)' }}
          >
            {phaseStats.map((p) => {
              const isOver = dragOverPhase === p.key;
              return (
                <PhaseKanbanColumn
                  key={p.key}
                  phase={p}
                  count={p.count}
                  isDragOver={isOver}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverPhase(p.key);
                  }}
                  onDragLeave={(e) => {
                    if (e.target === e.currentTarget) setDragOverPhase(null);
                  }}
                  onDrop={() => handleDrop(p.key, p.statuses[0] as string)}
                >
                  {p.items.map((b: any) => {
                    const conflict = hasConflict(b);
                    return (
                      <article
                        key={b.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(b.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', b.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverPhase(null);
                        }}
                        onClick={() => openEdit(b)}
                        className="bg-card-2 border rounded-[10px] p-3 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                        style={{
                          borderColor: conflict ? 'hsl(var(--destructive) / 0.45)' : 'hsl(var(--border))',
                          opacity: draggingId === b.id ? 0.4 : 1,
                          transform: draggingId === b.id ? 'rotate(1deg) scale(0.98)' : undefined,
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span
                            className="text-micro px-1.5 py-0.5 rounded border whitespace-nowrap"
                            style={{ background: p.bg, color: p.color, borderColor: p.border }}
                          >
                            {statusLabel(b.status)}
                          </span>
                          {conflict && (() => {
                            const cr = conflictFor(b);
                            return (
                              <span
                                className="text-micro px-1.5 py-0.5 rounded font-medium cursor-help"
                                style={{
                                  background: 'hsl(var(--destructive) / 0.2)',
                                  color: 'hsl(var(--destructive))',
                                }}
                                title={cr?.message ?? 'Conflito de agenda detectado'}
                              >
                                ⚠ {cr?.type === 'travel' ? 'travel time' : 'conflito DJ'}
                              </span>
                            );
                          })()}
                          {/* Hold badge — hold_until pode não existir ainda; describeHold handles null */}
                          {b.hold_until && (() => {
                            const h = describeHold(b.hold_until);
                            const toneStyle =
                              h.tone === 'destructive'
                                ? { background: 'hsl(var(--destructive) / 0.15)', color: 'hsl(var(--destructive))' }
                                : h.tone === 'warning'
                                ? { background: 'hsl(var(--warning) / 0.15)', color: 'hsl(var(--warning))' }
                                : { background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' };
                            return (
                              <span
                                className="text-micro px-1.5 py-0.5 rounded font-medium font-mono"
                                style={toneStyle}
                                title={`Hold: ${h.label}`}
                              >
                                🕒 {h.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="font-medium text-[13.5px] truncate">{b.titulo}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {b.producers?.nome ? `${b.producers.nome} · ` : ''}
                          {b.data_evento ? format(new Date(b.data_evento), 'dd MMM', { locale: ptBR }) : 'sem data'}
                          {b.djs?.nome_artistico ? ` · ${b.djs.nome_artistico}` : ''}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-mini text-muted-foreground">
                          <span className="font-mono">{fmtBRL(b.fee_acordado)}</span>
                        </div>
                      </article>
                    );
                  })}
                </PhaseKanbanColumn>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════ TABELA VIEW ════════ */}
      {view === 'tabela' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-mini uppercase tracking-wider text-muted-foreground font-mono bg-muted/30">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Evento</th>
                  <th className="px-4 py-2.5 font-medium">Produtor</th>
                  <th className="px-4 py-2.5 font-medium">DJ</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium text-right">Fee</th>
                  <th className="px-4 py-2.5 font-medium">Fase</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-sm text-muted-foreground">
                      Nenhum booking encontrado · tente limpar os filtros ou{' '}
                      <button onClick={openCreate} className="text-primary hover:underline">
                        criar um novo →
                      </button>
                    </td>
                  </tr>
                ) : (
                  pageItems.map((b: any) => {
                    const conflict = hasConflict(b);
                    return (
                      <tr key={b.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openEdit(b)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{b.titulo}</span>
                            {conflict && (
                              <Badge
                                variant="outline"
                                className="text-micro px-1.5 py-0 gap-1"
                                style={{
                                  background: 'hsl(var(--destructive) / 0.15)',
                                  color: 'hsl(var(--destructive))',
                                  borderColor: 'hsl(var(--destructive) / 0.4)',
                                }}
                              >
                                <AlertTriangle className="h-2.5 w-2.5" /> conflito
                              </Badge>
                            )}
                          </div>
                          {(b.cidade || b.venue) && (
                            <div className="text-xs text-muted-foreground truncate">{b.cidade || b.venue}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{b.producers?.nome ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.djs?.nome_artistico ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {b.data_evento ? format(new Date(b.data_evento), 'dd MMM yyyy', { locale: ptBR }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{fmtBRL(b.fee_acordado)}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const pill = bookingStatusToPill(b.status);
                            return <StatusPill variant={pill.variant} size="sm">{pill.label}</StatusPill>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                            e.stopPropagation();
                            openEdit(b);
                          }}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border/40 flex-wrap">
            <div className="text-xs text-muted-foreground tabular-nums">
              {filtered.length === 0
                ? '0 resultados'
                : `${(pageClamped - 1) * pageSize + 1}–${Math.min(pageClamped * pageSize, filtered.length)} de ${filtered.length}`}
            </div>
            <div className="flex items-center gap-3">
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as PageSize)}>
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_VALUES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={pageClamped <= 1} onClick={() => setPage(pageClamped - 1)}>
                  <span aria-hidden>‹</span>
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums px-2 min-w-[60px] text-center">
                  {pageClamped} / {totalPages}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={pageClamped >= totalPages} onClick={() => setPage(pageClamped + 1)}>
                  <span aria-hidden>›</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ════════ CARDS VIEW ════════ */}
      {view === 'cartoes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pageItems.map((b: any) => {
            const conflict = hasConflict(b);
            return (
              <Card
                key={b.id}
                onClick={() => openEdit(b)}
                className="p-4 cursor-pointer hover:border-primary/45 transition-colors"
                style={conflict ? { borderColor: 'hsl(var(--destructive) / 0.45)' } : undefined}
              >
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {(() => {
                    const pill = bookingStatusToPill(b.status);
                    return <StatusPill variant={pill.variant} size="sm">{pill.label}</StatusPill>;
                  })()}
                  {conflict && (() => {
                    const cr = conflictFor(b);
                    return (
                      <StatusPill
                        variant="perdido"
                        size="sm"
                        title={cr?.message ?? 'Conflito de agenda'}
                      >
                        ⚠ {cr?.type === 'travel' ? 'travel time' : 'conflito'}
                      </StatusPill>
                    );
                  })()}
                  {b.hold_until && (() => {
                    const h = describeHold(b.hold_until);
                    const variant =
                      h.tone === 'destructive' ? 'vencido' :
                      h.tone === 'warning' ? 'pendente' : 'pago';
                    return (
                      <StatusPill variant={variant} size="sm" title={`Hold: ${h.label}`}>
                        🕒 {h.label}
                      </StatusPill>
                    );
                  })()}
                </div>
                <div className="font-medium truncate">{b.titulo}</div>
                <div className="text-sm text-muted-foreground truncate mt-0.5">
                  {b.producers?.nome ?? '—'}
                  {b.djs?.nome_artistico ? ` · ${b.djs.nome_artistico}` : ''}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">
                    {b.data_evento ? format(new Date(b.data_evento), 'dd MMM yyyy', { locale: ptBR }) : '—'}
                  </span>
                  <span className="font-mono font-medium">{fmtBRL(b.fee_acordado)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Lost/cancelled (collapsible block) */}
      {lostItems.length > 0 && (
        <details className="rounded-lg border border-border bg-card overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Perdidos / cancelados</span>
            <Badge variant="outline" className="font-mono text-micro">
              {lostItems.length}
            </Badge>
          </summary>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 opacity-65">
            {lostItems.map((b: any) => (
              <div key={b.id} className="card-2 p-3 rounded-md text-sm" onClick={() => openEdit(b)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{b.titulo}</span>
                  <span className="text-micro font-mono text-muted-foreground line-through">
                    {fmtBRL(b.fee_acordado)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{statusLabel(b.status)}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ════════ FORM (existing component, preserved) ════════ */}
      <BookingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        booking={editingBooking}
        onSuccess={() => {
          setFormOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
