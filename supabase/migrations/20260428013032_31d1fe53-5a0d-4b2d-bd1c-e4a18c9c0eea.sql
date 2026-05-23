-- Queue table for Google Calendar sync retries
CREATE TABLE IF NOT EXISTS public.gcal_sync_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  booking_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed','cancelled')),
  last_error TEXT,
  last_http_status INTEGER,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcal_queue_ready
  ON public.gcal_sync_queue (next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_gcal_queue_user_status
  ON public.gcal_sync_queue (target_user_id, status);

CREATE INDEX IF NOT EXISTS idx_gcal_queue_booking
  ON public.gcal_sync_queue (booking_id);

ALTER TABLE public.gcal_sync_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can read / manage the queue (service_role bypasses RLS for the worker)
CREATE POLICY "Admins manage gcal queue"
  ON public.gcal_sync_queue
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- DJs/users can read items concerning their own calendar (visibility for debugging)
CREATE POLICY "Users read own gcal queue"
  ON public.gcal_sync_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id OR auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER trg_gcal_sync_queue_updated_at
  BEFORE UPDATE ON public.gcal_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();