import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollText, Search, Calendar as CalendarIcon, RotateCcw, ChevronLeft, ChevronRight, Eye, Plus, Pencil, Trash2, Loader2, Download, FileText, FileSpreadsheet, Filter, Activity } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EditorialHero } from '@/components/ui/EditorialHero';

const STORAGE_KEY = 'audit-logs:filters:v1';
const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
type PageSize = typeof PAGE_SIZE_OPTIONS[number];

const ENTITY_TYPES = [
  { value: 'all', label: 'Todas as tabelas' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'contracts', label: 'Contratos' },
  { value: 'financial_records', label: 'Financeiro' },
] as const;

const ACTIONS = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'create', label: 'Criação' },
  { value: 'update', label: 'Edição' },
  { value: 'delete', label: 'Exclusão' },
] as const;

interface Filters {
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  dateFrom: string | null;
  dateTo: string | null;
  pageSize: PageSize;
}

const DEFAULT_FILTERS: Filters = {
  userId: '',
  entityType: 'all',
  entityId: '',
  action: 'all',
  dateFrom: null,
  dateTo: null,
  pageSize: 50,
};

const loadFilters = (): Filters => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch { return DEFAULT_FILTERS; }
};

const actionMeta = (action: string) => {
  switch (action) {
    case 'create': return { label: 'Criação', icon: Plus, color: 'bg-success/10 text-success border-success/30' };
    case 'update': return { label: 'Edição', icon: Pencil, color: 'bg-info/10 text-info border-info/30' };
    case 'delete': return { label: 'Exclusão', icon: Trash2, color: 'bg-destructive/10 text-destructive border-destructive/30' };
    default: return { label: action, icon: Pencil, color: 'bg-muted text-muted-foreground border-border' };
  }
};

const entityLabel = (t: string | null) => {
  if (!t) return '—';
  const m = ENTITY_TYPES.find(e => e.value === t);
  return m?.label ?? t;
};

