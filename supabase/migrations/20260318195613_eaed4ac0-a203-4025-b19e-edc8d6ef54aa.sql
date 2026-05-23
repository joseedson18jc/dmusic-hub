
-- Fix overly permissive INSERT policies
DROP POLICY "System inserts audit" ON public.audit_logs;
CREATE POLICY "Authenticated inserts audit" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "System inserts notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
