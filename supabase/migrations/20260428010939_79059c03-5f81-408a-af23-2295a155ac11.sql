ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS file_path text;

-- Storage policies for contracts bucket (admins manage, finance reads)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage contract files' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Admins manage contract files" ON storage.objects FOR ALL TO authenticated
      USING (bucket_id = 'contracts' AND public.is_admin(auth.uid()))
      WITH CHECK (bucket_id = 'contracts' AND public.is_admin(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Finance reads contract files' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Finance reads contract files" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'contracts' AND public.has_role(auth.uid(), 'finance'::app_role));
  END IF;
END $$;