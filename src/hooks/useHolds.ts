import { useQuery } from '@tanstack/react-query';
import { listHoldsExpiringSoon } from '@/lib/holdDates';

/**
 * Hook que retorna bookings com hold expirando em N horas.
 * Auto-refresh a cada 60s pra ter timer "vivo" no dashboard.
 *
 * Requer migration `hold_until` aplicada — se a coluna não existe,
 * o query retorna [] silenciosamente.
 */
export function useHoldsExpiringSoon(hoursAhead = 24) {
  return useQuery({
    queryKey: ['holds-expiring-soon', hoursAhead],
    queryFn: async () => {
      try {
        return await listHoldsExpiringSoon(hoursAhead);
      } catch (err: unknown) {
        // Se a coluna ainda não existe (migration não aplicada), retorna [] em vez de quebrar.
        // PostgreSQL erro 42703 = "column does not exist"
        const msg = (err as { message?: string })?.message ?? '';
        if (msg.includes('column') && msg.includes('hold_until')) return [];
        throw err;
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
