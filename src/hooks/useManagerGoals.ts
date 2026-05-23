import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { safeErrorToast } from '@/lib/safeToast';

const sb = supabase as any;

export function useManagerGoals(yearMonth: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['manager-goals', yearMonth],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await sb
        .from('manager_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('year_month', yearMonth)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; meta_receita: number; meta_bookings: number } | null;
    },
    enabled: !!user?.id,
  });
}

export function useUpsertGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ yearMonth, meta_receita, meta_bookings }: { yearMonth: string; meta_receita: number; meta_bookings: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await sb
        .from('manager_goals')
        .upsert(
          { user_id: user.id, year_month: yearMonth, meta_receita, meta_bookings, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,year_month' }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['manager-goals', vars.yearMonth] });
      toast.success('Metas atualizadas!');
    },
    onError: (err: any) => safeErrorToast(err),
  });
}
