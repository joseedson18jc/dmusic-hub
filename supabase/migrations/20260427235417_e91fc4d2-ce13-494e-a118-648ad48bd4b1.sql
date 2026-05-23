
-- Add producer/dj/booking links to message history
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS producer_id uuid,
  ADD COLUMN IF NOT EXISTS dj_id uuid,
  ADD COLUMN IF NOT EXISTS booking_id uuid;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_producer ON public.whatsapp_messages(producer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_dj ON public.whatsapp_messages(dj_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_booking ON public.whatsapp_messages(booking_id, created_at DESC);

-- Queue table
CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  producer_id uuid,
  dj_id uuid,
  booking_id uuid,
  entity_type text,
  entity_id uuid,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  last_error text,
  next_retry_at timestamptz,
  message_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_queue_status_chk CHECK (status IN ('pending','processing','sent','failed','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_ready
  ON public.whatsapp_queue(status, scheduled_for)
  WHERE status IN ('pending');
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_producer ON public.whatsapp_queue(producer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_booking ON public.whatsapp_queue(booking_id);

ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage whatsapp queue" ON public.whatsapp_queue;
CREATE POLICY "Admins manage whatsapp queue"
  ON public.whatsapp_queue
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Finance reads whatsapp queue" ON public.whatsapp_queue;
CREATE POLICY "Finance reads whatsapp queue"
  ON public.whatsapp_queue
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'finance'::app_role));

DROP TRIGGER IF EXISTS update_whatsapp_queue_updated_at ON public.whatsapp_queue;
CREATE TRIGGER update_whatsapp_queue_updated_at
  BEFORE UPDATE ON public.whatsapp_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
