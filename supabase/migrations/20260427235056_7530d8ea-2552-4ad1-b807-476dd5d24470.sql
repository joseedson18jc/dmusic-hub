CREATE TABLE IF NOT EXISTS public.google_calendar_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  booking_id uuid,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  google_event_id text,
  timezone text,
  http_status int,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read gcal sync logs"
ON public.google_calendar_sync_logs
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "DJ reads own gcal sync logs"
ON public.google_calendar_sync_logs
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_gcal_sync_logs_booking ON public.google_calendar_sync_logs(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gcal_sync_logs_user ON public.google_calendar_sync_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gcal_sync_logs_failed ON public.google_calendar_sync_logs(created_at DESC) WHERE success = false;