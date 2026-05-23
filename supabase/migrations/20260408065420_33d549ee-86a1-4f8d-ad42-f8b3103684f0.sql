CREATE POLICY "Public read bookings" ON public.bookings FOR SELECT TO anon USING (true);
CREATE POLICY "Public read producers" ON public.producers FOR SELECT TO anon USING (true);
CREATE POLICY "Public read financial" ON public.financial_records FOR SELECT TO anon USING (true);
CREATE POLICY "Public read djs" ON public.djs FOR SELECT TO anon USING (true);