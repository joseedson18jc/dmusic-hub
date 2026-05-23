import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';
import { escapeSearch } from '@/lib/searchEscape';

const supabaseAny = supabase as any;

export function useDJs(filters?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ['djs', filters],
    queryFn: async () => {
      let query = supabaseAny.from('djs').select('*').order('nome_artistico');

      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        const q = escapeSearch(filters.search);
        if (q) {
          query = query.or(`nome_artistico.ilike.%${q}%,nome_civil.ilike.%${q}%,email.ilike.%${q}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useDJ(id: string | undefined) {
  return useQuery({
    queryKey: ['djs', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabaseAny.from('djs').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteDJ() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny.from('djs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['djs'] });
      toast.success('DJ removido com sucesso');
    },
    onError: (err: any) => safeErrorToast(err, 'Erro ao remover DJ'),
  });
}

export function useDJBookings(djId: string | undefined) {
  return useQuery({
    queryKey: ['dj-bookings', djId],
    enabled: !!djId,
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('bookings')
        .select('*, producers:producer_id(nome, empresa)')
        .eq('dj_id', djId)
        .order('data_evento', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDJFinancial(djId: string | undefined) {
  return useQuery({
    queryKey: ['dj-financial', djId],
    enabled: !!djId,
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('financial_records')
        .select('*')
        .eq('dj_id', djId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
