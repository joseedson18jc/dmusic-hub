import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';
import { escapeSearch } from '@/lib/searchEscape';

const sb = supabase as any;

export function useProducers(filters?: { search?: string; status?: string; papel?: string }) {
  return useQuery({
    queryKey: ['producers', filters],
    queryFn: async () => {
      let query = sb.from('producers').select('*').order('nome');
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status_relacionamento', filters.status);
      }
      if (filters?.search) {
        const q = escapeSearch(filters.search);
        if (q) {
          query = query.or(`nome.ilike.%${q}%,empresa.ilike.%${q}%,email.ilike.%${q}%`);
        }
      }
      if (filters?.papel && filters.papel !== 'todos') {
        query = query.contains('papeis_comerciais', [filters.papel]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useProducer(id: string | undefined) {
  return useQuery({
    queryKey: ['producers', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb.from('producers').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProducerContacts(producerId: string | undefined) {
  return useQuery({
    queryKey: ['producer-contacts', producerId],
    enabled: !!producerId,
    queryFn: async () => {
      const { data, error } = await sb.from('producer_contacts').select('*').eq('producer_id', producerId).order('nome');
      if (error) throw error;
      return data;
    },
  });
}

export function useProducerBookings(producerId: string | undefined) {
  return useQuery({
    queryKey: ['producer-bookings', producerId],
    enabled: !!producerId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('bookings')
        .select('*, djs:dj_id(nome_artistico)')
        .eq('producer_id', producerId)
        .order('data_evento', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProducerFinancial(producerId: string | undefined) {
  return useQuery({
    queryKey: ['producer-financial', producerId],
    enabled: !!producerId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('financial_records')
        .select('*')
        .eq('producer_id', producerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteProducer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('producers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producers'] });
      toast.success('Produtor removido com sucesso');
    },
    onError: (err: any) => safeErrorToast(err, 'Erro ao remover produtor'),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (contact: any) => {
      const { error } = await sb.from('producer_contacts').insert(contact);
      if (error) throw error;
    },
    onSuccess: (_: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['producer-contacts', vars.producer_id] });
      toast.success('Contato adicionado');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, producerId }: { id: string; producerId: string }) => {
      const { error } = await sb.from('producer_contacts').delete().eq('id', id);
      if (error) throw error;
      return producerId;
    },
    onSuccess: (_: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['producer-contacts', vars.producerId] });
      toast.success('Contato removido');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

export const PAPEIS_COMERCIAIS = [
  { value: 'contratante', label: 'Contratante' },
  { value: 'intermediador', label: 'Intermediador' },
  { value: 'promoter', label: 'Promoter' },
  { value: 'agencia', label: 'Agência' },
  { value: 'parceiro_estrategico', label: 'Parceiro Estratégico' },
  { value: 'produtor_executivo', label: 'Produtor Executivo' },
  { value: 'responsavel_financeiro', label: 'Responsável Financeiro' },
] as const;

export const STATUS_RELACIONAMENTO = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'prospeccao', label: 'Prospecção' },
  { value: 'bloqueado', label: 'Bloqueado' },
] as const;

export const CONTACT_ROLES = [
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'booking', label: 'Booking' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'assistente', label: 'Assistente' },
  { value: 'socio', label: 'Sócio' },
] as const;
