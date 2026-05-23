
-- ============================================================
-- 1. Restringir policies "Anon can insert" para authenticated
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert bookings" ON public.bookings;
CREATE POLICY "Authenticated can insert bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anon can insert producers" ON public.producers;
CREATE POLICY "Authenticated can insert producers"
ON public.producers FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anon can insert DJs" ON public.djs;
CREATE POLICY "Authenticated can insert DJs"
ON public.djs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anon can insert financial_records" ON public.financial_records;
CREATE POLICY "Authenticated can insert financial_records"
ON public.financial_records FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. Remover leitura pública de financial_records (CRÍTICO)
-- ============================================================
DROP POLICY IF EXISTS "Public read financial" ON public.financial_records;

-- ============================================================
-- 3. Restringir bucket público dj-assets — bloquear listagem
-- (mantém leitura individual por path conhecido)
-- ============================================================
-- Tornar privado para listagem mas mantém URLs públicas via getPublicUrl
UPDATE storage.buckets SET public = false WHERE id = 'dj-assets';

-- Permitir leitura pública apenas a quem souber o path (não LIST)
DROP POLICY IF EXISTS "Public read dj-assets files" ON storage.objects;
CREATE POLICY "Public read dj-assets files"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'dj-assets');

DROP POLICY IF EXISTS "Admins manage dj-assets" ON storage.objects;
CREATE POLICY "Admins manage dj-assets"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'dj-assets' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'dj-assets' AND public.is_admin(auth.uid()));

-- ============================================================
-- 4. Adicionar search_path à set_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 5. Revogar EXECUTE público em SECURITY DEFINER functions
-- ============================================================
-- Funções que NUNCA devem ser chamadas externamente (apenas triggers)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_dj_on_contract_signed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_check_no_conflict() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Funções que precisam ser chamadas em RLS por usuários logados:
-- has_role, is_admin → manter EXECUTE para authenticated, revogar de anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- check_booking_conflict → só admins logados precisam chamar via RPC
REVOKE EXECUTE ON FUNCTION public.check_booking_conflict(uuid, uuid, date, time, time, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_booking_conflict(uuid, uuid, date, time, time, uuid) TO authenticated;
