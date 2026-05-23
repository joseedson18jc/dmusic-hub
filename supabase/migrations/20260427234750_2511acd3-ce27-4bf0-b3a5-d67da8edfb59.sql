-- Server-side double booking prevention via trigger + RPC
-- Conflicts considered ACTIVE for these statuses (not cancelled/lost)
CREATE OR REPLACE FUNCTION public.bookings_check_no_conflict()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_conflict RECORD;
  v_active_statuses booking_status[] := ARRAY[
    'novo_lead','qualificado','briefing_recebido','proposta_enviada',
    'negociacao','aguardando_aprovacao','contrato_enviado','assinatura_pendente',
    'sinal_pendente','confirmado','planejamento','pronto_para_evento',
    'evento_realizado','pagamento_final_pendente','repasse_pendente','fechado_ganho'
  ]::booking_status[];
BEGIN
  -- Skip when this booking itself is cancelled/lost or has no event date
  IF NEW.data_evento IS NULL OR NEW.status = ANY(ARRAY['fechado_perdido']::booking_status[]) THEN
    RETURN NEW;
  END IF;

  -- Skip if status is not in active list
  IF NOT (NEW.status = ANY(v_active_statuses)) THEN
    RETURN NEW;
  END IF;

  -- DJ conflict check (only if dj_id is set)
  IF NEW.dj_id IS NOT NULL THEN
    SELECT b.id, b.titulo, b.data_evento, b.hora_inicio, b.hora_fim
      INTO v_conflict
      FROM public.bookings b
     WHERE b.dj_id = NEW.dj_id
       AND b.data_evento = NEW.data_evento
       AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND b.status = ANY(v_active_statuses)
       AND (
         -- No times on either side: same day = conflict
         (NEW.hora_inicio IS NULL OR NEW.hora_fim IS NULL OR b.hora_inicio IS NULL OR b.hora_fim IS NULL)
         OR
         -- Time interval overlap
         (NEW.hora_inicio < b.hora_fim AND b.hora_inicio < NEW.hora_fim)
       )
     LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'DOUBLE_BOOKING_DJ: Este DJ já tem um evento agendado em % (%) que conflita com o novo horário.',
        to_char(v_conflict.data_evento, 'DD/MM/YYYY'),
        v_conflict.titulo
        USING ERRCODE = 'P0001',
              HINT = 'dj_conflict';
    END IF;
  END IF;

  -- Producer conflict check (only if producer_id is set and times provided on both sides)
  IF NEW.producer_id IS NOT NULL THEN
    SELECT b.id, b.titulo, b.data_evento
      INTO v_conflict
      FROM public.bookings b
     WHERE b.producer_id = NEW.producer_id
       AND b.data_evento = NEW.data_evento
       AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND b.status = ANY(v_active_statuses)
       AND NEW.hora_inicio IS NOT NULL AND NEW.hora_fim IS NOT NULL
       AND b.hora_inicio IS NOT NULL AND b.hora_fim IS NOT NULL
       AND NEW.hora_inicio < b.hora_fim AND b.hora_inicio < NEW.hora_fim
     LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'DOUBLE_BOOKING_PRODUCER: Este produtor já tem um evento agendado em % (%) com horário sobreposto.',
        to_char(v_conflict.data_evento, 'DD/MM/YYYY'),
        v_conflict.titulo
        USING ERRCODE = 'P0001',
              HINT = 'producer_conflict';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_no_conflict ON public.bookings;
CREATE TRIGGER trg_bookings_no_conflict
BEFORE INSERT OR UPDATE OF dj_id, producer_id, data_evento, hora_inicio, hora_fim, status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.bookings_check_no_conflict();

-- Helpful indexes for conflict lookups
CREATE INDEX IF NOT EXISTS idx_bookings_dj_data ON public.bookings(dj_id, data_evento) WHERE dj_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_producer_data ON public.bookings(producer_id, data_evento);

-- Optional RPC for pre-flight checks from the client (read-only)
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_dj_id uuid,
  p_producer_id uuid,
  p_data_evento date,
  p_hora_inicio time,
  p_hora_fim time,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE(conflict_type text, booking_id uuid, titulo text, hora_inicio time, hora_fim time)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH active AS (
    SELECT * FROM public.bookings
    WHERE data_evento = p_data_evento
      AND id <> COALESCE(p_exclude_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('fechado_perdido')
  )
  SELECT 'dj'::text, b.id, b.titulo, b.hora_inicio, b.hora_fim
    FROM active b
   WHERE p_dj_id IS NOT NULL AND b.dj_id = p_dj_id
     AND (
       (p_hora_inicio IS NULL OR p_hora_fim IS NULL OR b.hora_inicio IS NULL OR b.hora_fim IS NULL)
       OR (p_hora_inicio < b.hora_fim AND b.hora_inicio < p_hora_fim)
     )
  UNION ALL
  SELECT 'producer'::text, b.id, b.titulo, b.hora_inicio, b.hora_fim
    FROM active b
   WHERE p_producer_id IS NOT NULL AND b.producer_id = p_producer_id
     AND p_hora_inicio IS NOT NULL AND p_hora_fim IS NOT NULL
     AND b.hora_inicio IS NOT NULL AND b.hora_fim IS NOT NULL
     AND p_hora_inicio < b.hora_fim AND b.hora_inicio < p_hora_fim
  LIMIT 5;
$$;