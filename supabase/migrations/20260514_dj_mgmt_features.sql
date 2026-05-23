-- ════════════════════════════════════════════════════════════════════════
-- Migration: DJ-mgmt agency features
-- Data: 2026-05-14
--
-- Adiciona suporte pras 4 features P0 DJ-mgmt-specific implementadas
-- nesta sessão. Aplica via dashboard Supabase ou supabase CLI.
--
-- Rollback abaixo (commented out — copiar/colar se precisar reverter).
-- ════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- 1. Hold dates (P0 #4)
--    Coluna pra rastrear a data até a qual um booking está "segurado" pelo
--    produtor durante negociação. Quando ultrapassa, edge function/cron
--    converte pra `fechado_perdido` automaticamente.
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_hold_until
  ON public.bookings (hold_until)
  WHERE hold_until IS NOT NULL;

COMMENT ON COLUMN public.bookings.hold_until IS
  'Quando este booking sai do hold (status aguardando_aprovacao). NULL = sem hold ativo. Limite: 14 dias do dia da criação.';


-- ────────────────────────────────────────────────────────────────────────
-- 2. Rider snapshot no booking (P1 #5)
--    Hoje cada DJ tem 1 rider técnico em URL (rider_tecnico_url). Mas cada
--    venue pode ajustar (sem CDJ-3000 → ofereceu CDJ-2000, p.ex.). A coluna
--    abaixo guarda um SNAPSHOT do rider no momento da confirmação +
--    checkbox de "venue confirmou".
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rider_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS rider_confirmed_by_venue BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rider_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.rider_snapshot IS
  'Cópia do rider técnico no momento da confirmação. Estrutura: {equipment:[], hospitality:[], notes:""}. Permite venue customizar sem alterar o rider master do DJ.';
COMMENT ON COLUMN public.bookings.rider_confirmed_by_venue IS
  'Venue confirmou que tem o equipamento listado no snapshot.';


-- ────────────────────────────────────────────────────────────────────────
-- 3. Multi-DJ bookings (P2 #7) — junction table
--    Festivals e eventos que contratam múltiplos DJs da agência num único
--    booking (1 produtor + 3 DJs + 1 data). Cada DJ tem seu cachê,
--    posição no line-up, e horário próprio.
--
--    O `dj_id` original em `bookings` continua existindo como o "DJ
--    principal" (compat com queries existentes). DJs adicionais entram em
--    `booking_djs`.
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_djs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE RESTRICT,
  fee_acordado NUMERIC(12, 2),
  comissao_pct NUMERIC(5, 2),
  position TEXT CHECK (position IN ('opener', 'main', 'headliner', 'closing', 'guest')),
  hora_inicio TIME,
  hora_fim TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, dj_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_djs_booking ON public.booking_djs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_djs_dj ON public.booking_djs(dj_id);

ALTER TABLE public.booking_djs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_djs_select" ON public.booking_djs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "booking_djs_modify" ON public.booking_djs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

COMMENT ON TABLE public.booking_djs IS
  'DJs adicionais num booking (festivais, line-ups múltiplos). O dj_id principal continua em bookings.dj_id.';


-- ────────────────────────────────────────────────────────────────────────
-- 4. Tracklist pós-show (P2 #9)
--    DJ envia o setlist após o show. Útil pra:
--    - Royalties (ECAD/StreamSafe — fornece o setlist via export)
--    - Histórico/portfólio
--    - Análise de hits por DJ
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tracklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  total_tracks INT GENERATED ALWAYS AS (0) STORED, -- placeholder; preencher via trigger
  UNIQUE(booking_id)
);

CREATE TABLE IF NOT EXISTS public.tracklist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracklist_id UUID NOT NULL REFERENCES public.tracklists(id) ON DELETE CASCADE,
  position INT NOT NULL,
  artist TEXT,
  title TEXT NOT NULL,
  isrc TEXT, -- código internacional pra royalties
  duration_seconds INT,
  played_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracklist_tracks_tracklist ON public.tracklist_tracks(tracklist_id, position);

ALTER TABLE public.tracklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracklist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tracklists_select_dj_or_admin" ON public.tracklists
  FOR SELECT TO authenticated
  USING (
    dj_id IN (SELECT id FROM public.djs WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'finance'))
  );

CREATE POLICY "tracklists_insert_dj_or_admin" ON public.tracklists
  FOR INSERT TO authenticated
  WITH CHECK (
    dj_id IN (SELECT id FROM public.djs WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "tracks_select" ON public.tracklist_tracks
  FOR SELECT TO authenticated
  USING (
    tracklist_id IN (
      SELECT id FROM public.tracklists WHERE
        dj_id IN (SELECT id FROM public.djs WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'finance'))
    )
  );

CREATE POLICY "tracks_modify_dj" ON public.tracklist_tracks
  FOR ALL TO authenticated
  USING (
    tracklist_id IN (
      SELECT id FROM public.tracklists WHERE
        dj_id IN (SELECT id FROM public.djs WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin'))
    )
  );

COMMENT ON TABLE public.tracklists IS 'Setlist enviado pelo DJ pós-show. Usado pra royalties + portfólio.';
COMMENT ON TABLE public.tracklist_tracks IS 'Músicas individuais do tracklist, ordenadas por position.';


-- ════════════════════════════════════════════════════════════════════════
-- ROLLBACK (caso precise reverter):
-- ════════════════════════════════════════════════════════════════════════
-- DROP TABLE IF EXISTS public.tracklist_tracks;
-- DROP TABLE IF EXISTS public.tracklists;
-- DROP TABLE IF EXISTS public.booking_djs;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS hold_until;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS rider_snapshot;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS rider_confirmed_by_venue;
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS rider_confirmed_at;
