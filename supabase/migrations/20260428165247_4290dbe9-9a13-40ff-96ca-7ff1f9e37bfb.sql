-- 1) Bucket privado: bloqueia listing público e URLs públicas.
UPDATE storage.buckets
   SET public = false
 WHERE id = 'dj-assets';

-- 2) Remove policies amplas redundantes.
DROP POLICY IF EXISTS "Public read dj assets"       ON storage.objects;
DROP POLICY IF EXISTS "Public read dj-assets files" ON storage.objects;

-- 3) Garante policy estrita: leitura só com path completo (nome contendo '/').
--    Previne listing (que usa prefixo vazio) mesmo com policy de SELECT,
--    porque sem '/' no name a condição falha. Ataques de listagem retornam 0 linhas.
DROP POLICY IF EXISTS "Public download dj-assets" ON storage.objects;
CREATE POLICY "Read dj-assets by exact path"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'dj-assets'
  AND name IS NOT NULL
  AND length(name) > 0
  AND POSITION('/' IN name) > 0
);