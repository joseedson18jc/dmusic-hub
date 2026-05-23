import { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, DollarSign, Calendar, Bell, Loader2, Download, Target } from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { useFinancialRecords, useFinancialSummary } from '@/hooks/useFinancial';
import { useTasks } from '@/hooks/useTasks';
import { useContracts } from '@/hooks/useContracts';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerGoals, useUpsertGoal } from '@/hooks/useManagerGoals';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PIPELINE_PHASES, phaseForStatus } from '@/lib/bookingPhases';
import { PhaseSummaryTile } from '@/components/bookings/PhaseSummaryTile';
import { useHoldsExpiringSoon } from '@/hooks/useHolds';
import { describeHold } from '@/lib/holdDates';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line,
} from 'recharts';
import { ModernChartTooltip } from '@/components/charts/ModernChartTooltip';
import { ActivityHeatmap } from '@/components/dashboard/ActivityHeatmap';
import { RadialProgress } from '@/components/dashboard/RadialProgress';
import { CountUp } from '@/components/dashboard/CountUp';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { RecentActivity, type ActivityItem } from '@/components/dashboard/RecentActivity';
import {
  generateHeatmapDemo,
  generateRevenueDemo,
  generateRevenueMixDemo,
  generateTopDjsDemo,
  generateActivityDemo,
  generateTodayEventsDemo,
} from '@/lib/dashboardDemo';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { EditorialHero } from '@/components/ui/EditorialHero';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtCompact = (v: number) =>
  Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}K` : `R$ ${v.toFixed(0)}`;

// PIPELINE_PHASES moved to @/lib/bookingPhases (shared with pages/Bookings.tsx).

const ACTIVE_BOOKING_STATUSES = [
  'qualificado', 'briefing_recebido', 'proposta_enviada', 'negociacao', 'aguardando_aprovacao',
  'contrato_enviado', 'assinatura_pendente', 'sinal_pendente', 'planejamento', 'pronto_para_evento',
  'em_realizacao',
];

const WON_BOOKING_STATUSES = [
  'confirmado', 'planejamento', 'pronto_para_evento', 'em_realizacao', 'evento_realizado',
  'pagamento_final_pendente', 'repasse_pendente', 'fechado_ganho',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: bookings } = useBookings();
  const { data: financial } = useFinancialRecords();
  const { data: summary } = useFinancialSummary();
  const { data: tasks } = useTasks();
  const { data: contracts } = useContracts();
  const queryClient = useQueryClient();

  // Memoize array fallbacks — fixes a real perf bug:
  // `(x ?? [])` creates a new array on every render, breaking downstream `useMemo` deps.
  const allBookings = useMemo(() => (bookings ?? []) as any[], [bookings]);
  const allFinancial = useMemo(() => (financial ?? []) as any[], [financial]);
  const allTasks = useMemo(() => (tasks ?? []) as any[], [tasks]);
  const allContracts = useMemo(() => (contracts ?? []) as any[], [contracts]);

  /* ───────── Realtime notifications + auto-refresh counter ───────── */
  const [updatedAgo, setUpdatedAgo] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setUpdatedAgo((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const channel = (supabase as any)
      .channel('portal-manager-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload: any) => {
        const title = payload.new?.titulo || 'Novo booking';
        toast.info(`📋 Novo booking: ${title}`);
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        setUpdatedAgo(0);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'financial_records' }, (payload: any) => {
        const desc = payload.new?.descricao || 'Novo lançamento';
        const valor = payload.new?.valor_bruto ? fmt(Number(payload.new.valor_bruto)) : '';
        toast.info(`💰 ${desc} ${valor}`);
        queryClient.invalidateQueries({ queryKey: ['financial'] });
        queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
        setUpdatedAgo(0);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  /* ───────── Period filter ───────── */
  const [goalsPeriod, setGoalsPeriod] = useState<'7d' | '30d' | 'mes' | 'trim' | 'ano'>('mes');
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  /* ───────── Custom goals from DB ───────── */
  const { data: savedGoals } = useManagerGoals(currentYearMonth);
  const upsertGoal = useUpsertGoal();
  const [editReceita, setEditReceita] = useState('');
  const [editBookings, setEditBookings] = useState('');

  useEffect(() => {
    if (savedGoals) {
      setEditReceita(String(savedGoals.meta_receita));
      setEditBookings(String(savedGoals.meta_bookings));
    }
  }, [savedGoals]);

  /* ───────── KPIs ───────── */
  const totalRevenue = summary?.receita ?? 0;
  const totalExpenses = summary?.despesa ?? 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const activeBookings = useMemo(
    () => allBookings.filter((b: any) => ACTIVE_BOOKING_STATUSES.includes(b.status)).length,
    [allBookings],
  );

  const totalBookings = allBookings.length;
  const wonBookings = useMemo(
    () => allBookings.filter((b: any) => WON_BOOKING_STATUSES.includes(b.status)).length,
    [allBookings],
  );
  const conversionRate = totalBookings > 0 ? Math.round((wonBookings / totalBookings) * 100) : 0;

  const pendingTasks = useMemo(
    () => allTasks.filter((t: any) => ['a_fazer', 'em_andamento', 'atrasada'].includes(t.status)).length,
    [allTasks],
  );
  const overdueTasks = useMemo(
    () => allTasks.filter((t: any) => t.status === 'atrasada').length,
    [allTasks],
  );

  const overdueAmount = useMemo(
    () =>
      allFinancial
        .filter((f: any) => f.status === 'vencido')
        .reduce((s: number, f: any) => s + Number(f.valor_bruto), 0),
    [allFinancial],
  );

  const baseTarget = savedGoals?.meta_receita ?? 50000;
  const targetProgress = baseTarget > 0 ? Math.min(100, Math.round((totalRevenue / baseTarget) * 100)) : 0;

  /* ───────── Revenue chart (12 meses para a versão Mês — flexível por período) ───────── */
  const revenueData = useMemo(() => {
    const months = goalsPeriod === 'ano' ? 12 : goalsPeriod === 'trim' ? 3 : 6;
    const monthMap: Record<string, { receita: number; despesa: number }> = {};
    const n = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(n.getFullYear(), n.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { receita: 0, despesa: 0 };
    }
    const revenueTypes = ['receita', 'sinal', 'pagamento_final', 'parcela'];
    const expenseTypes = ['despesa', 'repasse_dj', 'repasse_produtor', 'comissao', 'imposto'];
    allFinancial.forEach((f: any) => {
      const date = f.data_vencimento || f.created_at?.split('T')[0];
      if (!date) return;
      const key = date.substring(0, 7);
      if (!monthMap[key]) return;
      const val = Number(f.valor_bruto);
      if (revenueTypes.includes(f.tipo) && f.status === 'pago') monthMap[key].receita += val;
      if (expenseTypes.includes(f.tipo) && f.status === 'pago') monthMap[key].despesa += val;
    });
    return Object.entries(monthMap).map(([month, v]) => ({
      month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
      receita: v.receita,
      despesa: v.despesa,
      lucro: v.receita - v.despesa,
    }));
  }, [allFinancial, goalsPeriod]);

  /* ───────── Today's events ───────── */
  const todayEvents = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return allBookings
      .filter((b: any) => b.data_evento === todayStr)
      .sort((a: any, b: any) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
      .slice(0, 5);
  }, [allBookings]);

  /* ───────── Pendências (contratos enviados, vencidos, repasses pendentes) ───────── */
  const pendencias = useMemo(() => {
    const items: Array<{
      id: string; type: string; title: string; detail: string; amount?: number;
      urgency: 'alta' | 'media' | 'baixa'; action?: string; navigate: string;
    }> = [];

    const overdue = allFinancial.filter((f: any) => f.status === 'vencido');
    if (overdue.length > 0) {
      const total = overdue.reduce((s: number, f: any) => s + Number(f.valor_bruto), 0);
      const oldest = overdue
        .slice()
        .sort((a: any, b: any) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''))[0];
      const days = oldest?.data_vencimento
        ? Math.floor((Date.now() - new Date(oldest.data_vencimento).getTime()) / 86400000)
        : 0;
      items.push({
        id: 'overdue',
        type: 'overdue',
        title: `${overdue.length} pagamento${overdue.length > 1 ? 's' : ''} vencido${overdue.length > 1 ? 's' : ''}`,
        detail: `Mais antigo há ${days} dia${days > 1 ? 's' : ''}`,
        amount: total,
        urgency: 'alta',
        action: 'Cobrar',
        navigate: '/financeiro',
      });
    }

    const sentContracts = allContracts.filter((c: any) => c.status === 'enviado');
    if (sentContracts.length > 0) {
      items.push({
        id: 'contracts',
        type: 'contracts',
        title: `${sentContracts.length} contrato${sentContracts.length > 1 ? 's' : ''} aguardando assinatura`,
        detail: 'Reenvie se passar de 5 dias sem resposta',
        urgency: 'media',
        action: 'Revisar',
        navigate: '/contratos',
      });
    }

    const pendingPayouts = allFinancial.filter(
      (f: any) => f.tipo === 'repasse_dj' && f.status === 'pendente',
    );
    if (pendingPayouts.length > 0) {
      const total = pendingPayouts.reduce((s: number, f: any) => s + Number(f.valor_bruto), 0);
      items.push({
        id: 'payouts',
        type: 'payouts',
        title: `${pendingPayouts.length} repasse${pendingPayouts.length > 1 ? 's' : ''} a executar`,
        detail: 'DJs aguardando pagamento',
        amount: total,
        urgency: 'media',
        action: 'Pagar tudo',
        navigate: '/financeiro',
      });
    }

    const pendingApprovalBookings = allBookings.filter((b: any) => b.status === 'aguardando_aprovacao');
    if (pendingApprovalBookings.length > 0) {
      items.push({
        id: 'approvals',
        type: 'approvals',
        title: `${pendingApprovalBookings.length} booking${pendingApprovalBookings.length > 1 ? 's' : ''} aguardando aprovação`,
        detail: 'Decida hoje para não perder o lead',
        urgency: 'media',
        action: 'Abrir',
        navigate: '/bookings',
      });
    }

    return items.slice(0, 5);
  }, [allFinancial, allContracts, allBookings]);

  /* ───────── Holds expirando em 24h (DJ-mgmt feature) ───────── */
  const { data: expiringHolds = [] } = useHoldsExpiringSoon(24);

  /* ───────── Pipeline phases (5 fases agrupando 17 status) ───────── */
  const pipelinePhases = useMemo(
    () =>
      PIPELINE_PHASES.map((phase) => {
        const inPhase = allBookings.filter((b: any) => phase.statuses.includes(b.status));
        const totalValue = inPhase.reduce(
          (s: number, b: any) => s + (Number(b.fee_acordado) || 0),
          0,
        );
        return { ...phase, count: inPhase.length, totalValue };
      }),
    [allBookings],
  );
  const totalActivePipeline = pipelinePhases.reduce((s, p) => s + p.count, 0);

  /* ───────── Top DJs by revenue ───────── */
  const realTopDjs = useMemo(() => {
    const counts: Record<string, { name: string; bookings: number; revenue: number }> = {};
    allBookings.forEach((b: any) => {
      if (b.djs?.nome_artistico) {
        if (!counts[b.dj_id]) counts[b.dj_id] = { name: b.djs.nome_artistico, bookings: 0, revenue: 0 };
        counts[b.dj_id].bookings++;
        if (b.fee_acordado) counts[b.dj_id].revenue += Number(b.fee_acordado);
      }
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [allBookings]);

  /* ───────── Activity heatmap data (bookings per day) ───────── */
  const realHeatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    allBookings.forEach((b: any) => {
      const key = b.data_evento;
      if (!key) return;
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [allBookings]);

  /* ───────── Recent activity feed (cruzando 4 entidades) ───────── */
  const realActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    allBookings.forEach((b: any) => {
      if (b.created_at) {
        items.push({
          id: `b-${b.id}`,
          type: 'booking',
          title: `Booking: ${b.titulo || '—'}`,
          detail: b.djs?.nome_artistico ?? b.producers?.nome,
          amount: b.fee_acordado ? Number(b.fee_acordado) : undefined,
          at: b.created_at,
        });
      }
    });
    allFinancial.forEach((f: any) => {
      if (f.created_at) {
        items.push({
          id: `f-${f.id}`,
          type: 'financial',
          title: f.descricao || `Lançamento ${f.tipo}`,
          detail: f.status,
          amount: Number(f.valor_bruto),
          at: f.created_at,
        });
      }
    });
    allContracts.forEach((c: any) => {
      if (c.created_at) {
        items.push({
          id: `c-${c.id}`,
          type: 'contract',
          title: `Contrato: ${c.template_name || '—'}`,
          detail: c.status,
          at: c.created_at,
        });
      }
    });
    allTasks.forEach((t: any) => {
      if (t.created_at) {
        items.push({
          id: `t-${t.id}`,
          type: 'task',
          title: t.titulo || 'Tarefa',
          detail: t.status,
          at: t.created_at,
        });
      }
    });
    return items;
  }, [allBookings, allFinancial, allContracts, allTasks]);

  /* ───────── Demo data fallback (DB vazio → mostra preview sintético) ───────── */
  const isDbEmpty =
    allBookings.length === 0 &&
    allFinancial.length === 0 &&
    allContracts.length === 0 &&
    allTasks.length === 0;

  const heatmapData = useMemo(() => (isDbEmpty ? generateHeatmapDemo() : realHeatmapData), [isDbEmpty, realHeatmapData]);
  const demoRevenue = useMemo(() => generateRevenueDemo(revenueData.length || 6), [revenueData.length]);
  const displayRevenueData = isDbEmpty && totalRevenue === 0 ? demoRevenue : revenueData;
  const revenueMix = useMemo(() => generateRevenueMixDemo(isDbEmpty ? 124380 : totalRevenue || 1), [isDbEmpty, totalRevenue]);
  const topDjs = isDbEmpty && realTopDjs.length === 0 ? generateTopDjsDemo() : realTopDjs;
  const topDjMax = topDjs[0]?.revenue || 1;
  const activityItems = isDbEmpty && realActivity.length === 0 ? generateActivityDemo() : realActivity;
  const demoTodayEvents = useMemo(() => generateTodayEventsDemo(), []);
  const displayTodayEvents = isDbEmpty && todayEvents.length === 0 ? demoTodayEvents : todayEvents;

  /* ───────── KPI sparklines (mini trends from heatmap or revenue) ───────── */
  const sparkBookings = useMemo(() => {
    // Last 14 days of heatmap data → sparkline
    const today = new Date();
    const arr: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      arr.push(heatmapData[key] ?? 0);
    }
    return arr;
  }, [heatmapData]);
  const sparkRevenue = displayRevenueData.map((r) => r.receita);
  const sparkProfit = displayRevenueData.map((r) => r.lucro);

  /* ───────── Greeting ───────── */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);
  const userName = useMemo(() => {
    if (!user) return '';
    const meta: any = user.user_metadata || {};
    const name = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'usuário');
    return String(name).split(' ')[0];
  }, [user]);

  /* ───────── Goals + PDF Export ───────── */
  const handleSaveGoals = () => {
    const receita = Number(editReceita);
    const bookings = Number(editBookings);
    if (receita > 0 && bookings > 0) {
      upsertGoal.mutate({
        yearMonth: currentYearMonth,
        meta_receita: receita,
        meta_bookings: bookings,
      });
      setGoalsDialogOpen(false);
    } else {
      toast.error('Valores devem ser maiores que zero');
    }
  };

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      if (!projectId) {
        toast.error('VITE_SUPABASE_PROJECT_ID não configurado. Contate o suporte.');
        return;
      }
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/generate-manager-report`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error('Erro ao gerar relatório');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-manager-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Relatório exportado! Abra no navegador e use Ctrl+P para salvar como PDF.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao exportar');
    } finally {
      setExportingPdf(false);
    }
  }, []);

  const todayEventsCount = todayEvents.length;
  const pendingSignatures = allContracts.filter((c: any) => c.status === 'enviado').length;

  return (
    <div className="space-y-6">
      {/* ════════ HERO editorial cyberpunk ════════ */}
      <EditorialHero
        title={`OLÁ, ${(userName || 'MANAGER').toUpperCase()}`}
        size="xl"
        status={[
          { label: 'SYSTEM · LIVE', tone: 'live' },
          {
            label: new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
            tone: 'muted',
          },
          { label: `▸ refresh ${updatedAgo}s`, tone: 'muted' },
          ...(isDbEmpty ? [{ label: '◆ modo demo', tone: 'info' as const }] : []),
          ...(overdueAmount > 0
            ? [{ label: `⚠ ${fmt(overdueAmount)} vencido`, tone: 'danger' as const }]
            : []),
        ]}
        ticker={[
          { label: 'eventos hoje', value: String(todayEventsCount), valueColor: todayEventsCount > 0 ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' },
          { label: 'assinaturas', value: String(pendingSignatures), valueColor: pendingSignatures > 0 ? 'hsl(var(--warning))' : 'hsl(var(--foreground))' },
          { label: 'pipeline', value: fmt(totalRevenue), valueColor: 'hsl(var(--success))' },
        ]}
        actions={
          <>
            <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-background/60 border border-border/60 backdrop-blur-sm">
              {(['7d', '30d', 'mes', 'trim', 'ano'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setGoalsPeriod(p)}
                  className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-lg transition-all duration-200"
                  style={{
                    background: goalsPeriod === p ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)' : 'transparent',
                    color: goalsPeriod === p ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                    boxShadow: goalsPeriod === p ? '0 0 20px hsl(var(--primary)/0.4)' : 'none',
                  }}
                >
                  {p === '7d' ? '7d' : p === '30d' ? '30d' : p === 'mes' ? 'Mês' : p === 'trim' ? 'Trim.' : 'Ano'}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="gap-2 backdrop-blur-sm bg-background/60"
            >
              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar
            </Button>
          </>
        }
      />

      {/* ════════ KPI STRIP ════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Receita */}
        <Card
          className="p-4 cursor-pointer hover:border-success/45 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_hsl(var(--success)/0.4)] group overflow-hidden relative"
          onClick={() => navigate('/financeiro')}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
            <span>Receita</span>
            <span className="flex items-center gap-1 text-[hsl(var(--success))] font-mono">
              <TrendingUp className="h-3 w-3" />
              {isDbEmpty ? '+18%' : '+0%'}
            </span>
          </div>
          <div className="mt-1.5 text-display-sm leading-none font-semibold tracking-tight tabular-nums">
            <CountUp to={isDbEmpty ? 124380 : totalRevenue} format={fmtCompact} />
          </div>
          <div className="mt-1 text-mini text-muted-foreground font-mono-cyber">
            margem {profitMargin.toFixed(1).replace('.', ',')}%
          </div>
          <div className="mt-2 -mb-2 -mx-4">
            <Sparkline data={sparkRevenue} tone="success" height={36} />
          </div>
        </Card>

        {/* Lucro líquido com radial */}
        <Card
          className="p-4 cursor-pointer hover:border-primary/45 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.45)] group overflow-hidden relative"
          onClick={() => navigate('/financeiro')}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
            <span>Lucro · meta</span>
            <DollarSign className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <RadialProgress
              value={isDbEmpty ? 78 : targetProgress}
              size={72}
              strokeWidth={7}
              tone="primary"
              displayValue={
                <span className="text-base font-bold">
                  {Math.round(isDbEmpty ? 78 : targetProgress)}%
                </span>
              }
            />
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight tabular-nums leading-tight">
                <CountUp to={isDbEmpty ? 48720 : netProfit} format={fmtCompact} />
              </div>
              <div className="mt-0.5 text-mini text-muted-foreground font-mono-cyber">
                meta {fmtCompact(baseTarget)}
              </div>
            </div>
          </div>
        </Card>

        {/* Bookings */}
        <Card
          className="p-4 cursor-pointer hover:border-info/45 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_hsl(var(--info)/0.45)] group overflow-hidden relative"
          onClick={() => navigate('/bookings')}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
            <span>Bookings</span>
            <span className="font-mono-cyber text-muted-foreground/60">
              {isDbEmpty ? 24 : totalBookings} total
            </span>
          </div>
          <div className="mt-1.5 text-display-sm leading-none font-semibold tracking-tight tabular-nums">
            <CountUp to={isDbEmpty ? 11 : activeBookings} />{' '}
            <span className="text-sm font-normal text-muted-foreground">ativos</span>
          </div>
          {/* Mini pipeline bar */}
          {(totalActivePipeline > 0 || isDbEmpty) && (
            <div className="mt-3 flex h-2 rounded-full overflow-hidden cursor-help" title="Pipeline em fases">
              {(isDbEmpty
                ? [
                    { key: 'lead',   count: 3, color: 'hsl(var(--lead-text))' },
                    { key: 'negoc',  count: 4, color: 'hsl(var(--warning-text))' },
                    { key: 'conf',   count: 2, color: 'hsl(var(--primary-text))' },
                    { key: 'realiz', count: 1, color: 'hsl(var(--violet-text))' },
                    { key: 'pos',    count: 1, color: 'hsl(var(--success))' },
                  ]
                : pipelinePhases
              ).map((p: any) => {
                const total = isDbEmpty ? 11 : totalActivePipeline;
                return (
                  <div
                    key={p.key}
                    style={{
                      width: `${(p.count / total) * 100}%`,
                      background: p.color,
                    }}
                    title={`${p.key}: ${p.count}`}
                  />
                );
              })}
            </div>
          )}
          <div className="mt-1.5 text-mini text-muted-foreground font-mono-cyber">
            5 fases · clique para abrir
          </div>
        </Card>

        {/* Conversão */}
        <Card
          className="p-4 cursor-pointer hover:border-violet/45 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_hsl(var(--violet)/0.45)] group overflow-hidden relative"
          onClick={() => navigate('/bookings')}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
            <span>Conversão</span>
            <span
              className="font-mono-cyber"
              style={{ color: 'hsl(var(--success))' }}
            >
              {isDbEmpty ? '14/24' : `${wonBookings}/${totalBookings}`}
            </span>
          </div>
          <div className="mt-1.5 text-display-sm leading-none font-semibold tracking-tight tabular-nums">
            <CountUp to={isDbEmpty ? 58 : conversionRate} format={(v) => `${Math.round(v)}%`} />
          </div>
          <div className="mt-3 grid grid-cols-12 gap-0.5 h-3">
            {Array.from({ length: 12 }).map((_, i) => {
              const cur = isDbEmpty ? 58 : conversionRate;
              const pct = (cur / 100) * 12;
              const filled = i < Math.floor(pct);
              const partial = i === Math.floor(pct);
              return (
                <span
                  key={i}
                  className="rounded-sm"
                  style={{
                    background: filled
                      ? 'hsl(var(--primary))'
                      : partial
                      ? 'hsl(var(--primary) / 0.5)'
                      : 'hsl(var(--foreground) / 0.08)',
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1.5 text-mini text-muted-foreground font-mono-cyber">Lead → Confirmado</div>
        </Card>
      </div>

      {/* ════════ HOJE + PENDÊNCIAS ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hoje */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border/50">
            <div>
              <CardTitle className="text-base font-semibold">
                Hoje · {displayTodayEvents.length} evento{displayTodayEvents.length !== 1 ? 's' : ''}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {displayTodayEvents.length === 0 ? 'sem eventos hoje' : 'próximos em ordem de horário'}
              </p>
            </div>
            <button
              onClick={() => navigate('/agenda')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver agenda completa →
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {displayTodayEvents.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Sem eventos para hoje · {' '}
                  <button onClick={() => navigate('/bookings')} className="text-primary hover:underline">
                    ver pipeline →
                  </button>
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {displayTodayEvents.map((b: any) => {
                  const phase = phaseForStatus(b.status);
                  return (
                    <li
                      key={b.id}
                      className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate('/bookings')}
                    >
                      <div className="text-right w-14 shrink-0">
                        <div className="text-lg font-mono-cyber font-semibold leading-tight">
                          {b.hora_evento || '—'}
                        </div>
                        <div className="text-mini text-muted-foreground/70 font-mono-cyber">HOJE</div>
                      </div>
                      <div
                        className="h-12 w-1 rounded-full shrink-0"
                        style={{ background: phase?.color || 'hsl(var(--muted-foreground))' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium">{b.titulo}</span>
                          {phase && (
                            <span
                              className="text-mini px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0"
                              style={{
                                background: phase.bg,
                                color: phase.color,
                                borderColor: phase.border,
                              }}
                            >
                              {phase.label === 'Possível Evento — Produtor' ? 'Lead' : phase.label}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-sm text-muted-foreground truncate">
                          {b.djs?.nome_artistico ? `${b.djs.nome_artistico} · ` : ''}
                          {b.producers?.nome ? `${b.producers.nome} · ` : ''}
                          {b.fee_acordado ? fmt(Number(b.fee_acordado)) : ''}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pendências */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border/50">
            <CardTitle className="text-base font-semibold">Pendências</CardTitle>
            <span className="text-mini font-mono-cyber text-muted-foreground/60">
              {pendencias.length} {pendencias.length === 1 ? 'item' : 'itens'}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {pendencias.length === 0 ? (
              <div className="p-8 text-center">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full mx-auto mb-2"
                  style={{ background: 'hsl(var(--success) / 0.15)', color: 'hsl(var(--success))' }}
                >
                  ✓
                </span>
                <p className="text-sm text-muted-foreground">Nada pendente · ótimo trabalho</p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border/50 text-sm">
                  {pendencias.map((p) => (
                    <li key={p.id} className="p-3 flex items-start gap-3">
                      <span
                        className="mt-1 h-2 w-2 rounded-full shrink-0"
                        style={{
                          background:
                            p.urgency === 'alta'
                              ? 'hsl(var(--destructive))'
                              : p.urgency === 'media'
                              ? 'hsl(var(--warning))'
                              : 'hsl(var(--primary))',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{p.title}</span>
                          {p.amount !== undefined && (
                            <span className="font-mono-cyber text-mini text-muted-foreground/60">
                              {fmt(p.amount)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.detail}</p>
                        {p.action && (
                          <div className="mt-2 flex gap-1.5">
                            <Button
                              size="sm"
                              variant={p.urgency === 'alta' ? 'default' : 'outline'}
                              className="h-7 px-2 text-xs"
                              onClick={() => navigate(p.navigate)}
                            >
                              {p.action}
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/notificacoes')}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-foreground py-2.5 border-t border-border/50"
                >
                  Ver todas as pendências →
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ════════ ACTIVITY HEATMAP — 53 weeks ════════ */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Heatmap de atividade · 12 meses
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              eventos por dia · hover pra ver detalhes · clique pra abrir a agenda
            </p>
          </div>
          <button
            onClick={() => navigate('/agenda')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Ver agenda →
          </button>
        </CardHeader>
        <CardContent className="p-5 pt-2 overflow-x-auto">
          <ActivityHeatmap
            data={heatmapData}
            valueLabel="evento"
            onCellClick={(dateKey) => navigate(`/agenda?date=${dateKey}`)}
          />
        </CardContent>
      </Card>

      {/* ════════ DONUT + RECENT ACTIVITY ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Mix donut */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Mix de receita</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">distribuição por categoria · hover</p>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2 flex flex-col items-center">
            <DonutChart
              data={revenueMix}
              size={180}
              thickness={22}
              centerLabel="Receita"
              centerValue={fmtCompact(revenueMix.reduce((s, r) => s + r.value, 0))}
              formatValue={fmtCompact}
            />
            <ul className="mt-4 w-full space-y-1.5">
              {revenueMix.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: m.color }} />
                    <span className="text-muted-foreground truncate">{m.label}</span>
                  </span>
                  <span className="font-mono tabular-nums text-foreground/80">{fmtCompact(m.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2 border-b border-border/40">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Atividade recente
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                últimos 8 eventos cruzando bookings, financeiro, contratos e tarefas
              </p>
            </div>
            <button
              onClick={() => navigate('/notificacoes')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver tudo →
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivity items={activityItems} limit={8} />
          </CardContent>
        </Card>
      </div>

      {/* ════════ HOLDS EXPIRANDO (DJ-mgmt) ════════
           Mostra só se houver holds ativos no próximo dia.
           Hidden quando lista vazia pra não poluir o Dashboard. */}
      {expiringHolds.length > 0 && (
        <Card className="border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/[0.03]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span className="text-[hsl(var(--warning))]">🕒</span>
                Holds expirando · próximas 24h
              </CardTitle>
              <p className="text-mini text-muted-foreground mt-0.5">
                Bookings em <strong>aguardando_aprovacao</strong> com hold prestes a expirar — feche ou libere a data.
              </p>
            </div>
            <button
              onClick={() => navigate('/bookings')}
              className="text-mini text-muted-foreground hover:text-foreground"
            >
              Ver pipeline →
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/40">
              {expiringHolds.map((h) => {
                const status = describeHold(h.hold_until);
                return (
                  <li
                    key={h.id}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 cursor-pointer"
                    onClick={() => navigate('/bookings')}
                  >
                    <span
                      className="text-mini px-2 py-0.5 rounded-full border font-mono tabular-nums"
                      style={{
                        background: 'hsl(var(--warning) / 0.15)',
                        color: 'hsl(var(--warning))',
                        borderColor: 'hsl(var(--warning) / 0.4)',
                      }}
                    >
                      {status.label}
                    </span>
                    <span className="font-medium truncate">{h.titulo}</span>
                    <span className="ml-auto text-mini text-muted-foreground font-mono">
                      {new Date(h.hold_until).toLocaleString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ════════ PIPELINE GLANCE ════════ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-4">
          <div>
            <CardTitle className="text-base font-semibold">
              Pipeline · {totalActivePipeline} bookings ativos
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              17 status agrupados em 5 fases · clique para filtrar
            </p>
          </div>
          <button
            onClick={() => navigate('/bookings')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Abrir pipeline →
          </button>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ul className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {pipelinePhases.map((phase) => (
              <li key={phase.key}>
                <PhaseSummaryTile
                  phase={phase}
                  count={phase.count}
                  totalValue={phase.totalValue}
                  formatCurrency={fmtCompact}
                  valueLabel="valor"
                  highlight={phase.key === 'conf'}
                  onClick={() => navigate('/bookings')}
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ════════ CHART + TOP DJs ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Receita vs. Despesa · {revenueData.length} meses
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                série mensal · linha laranja = lucro
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
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={displayRevenueData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dash-gradSuccess" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#dash-gradSuccess)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                />
                <Line
                  type="monotone"
                  dataKey="despesa"
                  name="Despesa"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 3.5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                />
                <Line
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3">
            <CardTitle className="text-base font-semibold">Top DJs · período</CardTitle>
            <button
              onClick={() => navigate('/djs')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Equipe →
            </button>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {topDjs.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Sem DJs com bookings ainda
              </div>
            ) : (
              <ol className="space-y-3">
                {topDjs.map((dj, i) => (
                  <li key={dj.name}>
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono-cyber text-xs text-muted-foreground/60 w-4">
                          {i + 1}
                        </span>
                        <span
                          className="h-7 w-7 rounded-full flex items-center justify-center text-mini font-medium shrink-0 text-white"
                          style={{
                            background: i === 0
                              ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--magenta)) 100%)'
                              : 'hsl(var(--muted))',
                          }}
                        >
                          {dj.name.split(' ').slice(-1)[0]?.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-medium truncate">{dj.name}</span>
                      </div>
                      <span className="font-mono-cyber text-sm shrink-0 tabular-nums">
                        {fmtCompact(dj.revenue)}
                      </span>
                    </div>
                    <div className="ml-7 h-2 rounded-full overflow-hidden bg-muted">
                      <div
                        className="h-full transition-[width] duration-700"
                        style={{
                          width: `${(dj.revenue / topDjMax) * 100}%`,
                          background: `hsl(var(--primary) / ${1 - i * 0.15})`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ════════ GOALS DIALOG ════════ */}
      <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="fixed bottom-6 right-6 gap-2 shadow-elevated hidden md:inline-flex"
            onClick={() => setGoalsDialogOpen(true)}
          >
            <Target className="h-3.5 w-3.5 text-primary" />
            Metas
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Definir metas mensais
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="meta-receita">Meta de receita (R$)</Label>
              <Input
                id="meta-receita"
                type="number"
                value={editReceita}
                onChange={(e) => setEditReceita(e.target.value)}
                placeholder="50000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Atual: {fmt(totalRevenue)} · {targetProgress}% atingido
              </p>
            </div>
            <div>
              <Label htmlFor="meta-bookings">Meta de bookings</Label>
              <Input
                id="meta-bookings"
                type="number"
                value={editBookings}
                onChange={(e) => setEditBookings(e.target.value)}
                placeholder="5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setGoalsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGoals} disabled={upsertGoal.isPending}>
                {upsertGoal.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
