CREATE POLICY "DJ updates own bookings" ON public.bookings
FOR UPDATE TO authenticated
USING (dj_id IN (SELECT djs.id FROM djs WHERE djs.user_id = auth.uid()))
WITH CHECK (dj_id IN (SELECT djs.id FROM djs WHERE djs.user_id = auth.uid()));