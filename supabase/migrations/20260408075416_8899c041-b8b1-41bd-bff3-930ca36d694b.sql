
CREATE POLICY "DJ inserts own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  dj_id IN (SELECT id FROM djs WHERE user_id = auth.uid())
);

CREATE POLICY "DJ updates own tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  dj_id IN (SELECT id FROM djs WHERE user_id = auth.uid())
);
