import { supabase } from '@/integrations/supabase/client';

/**
 * Hold dates — reserva temporária de data por X dias.
 *
 * Por que isso é DJ-mgmt-specific:
 * No mercado de eventos, é padrão produtor pedir "segura essa data pra mim
 * por 7 dias enquanto fecho o budget". Sem mecanismo formal:
 *  - Agência aceita verbalmente, esquece, vende a data pra outro produtor
 *    → produtor original processa
 *  - OU agência segura indefinidamente, perde lead novo → receita perdida
 *
 * Solução: status `aguardando_aprovacao` ganha um companion `hold_until`
 * (timestamp). UI mostra timer countdown. Cron edge function expira
 * automaticamente passado o prazo, convertendo pra `fechado_perdido`.
 *
 * Requer schema change (uma coluna `hold_until` na tabela `bookings`).
 * SQL de migration no final do arquivo + em /supabase/migrations.
 */

const sb = supabase as any;

/** Quantidade máxima permitida para um hold (limite anti-abuso). */
export const MAX_HOLD_DAYS = 14;
/** Default sugerido na UI. */
export const DEFAULT_HOLD_DAYS = 7;

export interface SetHoldArgs {
  booking_id: string;
  days: number;
  user_id?: string | null;
}

/**
 * Coloca um booking em hold por N dias. Idempotente — se já estiver em hold,
 * sobrescreve o `hold_until` (renovação).
 */
export async function setHold(args: SetHoldArgs): Promise<{ hold_until: string }> {
  const days = Math.min(MAX_HOLD_DAYS, Math.max(1, Math.floor(args.days)));
  const holdUntil = new Date();
  holdUntil.setDate(holdUntil.getDate() + days);
  const iso = holdUntil.toISOString();

  // Atualiza booking: status passa pra aguardando_aprovacao se ainda não estiver
  // num estágio mais avançado.
  const { data: current = null } = await sb
    .from('bookings')
    .select('status')
    .eq('id', args.booking_id)
    .maybeSingle();
  const newStatus =
    current && ['novo_lead', 'qualificado', 'briefing_recebido', 'proposta_enviada'].includes(
      (current as { status: string }).status,
    )
      ? 'aguardando_aprovacao'
      : (current as { status: string } | null)?.status;

  const { error } = await sb
    .from('bookings')
    .update({ hold_until: iso, status: newStatus })
    .eq('id', args.booking_id);
  if (error) throw error;

  // Audit
  await sb.from('audit_logs').insert({
    user_id: args.user_id ?? null,
    action: 'hold_set',
    entity_type: 'bookings',
    entity_id: args.booking_id,
    details: { hold_until: iso, days },
  });

  return { hold_until: iso };
}

/**
 * Remove o hold de um booking (libera a data).
 */
export async function clearHold(booking_id: string, user_id?: string | null): Promise<void> {
  const { error } = await sb
    .from('bookings')
    .update({ hold_until: null })
    .eq('id', booking_id);
  if (error) throw error;

  await sb.from('audit_logs').insert({
    user_id: user_id ?? null,
    action: 'hold_clear',
    entity_type: 'bookings',
    entity_id: booking_id,
    details: {},
  });
}

/**
 * Estado computado do hold a partir do `hold_until`.
 */
export interface HoldStatus {
  active: boolean;
  expired: boolean;
  /** ms até expirar. Pode ser negativo se expirado. */
  msRemaining: number;
  /** "expira em 3d 4h" ou "expirou há 1d" — pronto pra exibir. */
  label: string;
  /** Cor sugerida pra UI badge. */
  tone: 'success' | 'warning' | 'destructive' | 'neutral';
}

export function describeHold(hold_until: string | null | undefined): HoldStatus {
  if (!hold_until) {
    return { active: false, expired: false, msRemaining: 0, label: 'sem hold', tone: 'neutral' };
  }
  const target = new Date(hold_until).getTime();
  const now = Date.now();
  const ms = target - now;
  const expired = ms <= 0;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);

  const tone: HoldStatus['tone'] = expired
    ? 'destructive'
    : ms < 24 * 3_600_000
    ? 'warning'
    : 'success';

  const label = expired
    ? `expirou há ${days > 0 ? `${days}d ${hours}h` : `${hours}h`}`
    : `expira em ${days > 0 ? `${days}d ${hours}h` : `${hours}h`}`;

  return { active: !expired, expired, msRemaining: ms, label, tone };
}

/**
 * Lista bookings com hold ativo expirando em N horas (default 24h).
 * Útil pra dashboard "Holds expirando".
 */
export async function listHoldsExpiringSoon(hoursAhead = 24): Promise<
  Array<{ id: string; titulo: string; hold_until: string; producer_id: string | null; dj_id: string | null }>
> {
  const upper = new Date();
  upper.setHours(upper.getHours() + hoursAhead);

  const { data = [] } = await sb
    .from('bookings')
    .select('id, titulo, hold_until, producer_id, dj_id')
    .not('hold_until', 'is', null)
    .lt('hold_until', upper.toISOString())
    .gt('hold_until', new Date().toISOString())
    .order('hold_until', { ascending: true });
  return data as any[];
}

/**
 * SQL pra rodar no dashboard Supabase ANTES de usar essa lib em produção:
 *
 * ```sql
 * ALTER TABLE public.bookings
 *   ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ;
 *
 * CREATE INDEX IF NOT EXISTS idx_bookings_hold_until
 *   ON public.bookings (hold_until)
 *   WHERE hold_until IS NOT NULL;
 *
 * COMMENT ON COLUMN public.bookings.hold_until IS
 *   'Quando este booking sai do hold (status aguardando_aprovacao). NULL = sem hold ativo.';
 * ```
 *
 * Opcional — cron via Supabase scheduled function pra expirar holds:
 *   - Frequência: a cada 1 hora
 *   - Lógica: UPDATE bookings SET status='fechado_perdido' WHERE hold_until < now() AND status='aguardando_aprovacao'
 */
