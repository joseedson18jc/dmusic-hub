CREATE POLICY "Anon can insert bookings" ON public.bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can insert producers" ON public.producers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can insert financial_records" ON public.financial_records FOR INSERT TO anon, authenticated WITH CHECK (true);