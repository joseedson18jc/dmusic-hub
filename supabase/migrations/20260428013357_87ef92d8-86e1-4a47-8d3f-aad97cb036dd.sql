-- Function returning the canonical list of supported timezones
CREATE OR REPLACE FUNCTION public.supported_timezones()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'America/Sao_Paulo',
    'America/Manaus',
    'America/Rio_Branco',
    'America/Noronha',
    'America/Argentina/Buenos_Aires',
    'America/Mexico_City',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/Lisbon',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Tokyo',
    'UTC'
  ]::text[]
$$;

-- Trigger to validate timezone on bookings
CREATE OR REPLACE FUNCTION public.bookings_validate_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.fuso_horario IS NULL OR NEW.fuso_horario = '' THEN
    NEW.fuso_horario := 'America/Sao_Paulo';
  END IF;

  IF NOT (NEW.fuso_horario = ANY(public.supported_timezones())) THEN
    RAISE EXCEPTION 'INVALID_TIMEZONE: O fuso horário "%" não é suportado. Use um dos valores oficiais da lista do sistema.', NEW.fuso_horario
      USING ERRCODE = 'P0001',
            HINT = 'invalid_timezone';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_validate_timezone ON public.bookings;
CREATE TRIGGER trg_bookings_validate_timezone
  BEFORE INSERT OR UPDATE OF fuso_horario ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_validate_timezone();