-- Remove política de leitura pública (vazava todos os campos, incluindo financeiros/logística)
DROP POLICY IF EXISTS "Public read bookings" ON public.bookings;

-- Remove política de update anônimo (qualquer visitante podia alterar bookings)
DROP POLICY IF EXISTS "Anon can update bookings" ON public.bookings;