-- Storage RLS for dj-assets (public read, admin write)
DROP POLICY IF EXISTS "Public read dj-assets" ON storage.objects;
CREATE POLICY "Public read dj-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dj-assets');

DROP POLICY IF EXISTS "Admins write dj-assets" ON storage.objects;
CREATE POLICY "Admins write dj-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dj-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update dj-assets" ON storage.objects;
CREATE POLICY "Admins update dj-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'dj-assets' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'dj-assets' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete dj-assets" ON storage.objects;
CREATE POLICY "Admins delete dj-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dj-assets' AND public.is_admin(auth.uid()));