
-- ============================================================
-- 1. Criar schema privado (não exposto pela PostgREST)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- ============================================================
-- 2. Recriar funções dentro de schema private (com mesmo corpo)
-- ============================================================
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION private.check_booking_conflict(
  p_dj_id uuid, p_producer_id uuid, p_data_evento date,
  p_hora_inicio time without time zone, p_hora_fim time without time zone,
  p_exclude_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(conflict_type text, booking_id uuid, titulo text, hora_inicio time without time zone, hora_fim time without time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- Manter wrappers públicos (SECURITY INVOKER) para has_role/is_admin
-- para que policies RLS continuem funcionando sem mudanças massivas
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.has_role(_user_id, _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $$
  SELECT private.is_admin(_user_id)
$$;

-- check_booking_conflict: remove versão pública (agora só interna via private)
DROP FUNCTION IF EXISTS public.check_booking_conflict(uuid, uuid, date, time, time, uuid);

-- ============================================================
-- 3. Garantir permissões corretas
-- ============================================================
-- Wrappers em public: precisam ser executáveis por authenticated (usados em RLS)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;

-- Funções privadas: nenhum acesso externo
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.check_booking_conflict(uuid, uuid, date, time, time, uuid) FROM PUBLIC, anon, authenticated;
