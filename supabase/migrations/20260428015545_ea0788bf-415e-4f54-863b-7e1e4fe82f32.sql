-- ============================================================
-- 1) PUBLIC SAFE VIEWS for djs and producers
-- ============================================================
CREATE OR REPLACE VIEW public.public_djs
WITH (security_invoker = on) AS
SELECT
  id,
  nome_artistico,
  mini_bio,
  bio_completa,
  foto_url,
  press_kit_url,
  generos_musicais,
  estilo_performance,
  idiomas,
  cidade,
  pais,
  instagram,
  soundcloud,
  spotify,
  youtube,
  tiktok,
  status,
  score_confiabilidade,
  created_at
FROM public.djs
WHERE status = 'ativo';

CREATE OR REPLACE VIEW public.public_producers
WITH (security_invoker = on) AS
SELECT
  id,
  nome,
  empresa,
  tipo_produtor,
  cidade,
  pais,
  site,
  instagram,
  papeis_comerciais,
  tags,
  status_relacionamento,
  created_at
FROM public.producers
WHERE status_relacionamento = 'ativo';

-- Allow anon and authenticated to query the views
GRANT SELECT ON public.public_djs TO anon, authenticated;
GRANT SELECT ON public.public_producers TO anon, authenticated;

-- Remove anon read of full tables (PII)
DROP POLICY IF EXISTS "Public read djs" ON public.djs;
DROP POLICY IF EXISTS "Public read producers" ON public.producers;

-- Add authenticated read of full tables (admins/finance/dj already covered via own policies;
-- this opens all authenticated reads of base columns - we keep it scoped via existing role policies).
-- Authenticated catch-all SELECT for djs (allows in-app browsing while admins/finance/dj-own remain)
CREATE POLICY "Authenticated read djs"
  ON public.djs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read producers"
  ON public.producers FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Note: the views use security_invoker, so they respect the caller's RLS.
-- For anon, we need a SELECT policy allowing anon to read the limited columns.
-- We handle this by granting anon SELECT only on the view, and the view's WHERE clause limits scope.
-- However, security_invoker requires RLS to permit the row. Add a tightly scoped anon policy:

CREATE POLICY "Anon reads via public_djs view"
  ON public.djs FOR SELECT
  TO anon
  USING (status = 'ativo');

CREATE POLICY "Anon reads via public_producers view"
  ON public.producers FOR SELECT
  TO anon
  USING (status_relacionamento = 'ativo');

-- IMPORTANT: anon can technically still SELECT all columns from the base table.
-- Mitigation: column-level grants. Revoke anon access to sensitive columns.
REVOKE SELECT ON public.djs FROM anon;
GRANT SELECT (
  id, nome_artistico, mini_bio, bio_completa, foto_url, press_kit_url,
  generos_musicais, estilo_performance, idiomas, cidade, pais,
  instagram, soundcloud, spotify, youtube, tiktok, status,
  score_confiabilidade, created_at
) ON public.djs TO anon;

REVOKE SELECT ON public.producers FROM anon;
GRANT SELECT (
  id, nome, empresa, tipo_produtor, cidade, pais, site, instagram,
  papeis_comerciais, tags, status_relacionamento, created_at
) ON public.producers TO anon;

-- ============================================================
-- 2) STORAGE: dj-assets ownership-scoped policies
-- ============================================================
DROP POLICY IF EXISTS "Admins write dj-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins update dj-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete dj-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload dj assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users manage dj assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete dj assets" ON storage.objects;

-- DJ can write to {user_id}/... ; admins can write anywhere
CREATE POLICY "DJ owns folder dj-assets insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dj-assets'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "DJ owns folder dj-assets update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'dj-assets'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'dj-assets'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "DJ owns folder dj-assets delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dj-assets'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ============================================================
-- 3) PRIVATE BUCKETS: explicit policies (admin only by default)
-- ============================================================
DO $$
DECLARE
  v_bucket text;
BEGIN
  FOREACH v_bucket IN ARRAY ARRAY['invoices','receipts','producer-docs','private-files','contracts']
  LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Admins read %1$s" ON storage.objects;
      CREATE POLICY "Admins read %1$s"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = %2$L AND public.is_admin(auth.uid()));

      DROP POLICY IF EXISTS "Admins write %1$s" ON storage.objects;
      CREATE POLICY "Admins write %1$s"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = %2$L AND public.is_admin(auth.uid()));

      DROP POLICY IF EXISTS "Admins update %1$s" ON storage.objects;
      CREATE POLICY "Admins update %1$s"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = %2$L AND public.is_admin(auth.uid()))
        WITH CHECK (bucket_id = %2$L AND public.is_admin(auth.uid()));

      DROP POLICY IF EXISTS "Admins delete %1$s" ON storage.objects;
      CREATE POLICY "Admins delete %1$s"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = %2$L AND public.is_admin(auth.uid()));
    $f$, v_bucket, v_bucket);
  END LOOP;
END$$;