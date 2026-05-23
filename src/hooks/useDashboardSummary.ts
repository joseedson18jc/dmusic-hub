import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Single round-trip dashboard payload, computed server-side.
 *
 * The previous Dashboard fetched ALL rows for six tables and aggregated in
 * JS. That doesn't scale, ignored RLS scoping at the SQL level, and made
 * every metric a function of total table size on the wire. This hook calls
 * `get_dashboard_summary()` (SECURITY INVOKER) which respects the caller's
 * RLS, so a DJ-only user sees only their own slice of the KPIs.
 */
export interface DashboardKPIs {
  revenue: number;
  expenses: number;
  profit: number;
  active_bookings: number;
  total_bookings: number;
  won_bookings: number;
  conversion_pct: number;
  pending_tasks: number;
  overdue_tasks: number;
  overdue_count: number;
  dj_count: number;
  dj_active: number;
  producer_count: number;
  contract_open: number;
}

export interface DashboardSummary {
  kpis: DashboardKPIs;
  upcoming: Array<{
    id: string;
    titulo: string;
    data_evento: string | null;
    venue: string | null;
    cidade: string | null;
    status: string;
    fee_acordado: number | null;
    dj_nome: string | null;
    dj_foto: string | null;
  }>;
  revenue_series: Array<{ month_key: string; month: string; receita: number; despesa: number }>;
  dj_performance: Array<{ name: string; foto: string | null; bookings: number; revenue: number }>;
  overdue_top: Array<{
    id: string;
    descricao: string | null;
    tipo: string;
    valor_bruto: number;
    data_vencimento: string | null;
  }>;
  generated_at: string;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    staleTime: 30_000,
    queryFn: async (): Promise<DashboardSummary> => {
      const { data, error } = await (supabase as any).rpc('get_dashboard_summary');
      if (error) throw error;
      return data as DashboardSummary;
    },
  });
}
