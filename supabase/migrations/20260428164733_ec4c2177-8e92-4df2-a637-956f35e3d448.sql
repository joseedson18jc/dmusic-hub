-- Restringe inserts/updates/deletes em financial_records a admin e finance.
-- Antes, qualquer usuário autenticado (inclusive DJs read-only) podia inserir,
-- o que violava o RBAC. Edge functions que escrevem usam service_role e
-- continuam funcionando normalmente (service_role bypassa RLS).

-- 1. Remove a policy permissiva de INSERT
DROP POLICY IF EXISTS "Authenticated can insert financial_records" ON public.financial_records;

-- 2. INSERT: apenas admin/super_admin ou finance
CREATE POLICY "Admins and finance insert financial"
ON public.financial_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'finance'::app_role)
);

-- 3. UPDATE: apenas admin/super_admin ou finance
--    (já coberto pelas policies ALL existentes "Admins manage financial" e
--     "Finance manages financial", mas declaramos explicitamente para evitar
--     que futuros policies ALL mais frouxos sobrescrevam a intenção.)
CREATE POLICY "Admins and finance update financial"
ON public.financial_records
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'finance'::app_role)
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'finance'::app_role)
);

-- 4. DELETE: apenas admin/super_admin ou finance
CREATE POLICY "Admins and finance delete financial"
ON public.financial_records
FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'finance'::app_role)
);

-- 5. Garante que a policy de leitura por DJs continua estritamente read-only
--    (já existe "DJ reads own financial" — apenas reafirmamos por documentação).
COMMENT ON POLICY "DJ reads own financial" ON public.financial_records IS
  'DJs only read records linked to their own dj_id. Strictly read-only per RBAC.';