
-- Table for Google Calendar OAuth tokens
CREATE TABLE public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamp with time zone NOT NULL,
  calendar_id text DEFAULT 'primary',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens" ON public.google_calendar_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all tokens" ON public.google_calendar_tokens
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Table for WhatsApp message logs
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  variables jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  twilio_sid text,
  entity_type text,
  entity_id uuid,
  sent_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp messages" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Finance reads whatsapp messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'finance'::app_role));

-- Add whatsapp_opt_in to producers and djs
ALTER TABLE public.producers ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false;
ALTER TABLE public.djs ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false;

-- Add google_calendar_event_id to bookings for sync tracking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS google_calendar_event_id text;