export default function AuditLogs() {
  const [filters, setFilters] = useState<Filters>(() => loadFilters());
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<any | null>(null);

  // Persist filters
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    setPage(1);
  }, [filters]);

  const offset = (page - 1) * filters.pageSize;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs-list', filters, page],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('id, user_id, action, entity_type, entity_id, created_at, details', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters.entityType !== 'all') q = q.eq('entity_type', filters.entityType);
      if (filters.action !== 'all') q = q.eq('action', filters.action);
      if (filters.entityId.trim()) q = q.eq('entity_id', filters.entityId.trim());
      if (filters.userId.trim()) q = q.eq('user_id', filters.userId.trim());
      if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);

      const { data, error, count } = await q.range(offset, offset + filters.pageSize - 1);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const userIds = useMemo(
    () => Array.from(new Set((data?.rows ?? []).map(r => r.user_id).filter(Boolean))) as string[],
    [data]
  );

  const { data: profiles } = useQuery({
    queryKey: ['audit-profiles', userIds.sort().join(',')],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      return Object.fromEntries((data ?? []).map(p => [p.user_id, p.full_name ?? 'Usuário']));
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / filters.pageSize));
  const update = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters(f => ({ ...f, [k]: v }));
  const reset = () => { setFilters(DEFAULT_FILTERS); localStorage.removeItem(STORAGE_KEY); };

  const activeFiltersCount = [
    filters.userId, filters.entityId, filters.dateFrom, filters.dateTo,
    filters.entityType !== 'all' ? '1' : '', filters.action !== 'all' ? '1' : '',
  ].filter(Boolean).length;

  // Exporters: re-fetch ALL filtered rows (no pagination) up to a hard cap
  const fetchAllFiltered = async () => {
    let q = supabase
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, created_at, details')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (filters.entityType !== 'all') q = q.eq('entity_type', filters.entityType);
    if (filters.action !== 'all') q = q.eq('action', filters.action);
    if (filters.entityId.trim()) q = q.eq('entity_id', filters.entityId.trim());
    if (filters.userId.trim()) q = q.eq('user_id', filters.userId.trim());
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  };

  const userNameFor = (uid: string | null) =>
    uid ? (profiles?.[uid] ?? uid) : 'Sistema';

  const filterSummary = () => {
    const parts: string[] = [];
    parts.push(`Tabela: ${ENTITY_TYPES.find(e => e.value === filters.entityType)?.label}`);
    parts.push(`Ação: ${ACTIONS.find(a => a.value === filters.action)?.label}`);
    if (filters.userId) parts.push(`Usuário: ${filters.userId}`);
    if (filters.entityId) parts.push(`Entidade: ${filters.entityId}`);
    if (filters.dateFrom) parts.push(`De: ${filters.dateFrom}`);
    if (filters.dateTo) parts.push(`Até: ${filters.dateTo}`);
    return parts.join(' • ');
  };

  const exportCSV = async () => {
    try {
      const rows = await fetchAllFiltered();
      if (!rows.length) { toast.error('Nada para exportar'); return; }
      const header = ['Quando', 'Usuário (ID)', 'Usuário (Nome)', 'Ação', 'Tabela', 'Entidade', 'Detalhes (JSON)'];
      const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const lines = [
        header.map(escape).join(','),
        ...rows.map(r => [
          format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss"),
          r.user_id ?? '',
          userNameFor(r.user_id),
          r.action,
          r.entity_type ?? '',
          r.entity_id ?? '',
          JSON.stringify(r.details ?? {}),
        ].map(escape).join(','))
      ];
      const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} registros exportados`);
    } catch (e) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const exportPDF = async () => {
    try {
      const rows = await fetchAllFiltered();
      if (!rows.length) { toast.error('Nada para exportar'); return; }
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = (autoTableMod as any).default || (autoTableMod as any);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFontSize(14);
      doc.text('Relatório de Auditoria', 40, 40);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}`, 40, 56);
      doc.text(`Filtros: ${filterSummary()}`, 40, 70);
      doc.text(`Total de registros: ${rows.length}`, 40, 84);

      autoTable(doc, {
        startY: 100,
        head: [['Quando', 'Usuário', 'Ação', 'Tabela', 'Entidade', 'Resumo']],
        body: rows.map(r => {
          const detail = r.details as any;
          const summary = detail?.after
            ? `${Object.keys(detail.after).slice(0, 4).join(', ')}${Object.keys(detail.after).length > 4 ? '…' : ''}`
            : '—';
          return [
            format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
            userNameFor(r.user_id),
            r.action,
            entityLabel(r.entity_type),
            r.entity_id ? r.entity_id.slice(0, 8) + '…' : '—',
            summary.slice(0, 60),
          ];
        }),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [20, 20, 30], textColor: [255, 133, 51] },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        margin: { left: 40, right: 40 },
      });

      doc.save(`audit-logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`);
      toast.success(`${rows.length} registros exportados`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF');
    }
  };

  // Action quick-filter chips with semantic colors
  const ACTION_CHIPS = [
    { value: 'create', label: 'Criação', Icon: Plus, color: 'success' as const },
    { value: 'update', label: 'Edição', Icon: Pencil, color: 'info' as const },
    { value: 'delete', label: 'Exclusão', Icon: Trash2, color: 'destructive' as const },
  ];

  const chipClass = (color: 'success' | 'info' | 'destructive', pressed: boolean) => {
    const palette = {
      success: { on: 'bg-success/15 text-success border-success/40', off: 'border-success/20 text-success/70 hover:bg-success/10' },
      info: { on: 'bg-info/15 text-info border-info/40', off: 'border-info/20 text-info/70 hover:bg-info/10' },
      destructive: { on: 'bg-destructive/15 text-destructive border-destructive/40', off: 'border-destructive/20 text-destructive/70 hover:bg-destructive/10' },
    };
    return pressed ? palette[color].on : palette[color].off;
  };

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title="AUDIT LOGS"
        size="lg"
        accentHueA="hsl(var(--info))"
        accentHueB="hsl(var(--slate))"
        status={[
          { label: 'FORENSIC · LIVE', tone: 'live' },
          { label: `▸ ${data?.count?.toLocaleString('pt-BR') ?? 0} registros`, tone: 'muted' },
          ...(activeFiltersCount > 0
            ? [{ label: `◆ ${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''}`, tone: 'info' as const }]
            : []),
        ]}
        subtitle={
          <p className="font-mono uppercase tracking-[0.14em] text-mini">
            audit trail compliance · busca por usuário · tabela · entidade · período
          </p>
        }
        actions={
          <>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={reset} className="h-9 gap-2 backdrop-blur-sm bg-background/60">
                <RotateCcw className="h-3.5 w-3.5" />
                Limpar ({activeFiltersCount})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPDF}>
                  <FileText className="h-4 w-4 mr-2" /> PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Action quick-filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Filter className="h-3 w-3" />
          Ação:
        </span>
        <button
          type="button"
          onClick={() => update('action', 'all')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-mini font-medium transition-colors',
            filters.action === 'all'
              ? 'bg-foreground/5 text-foreground border-border'
              : 'border-border/50 text-muted-foreground hover:bg-muted/40',
          )}
        >
          Todas
        </button>
        {ACTION_CHIPS.map((c) => {
          const pressed = filters.action === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => update('action', pressed ? 'all' : c.value)}
              aria-pressed={pressed}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-mini font-medium transition-colors',
                chipClass(c.color, pressed),
              )}
            >
              <c.Icon className="h-3 w-3" />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <Select value={filters.entityType} onValueChange={(v) => update('entityType', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.action} onValueChange={(v) => update('action', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="ID do usuário"
              value={filters.userId}
              onChange={(e) => update('userId', e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="ID da entidade"
              value={filters.entityId}
              onChange={(e) => update('entityId', e.target.value)}
              className="pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !filters.dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(new Date(filters.dateFrom), 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                onSelect={(d) => update('dateFrom', d ? d.toISOString().slice(0, 10) : null)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal", !filters.dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(new Date(filters.dateTo), 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                onSelect={(d) => update('dateTo', d ? d.toISOString().slice(0, 10) : null)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Results — timeline */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-xs">Carregando registros…</p>
            </div>
          ) : !data?.rows.length ? (
            <div className="py-16 text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 border border-border">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhum registro encontrado</p>
              <p className="text-xs text-muted-foreground">
                {activeFiltersCount > 0
                  ? 'Tente ajustar ou limpar os filtros aplicados.'
                  : 'Ações do sistema aparecerão aqui assim que ocorrerem.'}
              </p>
            </div>
          ) : (
            <div className="relative px-4 py-3">
              {/* Timeline rail */}
              <div className="absolute left-[31px] top-0 bottom-0 w-px bg-border/60" aria-hidden />

              <div className="space-y-1">
                {data.rows.map((log) => {
                  const meta = actionMeta(log.action);
                  const Icon = meta.icon;
                  const userName = log.user_id
                    ? (profiles?.[log.user_id] ?? log.user_id.slice(0, 8))
                    : 'Sistema';
                  return (
                    <div
                      key={log.id}
                      className="relative pl-12 pr-2 py-2.5 rounded-md hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => setDetailLog(log)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDetailLog(log)}
                    >
                      {/* Dot */}
                      <span
                        className={cn(
                          'absolute left-5 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card',
                          meta.color,
                        )}
                        aria-hidden
                      >
                        <Icon className="h-2.5 w-2.5" />
                      </span>

                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className={`${meta.color} gap-1.5 flex-shrink-0 text-micro`}>
                          {meta.label}
                        </Badge>
                        <p className="text-sm truncate min-w-0 flex-1">
                          <span className="font-medium">{userName}</span>
                          <span className="text-muted-foreground"> em </span>
                          <span className="text-primary font-medium">{entityLabel(log.entity_type)}</span>
                          {log.entity_id && (
                            <span className="text-muted-foreground ml-2 font-mono text-mini">
                              · {log.entity_id.slice(0, 8)}…
                            </span>
                          )}
                        </p>
                        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setDetailLog(log); }}
                          aria-label="Ver detalhes"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {data && data.count > 0 && (
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border/50 flex-wrap">
              <div className="text-xs text-muted-foreground tabular-nums">
                {offset + 1}–{Math.min(offset + filters.pageSize, data.count)} de {data.count}
              </div>
              <div className="flex items-center gap-3">
                <Select value={String(filters.pageSize)} onValueChange={(v) => update('pageSize', Number(v) as PageSize)}>
                  <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs tabular-nums px-2">{page}/{totalPages}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailLog} onOpenChange={(o) => !o && setDetailLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do log</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Ação:</span> {actionMeta(detailLog.action).label}</div>
                <div><span className="text-muted-foreground">Tabela:</span> {entityLabel(detailLog.entity_type)}</div>
                <div className="col-span-2 font-mono text-xs"><span className="text-muted-foreground font-sans">Entidade:</span> {detailLog.entity_id ?? '—'}</div>
                <div className="col-span-2 font-mono text-xs"><span className="text-muted-foreground font-sans">Usuário:</span> {detailLog.user_id ?? 'Sistema'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Quando:</span> {format(new Date(detailLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</div>
              </div>
              <pre className="text-xs bg-muted/30 p-3 rounded overflow-auto max-h-[400px] font-mono">
                {JSON.stringify(detailLog.details, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}