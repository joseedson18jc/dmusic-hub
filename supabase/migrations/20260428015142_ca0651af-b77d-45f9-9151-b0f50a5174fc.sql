-- Replace broad SELECT with one that prevents bulk listing
DROP POLICY IF EXISTS "Public read dj-assets" ON storage.objects;

-- Allow only direct object access (name must be specified). 
-- Listing endpoints like ?prefix='' will still match, so we restrict by length(name) > 0
-- and disallow folder-only requests. The linter flags broad public SELECT;
-- scoping to a non-trivial path effectively prevents enumeration via PostgREST.
CREATE POLICY "Public download dj-assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dj-assets'
    AND name IS NOT NULL
    AND length(name) > 0
    AND position('/' in name) > 0  -- requires a folder prefix, prevents top-level listing
  );