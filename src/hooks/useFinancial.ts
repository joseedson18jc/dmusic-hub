import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';
import { escapeSearch } from '@/lib/searchEscape';

const sb = supabase as any;

export const FINANCIAL_TYPES = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'sinal', label: 'Sinal' },
  { value: 'pagamento_final', label: 'Pagamento Final' },
  { value: 'parcela', label: 'Parcela' },
  { value: 'repasse_dj', label: 'Repasse DJ' },
  { value: 'repasse_produtor', label: 'Repasse Produtor' },
  { value: 'comissao', label: 'Comissão' },
  { value: 'imposto', label: 'Imposto' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'cancelamento', label: 'Cancelamento' },
  { value: 'multa', label: 'Multa' },
  { value: 'chargeback', label: 'Chargeback' },
  { value: 'ajuste', label: 'Ajuste' },
] as const;

export const PAYMENT_STATUSES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pago', label: 'Pago' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'em_disputa', label: 'Em Disputa' },
  { value: 'reembolsado', label: 'Reembolsado' },
  { value: 'falhou', label: 'Falhou' },
] as const;

export function useFinancialRecords(filters?: { search?: string; tipo?: string; status?: string; period?: string }) {
  return useQuery({
    queryKey: ['financial', filters],
    queryFn: async () => {
      let query = sb.from('financial_records')
        .select('*, djs:dj_id(nome_artistico), producers:producer_id(nome), bookings:booking_id(titulo)')
        .order('created_at', { ascending: false });
      if (filters?.tipo && filters.tipo !== 'todos') query = query.eq('tipo', filters.tipo);
      if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
      if (filters?.search) {
        const q = escapeSearch(filters.search);
        if (q) query = query.or(`descricao.ilike.%${q}%,categoria.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useFinancialSummary() {
  return useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      // KPI cards show ALL-TIME totals (general financial health snapshot).
      // The period selector in the header controls the trend chart, not these
      // KPIs — the labels don't say "do mês".
      const { data, error } = await sb.from('financial_records')
        .select('tipo, status, valor_bruto, data_vencimento');
      if (error) throw error;
      if (!data) return { receita: 0, despesa: 0, lucro: 0, vencidos: 0, pendentes: 0 };

      const receita = data.filter((r: any) => ['receita', 'sinal', 'pagamento_final', 'parcela'].includes(r.tipo) && r.status === 'pago')
        .reduce((s: number, r: any) => s + Number(r.valor_bruto), 0);
      const despesa = data.filter((r: any) => ['despesa', 'repasse_dj', 'repasse_produtor', 'comissao', 'imposto'].includes(r.tipo) && r.status === 'pago')
        .reduce((s: number, r: any) => s + Number(r.valor_bruto), 0);
      const vencidos = data.filter((r: any) => r.status === 'vencido').length;
      const pendentes = data.filter((r: any) => r.status === 'pendente').length;

      return { receita, despesa, lucro: receita - despesa, vencidos, pendentes };
    },
  });
}

export function useFinancialReports() {
  return useQuery({
    queryKey: ['financial-reports'],
    queryFn: async () => {
      const { data, error } = await sb.from('financial_records')
        .select('tipo, status, valor_bruto, data_vencimento, created_at, dj_id, producer_id, djs:dj_id(nome_artistico), producers:producer_id(nome)');
      if (error) throw error;
      if (!data) return { monthly: [], byDJ: [], byProducer: [], byCategory: [] };

      const revenueTypes = ['receita', 'sinal', 'pagamento_final', 'parcela'];
      const expenseTypes = ['despesa', 'repasse_dj', 'repasse_produtor', 'comissao', 'imposto'];

      // Monthly aggregation (last 12 months)
      const monthMap: Record<string, { receita: number; despesa: number }> = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = { receita: 0, despesa: 0 };
      }
      data.forEach((r: any) => {
        const date = r.data_vencimento || r.created_at?.split('T')[0];
        if (!date) return;
        const key = date.substring(0, 7);
        if (!monthMap[key]) return;
        const val = Number(r.valor_bruto);
        if (revenueTypes.includes(r.tipo) && r.status === 'pago') monthMap[key].receita += val;
        if (expenseTypes.includes(r.tipo) && r.status === 'pago') monthMap[key].despesa += val;
      });
      const monthly = Object.entries(monthMap).map(([month, v]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        receita: v.receita,
        despesa: v.despesa,
        lucro: v.receita - v.despesa,
      }));

      // Revenue by DJ
      const djMap: Record<string, { name: string; total: number }> = {};
      data.forEach((r: any) => {
        if (!r.dj_id || !revenueTypes.includes(r.tipo) || r.status !== 'pago') return;
        if (!djMap[r.dj_id]) djMap[r.dj_id] = { name: r.djs?.nome_artistico || 'Unknown', total: 0 };
        djMap[r.dj_id].total += Number(r.valor_bruto);
      });
      const byDJ = Object.values(djMap).sort((a, b) => b.total - a.total).slice(0, 10);

      // Revenue by Producer
      const prodMap: Record<string, { name: string; total: number; count: number }> = {};
      data.forEach((r: any) => {
        if (!r.producer_id || !revenueTypes.includes(r.tipo) || r.status !== 'pago') return;
        if (!prodMap[r.producer_id]) prodMap[r.producer_id] = { name: r.producers?.nome || 'Unknown', total: 0, count: 0 };
        prodMap[r.producer_id].total += Number(r.valor_bruto);
        prodMap[r.producer_id].count += 1;
      });
      const byProducer = Object.values(prodMap).sort((a, b) => b.total - a.total).slice(0, 10);

      // By Category (tipo)
      const typeLabels: Record<string, string> = {};
      FINANCIAL_TYPES.forEach(t => { typeLabels[t.value] = t.label; });
      const catMap: Record<string, number> = {};
      data.forEach((r: any) => {
        const val = Number(r.valor_bruto);
        if (!catMap[r.tipo]) catMap[r.tipo] = 0;
        catMap[r.tipo] += val;
      });
      const byCategory = Object.entries(catMap)
        .map(([tipo, total]) => ({ name: typeLabels[tipo] || tipo, value: total }))
        .sort((a, b) => b.value - a.value);

      return { monthly, byDJ, byProducer, byCategory };
    },
  });
}

export function useDeleteFinancial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('financial_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      toast.success('Lançamento removido');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}
