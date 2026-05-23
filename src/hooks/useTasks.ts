import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';
import { escapeSearch } from '@/lib/searchEscape';

const sb = supabase as any;

export const TASK_STATUSES = [
  { value: 'a_fazer', label: 'A Fazer', emoji: '📋' },
  { value: 'em_andamento', label: 'Em Andamento', emoji: '🔄' },
  { value: 'aguardando_terceiro', label: 'Aguardando', emoji: '⏳' },
  { value: 'concluida', label: 'Concluída', emoji: '✅' },
  { value: 'atrasada', label: 'Atrasada', emoji: '🔴' },
  { value: 'cancelada', label: 'Cancelada', emoji: '❌' },
] as const;

export const TASK_PRIORITIES = [
  { value: 'alta', label: 'Alta', emoji: '🔴', color: 'text-destructive' },
  { value: 'media', label: 'Média', emoji: '🟡', color: 'text-[hsl(var(--warning))]' },
  { value: 'baixa', label: 'Baixa', emoji: '🟢', color: 'text-[hsl(var(--success))]' },
] as const;

export const KANBAN_TASK_COLUMNS = [
  { key: 'a_fazer', label: 'A Fazer', statuses: ['a_fazer'] },
  { key: 'em_andamento', label: 'Em Andamento', statuses: ['em_andamento'] },
  { key: 'aguardando', label: 'Aguardando', statuses: ['aguardando_terceiro'] },
  { key: 'concluida', label: 'Concluída', statuses: ['concluida'] },
] as const;

export function useTasks(filters?: { search?: string; status?: string; prioridade?: string; dj_id?: string; producer_id?: string }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = sb.from('tasks')
        .select('*, djs:dj_id(nome_artistico), producers:producer_id(nome), bookings:booking_id(titulo)')
        .order('prazo', { ascending: true, nullsFirst: false });
      if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status);
      if (filters?.prioridade && filters.prioridade !== 'todos') query = query.eq('prioridade', filters.prioridade);
      if (filters?.dj_id) query = query.eq('dj_id', filters.dj_id);
      if (filters?.producer_id) query = query.eq('producer_id', filters.producer_id);
      if (filters?.search) {
        const q = escapeSearch(filters.search);
        if (q) query = query.ilike('titulo', `%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'concluida') updates.concluida_em = new Date().toISOString();
      const { error } = await sb.from('tasks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => safeErrorToast(err),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa removida');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}
