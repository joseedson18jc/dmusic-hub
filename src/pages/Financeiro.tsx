import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, Plus, Search, MoreHorizontal,
  Pencil, Trash2, Loader2, Download, Phone, History as HistoryIcon, FileSpreadsheet, FileText,
} from 'lucide-react';
import { AuditHistory } from '@/components/AuditHistory';
import {
  useFinancialRecords, useFinancialSummary, useDeleteFinancial, useFinancialReports,
  FINANCIAL_TYPES, PAYMENT_STATUSES,
} from '@/hooks/useFinancial';
import { ListSkeleton, ErrorState } from '@/components/states';
import { FinancialForm } from '@/components/financial/FinancialForm';
import { exportToPDF, exportToXLSX, type ExportColumn } from '@/lib/export';
import { formatShortDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { ModernChartTooltip } from '@/components/charts/ModernChartTooltip';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtCompact = (v: number) =>
  Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}K` : `R$ ${v.toFixed(0)}`;

/** Mapping cru → grupo semântico para o donut. */
const CATEGORY_GROUPS: Array<{ key: string; label: string; color: string; types: string[] }> = [
  {
    key: 'bookings',
    label: 'Bookings',
    color: 'hsl(var(--primary))',
    types: ['receita', 'sinal', 'pagamento_final', 'parcela'],
  },
  {
    key: 'repasses',
    label: 'Repasses',
    color: 'hsl(var(--violet))',
    types: ['repasse_dj', 'repasse_produtor'],
  },
  {
    key: 'comissoes',
    label: 'Comissões',
    color: 'hsl(var(--info))',
    types: ['comissao'],
  },
  {
    key: 'despesas',
    label: 'Desp. operacional',
    color: 'hsl(var(--destructive))',
    types: ['despesa', 'imposto'],
  },
  {
    key: 'outros',
    label: 'Outros',
    color: 'hsl(var(--slate))',
    types: ['reembolso', 'cancelamento', 'multa', 'chargeback', 'ajuste'],
  },
];

/** Status pill com hue distinto (não opacity ramps). */
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pago: { label: 'Pago', bg: 'hsl(var(--success) / 0.14)', color: 'hsl(var(--success))', border: 'hsl(var(--success) / 0.35)' },
    pendente: { label: 'Pendente', bg: 'hsl(var(--warning) / 0.14)', color: 'hsl(var(--warning))', border: 'hsl(var(--warning) / 0.35)' },
    vencido: { label: 'Vencido', bg: 'hsl(var(--destructive) / 0.14)', color: 'hsl(var(--destructive))', border: 'hsl(var(--destructive) / 0.35)' },
    parcial: { label: 'Parcial', bg: 'hsl(var(--info) / 0.14)', color: 'hsl(var(--info))', border: 'hsl(var(--info) / 0.35)' },
    cancelado: { label: 'Cancelado', bg: 'hsl(var(--slate) / 0.14)', color: 'hsl(var(--lead-text))', border: 'hsl(var(--slate) / 0.35)' },
  };
  const s = map[status] ?? map.cancelado;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-mini leading-tight border whitespace-nowrap"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

export default function Financeiro() {
  /* ──────────── Filter state ──────────── */
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState<'all' | 'receita' | 'despesa' | 'repasse' | 'vencido'>('all');

  /* ──────────── Form / delete state ──────────── */
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  /* ──────────── Data ──────────── */
  const { data: records, isLoading, error, refetch } = useFinancialRecords({
    search,
    tipo: tipoFilter,
    status: statusFilter,
  });
  const { data: summary } = useFinancialSummary();
  const { data: reports } = useFinancialReports();
  const deleteMutation = useDeleteFinancial();

  /* ──────────── Period selector (visualização das séries) ──────────── */
  const [period, setPeriod] = useState<'7d' | '30d' | 'mes' | 'trim' | 'ano'>('mes');
  const monthsForPeriod = period === 'ano' ? 12 : period === 'trim' ? 3 : period === 'mes' ? 6 : 12;
  const monthlyData = useMemo(
    () => (reports?.monthly ?? []).slice(-monthsForPeriod),
    [reports?.monthly, monthsForPeriod],
  );

  /* ──────────── KPIs ──────────── */
  const totalRevenue = summary?.receita ?? 0;
  const totalExpenses = summary?.despesa ?? 0;
  const netProfit = (summary?.lucro ?? 0);
  const overdueCount = summary?.vencidos ?? 0;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const meta = 60000;
  const targetProgress = meta > 0 ? Math.min(100, Math.round((netProfit / meta) * 100)) : 0;

  // Sparklines: derivar dos últimos 6 monthlies se disponível
  const sparkReceita = useMemo(
    () => (reports?.monthly ?? []).slice(-6).map((m: any) => Number(m.receita) || 0),
    [reports?.monthly],
  );
  const sparkDespesa = useMemo(
    () => (reports?.monthly ?? []).slice(-6).map((m: any) => Number(m.despesa) || 0),
    [reports?.monthly],
  );

  /* ──────────── Donut categorias (5 grupos) ──────────── */
  const donutData = useMemo(() => {
    const cat = reports?.byCategory ?? [];
    const lookup: Record<string, number> = {};
    cat.forEach((c: any) => {
      const t = FINANCIAL_TYPES.find((ft) => ft.label === c.name);
      const tipo = t?.value ?? c.name;
      lookup[tipo] = c.value;
    });
    const groups = CATEGORY_GROUPS.map((g) => ({
      ...g,
      value: g.types.reduce((s, t) => s + (lookup[t] ?? 0), 0),
    }));
    const total = groups.reduce((s, g) => s + g.value, 0);
    return { groups, total };
  }, [reports?.byCategory]);

  /* ──────────── Top DJs / Producers ──────────── */
  const topDJs = useMemo(() => (reports?.byDJ ?? []).slice(0, 5), [reports?.byDJ]);
  const topProducers = useMemo(() => (reports?.byProducer ?? []).slice(0, 5), [reports?.byProducer]);
  const maxDJ = topDJs[0]?.total || 1;
  const maxProducer = topProducers[0]?.total || 1;

  /* ──────────── Tab → tipo filter sync ──────────── */
  useEffect(() => {
    if (activeTab === 'all') {
      setTipoFilter('todos');
      setStatusFilter('todos');
    } else if (activeTab === 'receita') {
      setTipoFilter('receita');
      setStatusFilter('todos');
    } else if (activeTab === 'despesa') {
      setTipoFilter('despesa');
      setStatusFilter('todos');
    } else if (activeTab === 'repasse') {
      setTipoFilter('repasse_dj');
      setStatusFilter('todos');
    } else if (activeTab === 'vencido') {
      setTipoFilter('todos');
      setStatusFilter('vencido');
    }
  }, [activeTab]);

  const allRecords = useMemo(() => (records ?? []) as any[], [records]);
  const overdueRecords = useMemo(
    () => allRecords.filter((r) => r.status === 'vencido'),
    [allRecords],
  );
  const overdueAmount = useMemo(
    () => overdueRecords.reduce((s, r) => s + Number(r.valor_bruto), 0),
    [overdueRecords],
  );
  const overdueOldest = useMemo(() => {
    const sorted = [...overdueRecords].sort((a, b) =>
      (a.data_vencimento || '').localeCompare(b.data_vencimento || ''),
    );
    const oldest = sorted[0];
    if (!oldest?.data_vencimento) return null;
    const days = Math.floor((Date.now() - new Date(oldest.data_vencimento).getTime()) / 86400000);
    return { name: oldest.producers?.nome || oldest.djs?.nome_artistico || oldest.descricao || '—', days };
  }, [overdueRecords]);

  /* ──────────── Export ──────────── */
  const exportColumns: ExportColumn<any>[] = [
    { header: 'Data', accessor: (r) => formatShortDate(r.data_vencimento) || '—' },
    { header: 'Descrição', accessor: (r) => r.descricao ?? '' },
    { header: 'Tipo', accessor: (r) => r.tipo ?? '' },
    { header: 'Valor', accessor: (r) => Number(r.valor_bruto) || 0 },
    { header: 'Status', accessor: (r) => r.status ?? '' },
  ];
  const handleExportXLSX = async () => {
    await exportToXLSX(`financeiro-${new Date().toISOString().split('T')[0]}.xlsx`, exportColumns, allRecords);
    toast.success('Exportado para XLSX');
  };
  const handleExportPDF = async () => {
    await exportToPDF(`financeiro-${new Date().toISOString().split('T')[0]}.pdf`, 'Relatório Financeiro', exportColumns, allRecords);
    toast.success('Exportado para PDF');
  };

  /* ──────────── Handlers ──────────── */
  const handleNew = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };
  const handleEdit = (r: any) => {
    setEditingRecord(r);
    setFormOpen(true);
  };
  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
      },
    });
  };

  if (isLoading) return <ListSkeleton />;
  if (error) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      {/* ════════ HERO — editorial / cyberpunk ════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 via-card/50 to-card/30 backdrop-blur-sm">
        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl opacity-60" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-success/15 blur-3xl opacity-50" />
        {/* Grid scan-line overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 75%)',
          }}
        />
        {/* Corner brackets — HUD aesthetic */}
        <span aria-hidden className="pointer-events-none absolute top-3 left-3 h-3 w-3 border-l-2 border-t-2 border-primary/60" />
        <span aria-hidden className="pointer-events-none absolute top-3 right-3 h-3 w-3 border-r-2 border-t-2 border-primary/60" />
        <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-l-2 border-b-2 border-primary/60" />
        <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-r-2 border-b-2 border-primary/60" />

        <div className="relative p-6 md:p-8">
          {/* Status strip */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="flex items-center gap-1.5 text-mini font-mono uppercase tracking-[0.18em] text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
              </span>
              SYSTEM · LIVE
            </span>
            <span className="text-mini font-mono uppercase tracking-[0.18em] text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-mini font-mono uppercase tracking-[0.18em] text-muted-foreground">
              ▸ {monthlyData.length}m janela
            </span>
            {overdueAmount > 0 && (
              <span className="text-mini font-mono uppercase tracking-[0.18em] text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> {overdueCount} atrasado{overdueCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="space-y-1">
              <h1
                className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95]"
                style={{
                  background: 'linear-gradient(115deg, hsl(var(--foreground)) 0%, hsl(var(--foreground)) 40%, hsl(var(--primary)) 70%, hsl(var(--magenta, 320 70% 65%)) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                FINANCEIRO
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground/80 font-mono uppercase tracking-[0.14em] flex items-center gap-2 flex-wrap">
                <span>fluxo</span>
                <span className="text-success font-semibold">{fmt(totalRevenue)}</span>
                <span className="opacity-40">/</span>
                <span>lucro</span>
                <span className="text-primary font-semibold">{fmt(netProfit)}</span>
                <span className="opacity-40">/</span>
                <span>margem</span>
                <span className="text-foreground font-semibold">{profitMargin.toFixed(1).replace('.', ',')}%</span>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-background/60 border border-border/60 backdrop-blur-sm">
                {(['7d', '30d', 'mes', 'trim', 'ano'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-all duration-200"
                    style={{
                      background: period === p ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)' : 'transparent',
                      color: period === p ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                      boxShadow: period === p ? '0 0 20px hsl(var(--primary)/0.4)' : 'none',
                    }}
                  >
                    {p === '7d' ? '7d' : p === '30d' ? '30d' : p === 'mes' ? 'Mês' : p === 'trim' ? 'Trim.' : 'Ano'}
                  </button>
                ))}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 backdrop-blur-sm bg-background/60">
                    <Download className="h-4 w-4" /> Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportXLSX}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={handleNew}
                size="sm"
                className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
              >
                <Plus className="h-4 w-4" /> Lançamento
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ TABS ════════ */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="all">
            Visão Geral <span className="text-micro font-mono opacity-60 ml-1">{allRecords.length}</span>
          </TabsTrigger>
          <TabsTrigger value="receita">
            Receitas <span className="text-micro font-mono opacity-60 ml-1">{allRecords.filter((r) => ['receita', 'sinal', 'pagamento_final', 'parcela'].includes(r.tipo)).length}</span>
          </TabsTrigger>
          <TabsTrigger value="despesa">
            Despesas <span className="text-micro font-mono opacity-60 ml-1">{allRecords.filter((r) => r.tipo === 'despesa').length}</span>
          </TabsTrigger>
          <TabsTrigger value="repasse">
            Repasses <span className="text-micro font-mono opacity-60 ml-1">{allRecords.filter((r) => r.tipo === 'repasse_dj' || r.tipo === 'repasse_produtor').length}</span>
          </TabsTrigger>
          <TabsTrigger value="vencido" className="data-[state=active]:text-destructive">
            Vencidos <span className="text-micro font-mono opacity-60 ml-1 text-destructive">{overdueCount}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ════════ KPI CARDS — editorial blocks com massive numerics ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Receita */}
        <KpiBlock
          label="Receita"
          accentColor="hsl(var(--success))"
          icon={<TrendingUp className="h-4 w-4" />}
          value={fmtCompact(totalRevenue)}
          rawValue={totalRevenue}
          footer={<Sparkline data={sparkReceita} color="hsl(var(--success))" />}
        />

        {/* Despesa */}
        <KpiBlock
          label="Despesa"
          accentColor="hsl(var(--destructive))"
          icon={<TrendingDown className="h-4 w-4" />}
          value={fmtCompact(totalExpenses)}
          rawValue={totalExpenses}
          footer={<Sparkline data={sparkDespesa} color="hsl(var(--destructive))" dashed />}
        />

        {/* Lucro */}
        <KpiBlock
          label="Lucro líquido"
          accentColor="hsl(var(--primary))"
          icon={<DollarSign className="h-4 w-4" />}
          value={fmtCompact(netProfit)}
          rawValue={netProfit}
          highlight
          footer={
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-mini font-mono uppercase tracking-wider text-muted-foreground/80">
                <span>margem · {profitMargin.toFixed(1).replace('.', ',')}%</span>
                <span>{targetProgress}% / meta</span>
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden bg-muted/60">
                <div
                  className="h-full transition-[width] duration-700 relative overflow-hidden"
                  style={{
                    width: `${targetProgress}%`,
                    background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.6) 100%)',
                    boxShadow: '0 0 12px hsl(var(--primary)/0.6)',
                  }}
                >
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
                </div>
              </div>
            </div>
          }
        />

        {/* Vencidos */}
        <KpiBlock
          label="Vencidos"
          accentColor={overdueCount > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'}
          icon={overdueCount > 0 ? <AlertTriangle className="h-4 w-4 animate-pulse" /> : <DollarSign className="h-4 w-4 opacity-60" />}
          value={fmtCompact(overdueAmount)}
          rawValue={overdueAmount}
          subtitleRight={`${overdueCount} ${overdueCount === 1 ? 'item' : 'itens'}`}
          danger={overdueCount > 0}
          footer={
            <div className="space-y-2">
              {overdueOldest && (
                <p className="text-mini text-muted-foreground font-mono uppercase tracking-wider truncate">
                  ◆ {overdueOldest.days}d · {overdueOldest.name}
                </p>
              )}
              {overdueCount > 0 && (
                <Button
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5 bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/40 hover:border-destructive/60 transition-all"
                  variant="outline"
                  onClick={() => setActiveTab('vencido')}
                >
                  <Phone className="h-3 w-3" /> Cobrar agora →
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* ════════ AREA CHART (12m) + DONUT (categoria) ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <CardTitle className="text-base font-semibold">
                Receita · Despesa · Lucro · {monthlyData.length} meses
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                passe o mouse sobre o gráfico para ver valores
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: 'hsl(var(--success))' }} />
                Receita
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[2px] w-3"
                  style={{
                    background:
                      'repeating-linear-gradient(to right, hsl(var(--destructive)) 0 3px, transparent 3px 6px)',
                  }}
                />
                Despesa
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Lucro
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fin-gradSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.55} />
                  <stop offset="60%" stopColor="hsl(var(--success))" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--chart-grid))" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--chart-axis))" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--chart-axis))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(Number(v))} width={48} />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.4 }}
                content={<ModernChartTooltip formatter={(v) => fmt(Number(v))} />}
              />
              <Area
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke="hsl(var(--success))"
                strokeWidth={2.5}
                fill="url(#fin-gradSuccess)"
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
              <Line type="monotone" dataKey="despesa" name="Despesa" stroke="hsl(var(--destructive))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Donut · 5 grupos */}
        <Card className="p-5">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base font-semibold">Composição</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">por tipo de lançamento</p>
          </CardHeader>
          <CardContent className="p-0">
            <DonutChart data={donutData.groups} total={donutData.total} />
          </CardContent>
        </Card>
      </div>

      {/* ════════ TOP DJs + PRODUTORES ════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Top DJs · receita</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">somente lançamentos pagos</p>
            </div>
          </CardHeader>
          <ol className="space-y-3.5">
            {topDJs.length === 0 ? (
              <li className="text-sm text-muted-foreground text-center py-6">Sem dados ainda</li>
            ) : (
              topDJs.map((dj: any, i: number) => (
                <li key={dj.name + i}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground/60 w-4">{i + 1}</span>
                      <span
                        className="h-7 w-7 rounded-full flex items-center justify-center text-mini font-medium shrink-0 text-white"
                        style={{
                          background:
                            i === 0
                              ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--magenta)) 100%)'
                              : 'hsl(var(--muted))',
                        }}
                      >
                        {dj.name.split(' ').slice(-1)[0]?.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium truncate">{dj.name}</span>
                    </div>
                    <span className="font-mono text-sm shrink-0 tabular-nums">{fmtCompact(dj.total)}</span>
                  </div>
                  <div className="ml-7 h-2 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full transition-[width] duration-700"
                      style={{
                        width: `${(dj.total / maxDJ) * 100}%`,
                        background: `hsl(var(--primary) / ${1 - i * 0.15})`,
                      }}
                    />
                  </div>
                </li>
              ))
            )}
          </ol>
        </Card>

        <Card className="p-5">
          <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Top Produtores · receita</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">somente lançamentos pagos</p>
            </div>
          </CardHeader>
          <ol className="space-y-3.5">
            {topProducers.length === 0 ? (
              <li className="text-sm text-muted-foreground text-center py-6">Sem dados ainda</li>
            ) : (
              topProducers.map((prod: any, i: number) => (
                <li key={prod.name + i}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground/60 w-4">{i + 1}</span>
                      <span className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center text-mini font-medium shrink-0">
                        {prod.name.split(' ').slice(-1)[0]?.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium truncate">{prod.name}</span>
                    </div>
                    <span className="font-mono text-sm shrink-0 tabular-nums">{fmtCompact(prod.total)}</span>
                  </div>
                  <div className="ml-7 h-2 rounded-full overflow-hidden bg-muted">
                    <div
                      className="h-full transition-[width] duration-700"
                      style={{
                        width: `${(prod.total / maxProducer) * 100}%`,
                        background: `hsl(var(--violet) / ${1 - i * 0.15})`,
                      }}
                    />
                  </div>
                </li>
              ))
            )}
          </ol>
        </Card>
      </div>

      {/* ════════ TRANSACTIONS TABLE ════════ */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border/50 flex-wrap gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Lançamentos</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{allRecords.length} registros · {activeTab === 'all' ? 'todos os tipos' : activeTab}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex items-center min-w-[200px] max-w-md">
              <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar descrição…"
                className="pl-8 h-9 bg-muted/30 border-border"
              />
            </div>
            {activeTab === 'all' && (
              <>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="h-9 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {FINANCIAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos status</SelectItem>
                    {PAYMENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-medium text-mini uppercase tracking-wider font-mono">Data</TableHead>
                <TableHead className="font-medium text-mini uppercase tracking-wider font-mono">Descrição</TableHead>
                <TableHead className="font-medium text-mini uppercase tracking-wider font-mono">Tipo</TableHead>
                <TableHead className="font-medium text-mini uppercase tracking-wider font-mono text-right">Valor</TableHead>
                <TableHead className="font-medium text-mini uppercase tracking-wider font-mono">Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhum lançamento encontrado.{' '}
                    <button onClick={handleNew} className="text-primary hover:underline">
                      Criar novo →
                    </button>
                  </TableCell>
                </TableRow>
              ) : (
                allRecords.map((r) => {
                  const isRevenue = ['receita', 'sinal', 'pagamento_final', 'parcela', 'comissao'].includes(r.tipo);
                  const valueColor = r.status === 'vencido' ? 'hsl(var(--destructive))' : isRevenue ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/30" onClick={() => handleEdit(r)}>
                      <TableCell className="font-mono text-xs whitespace-nowrap" style={r.status === 'vencido' ? { color: 'hsl(var(--destructive))' } : undefined}>
                        {formatShortDate(r.data_vencimento) || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.descricao || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.djs?.nome_artistico ? `${r.djs.nome_artistico} · ` : ''}
                          {r.producers?.nome ? r.producers.nome : ''}
                          {r.bookings?.titulo ? ` · ${r.bookings.titulo}` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {r.tipo}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums" style={{ color: valueColor }}>
                        {isRevenue && r.status !== 'vencido' ? '+ ' : ''}
                        {fmt(Number(r.valor_bruto))}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handleEdit(r)}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setHistoryId(r.id)}>
                              <HistoryIcon className="h-4 w-4 mr-2" /> Histórico
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(r.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ════════ FORM (existing component) ════════ */}
      <FinancialForm
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        onSuccess={() => {
          setFormOpen(false);
          refetch();
        }}
      />

      {/* ════════ AUDIT HISTORY (controlled via key prop to remount when historyId changes) ════════ */}
      {historyId && (
        <AuditHistory
          entityType="financial_records"
          entityId={historyId}
          trigger={
            <button ref={(el) => el?.click()} className="hidden" aria-hidden />
          }
        />
      )}

      {/* ════════ DELETE CONFIRM ════════ */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O lançamento e seu histórico serão removidos do banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ──────────── Sparkline component ──────────── */
function Sparkline({ data, color, dashed }: { data: number[]; color: string; dashed?: boolean }) {
  if (!data || data.length < 2) return <div className="h-8 mt-3" />;
  const w = 120;
  const h = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const path = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="mt-3 w-full" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray={dashed ? '3 3' : undefined} />
    </svg>
  );
}

/* ──────────── KpiBlock — editorial card com massive display typography ──────────── */
interface KpiBlockProps {
  label: string;
  value: string;
  rawValue?: number;
  icon?: React.ReactNode;
  accentColor: string;
  subtitleRight?: string;
  footer?: React.ReactNode;
  highlight?: boolean;
  danger?: boolean;
}
function KpiBlock({ label, value, icon, accentColor, subtitleRight, footer, highlight, danger }: KpiBlockProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 transition-all duration-300 hover:border-foreground/30 hover:shadow-xl"
      style={{
        boxShadow: highlight
          ? `0 0 0 1px ${accentColor}40, inset 0 1px 0 ${accentColor}20`
          : danger
          ? `0 0 0 1px ${accentColor}40`
          : undefined,
      }}
    >
      {/* Accent stripe (top-left → bottom-right) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1 -left-1 h-12 w-12 opacity-50 group-hover:opacity-90 transition-opacity"
        style={{
          background: `radial-gradient(circle at top left, ${accentColor}80 0%, transparent 70%)`,
        }}
      />
      {/* Corner brackets */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1.5 right-1.5 h-2 w-2 border-r border-t opacity-50 group-hover:opacity-100 transition-opacity"
        style={{ borderColor: accentColor }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1.5 left-1.5 h-2 w-2 border-l border-b opacity-50 group-hover:opacity-100 transition-opacity"
        style={{ borderColor: accentColor }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-mini font-mono uppercase tracking-[0.16em] text-muted-foreground">
          <span style={{ color: accentColor }}>{icon}</span>
          <span>{label}</span>
        </div>
        {subtitleRight && (
          <span className="text-mini font-mono tabular-nums" style={{ color: accentColor }}>
            {subtitleRight}
          </span>
        )}
      </div>

      {/* Massive number */}
      <div
        className="text-3xl md:text-4xl xl:text-5xl font-black leading-none tracking-tighter tabular-nums mb-1.5"
        style={{ color: danger ? accentColor : undefined }}
      >
        {value}
      </div>

      {/* Footer slot */}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}

/* ──────────── Donut chart (pure SVG, sem Recharts pra ter mais controle visual) ──────────── */
function DonutChart({
  data,
  total,
}: {
  data: Array<{ key: string; label: string; color: string; value: number }>;
  total: number;
}) {
  const r = 72;
  const C = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Sem dados ainda
      </div>
    );
  }

  let acc = 0;
  const segments = data.map((d) => {
    const len = (d.value / total) * C;
    const seg = { ...d, len, offset: -acc };
    acc += len;
    return seg;
  });

  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
      <svg viewBox="0 0 200 200" className="w-full">
        <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={20} />
        <g transform="rotate(-90 100 100)" fill="none" strokeWidth={20} strokeLinecap="butt">
          {segments.map((s) => (
            <circle
              key={s.key}
              cx="100"
              cy="100"
              r={r}
              stroke={s.color}
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </g>
        <text x="100" y="92" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontFamily="Inter" fontSize={10} fontWeight={500} letterSpacing={1}>
          TOTAL
        </text>
        <text x="100" y="115" textAnchor="middle" fill="hsl(var(--foreground))" fontFamily="Geist" fontSize={20} fontWeight={600}>
          {fmtCompact(total)}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li key={d.key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="truncate">{d.label}</span>
              </span>
              <span className="font-mono text-muted-foreground shrink-0">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
