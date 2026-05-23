import { supabase } from '@/integrations/supabase/client';

/**
 * Fee negotiation timeline — histórico de propostas/contrapropostas por booking.
 *
 * Por que isso é DJ-mgmt-specific:
 * Produtor pergunta "o que ficou acordado?" 3x ao longo da negociação.
 * Hoje você muda `bookings.fee_acordado` e perde o histórico — não consegue
 * provar "te ofereci 12k, você pediu 8k, fechamos 10k, lembra?"
 *
 * Solução: usa a tabela `audit_logs` que JÁ EXISTE (entity_type='bookings',
 * action='fee_change') pra registrar cada mudança de cachê com:
 *  - quem mudou (`user_id`)
 *  - valor anterior + valor novo
 *  - quem propôs (agência / produtor)
 *  - nota opcional explicando ("subiu por travel cost", "desconto fim de mês")
 *
 * Resultado: timeline do cachê fica reconstruível pelo `audit_logs` sem
 * schema change. Zero migration.
 */

const sb = supabase as any;

export interface FeeChange {
  id: string;
  /** Quando aconteceu (ISO). */
  at: string;
  /** Valor anterior do `fee_acordado`. */
  from_amount: number | null;
  /** Valor novo. */
  to_amount: number;
  /** Quem propôs essa mudança? (lado da agência ou do produtor) */
  proposed_by: 'agencia' | 'produtor';
  /** Nota livre explicando a mudança ("subiu 1k pq travel SP-Rio"). */
  note?: string;
  /** user_id de quem registrou (do nosso lado). */
  user_id: string | null;
  /** Nome humano de quem registrou — preenchido por join no `profiles`. */
  user_name?: string;
}

const ACTION_KEY = 'fee_change';

export interface RecordFeeChangeArgs {
  booking_id: string;
  from_amount: number | null;
  to_amount: number;
  proposed_by: 'agencia' | 'produtor';
  note?: string;
  user_id?: string | null;
}

/**
 * Registra uma mudança de cachê no audit_logs.
 * Não atualiza `bookings.fee_acordado` — quem chama esta função decide se
 * persiste o novo valor no booking (geralmente sim).
 */
export async function recordFeeChange(args: RecordFeeChangeArgs): Promise<void> {
  const details = {
    from: args.from_amount,
    to: args.to_amount,
    delta: args.to_amount - (args.from_amount ?? 0),
    proposed_by: args.proposed_by,
    note: args.note ?? null,
  };
  const { error } = await sb.from('audit_logs').insert({
    user_id: args.user_id ?? null,
    action: ACTION_KEY,
    entity_type: 'bookings',
    entity_id: args.booking_id,
    details,
  });
  if (error) throw error;
}

/**
 * Carrega timeline ordenada (mais antiga → mais recente) de mudanças de
 * cachê de um booking. Faz join soft com `profiles` pra exibir o nome.
 */
export async function fetchFeeHistory(booking_id: string): Promise<FeeChange[]> {
  const { data = [], error } = await sb
    .from('audit_logs')
    .select('id, created_at, user_id, action, entity_id, details')
    .eq('action', ACTION_KEY)
    .eq('entity_type', 'bookings')
    .eq('entity_id', booking_id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = data as Array<{
    id: string;
    created_at: string;
    user_id: string | null;
    details: {
      from: number | null;
      to: number;
      proposed_by: 'agencia' | 'produtor';
      note?: string | null;
    };
  }>;

  // Fetch user names em batch
  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
  );
  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles = [] } = await sb
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    nameMap = Object.fromEntries(
      (profiles as Array<{ user_id: string; full_name: string | null }>).map((p) => [
        p.user_id,
        p.full_name ?? 'Usuário',
      ]),
    );
  }

  return rows.map((r) => ({
    id: r.id,
    at: r.created_at,
    from_amount: r.details.from,
    to_amount: r.details.to,
    proposed_by: r.details.proposed_by,
    note: r.details.note ?? undefined,
    user_id: r.user_id,
    user_name: r.user_id ? nameMap[r.user_id] : undefined,
  }));
}

/**
 * Calcula uma narrativa curta do que aconteceu na negociação.
 * Útil pra exibir resumo no card do booking.
 *
 * Exemplos de output:
 *  - "Cachê fechado em R$ 8.000 (2 contrapropostas)"
 *  - "Cachê inicial R$ 10.000; produtor pediu R$ 8.000; fechou em R$ 8.500"
 *  - "Sem histórico de negociação"
 */
export function summarizeFeeHistory(history: FeeChange[]): string {
  if (history.length === 0) return 'Sem histórico de negociação';
  if (history.length === 1) {
    const fmt = (v: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
    return `Cachê definido em ${fmt(history[0].to_amount)}`;
  }
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
  const first = history[0];
  const last = history[history.length - 1];
  const counterproposals = history.filter((h) => h.proposed_by === 'produtor').length;
  return `Inicial ${fmt(first.to_amount)} → fechado ${fmt(last.to_amount)} (${counterproposals} contraproposta${counterproposals !== 1 ? 's' : ''})`;
}
