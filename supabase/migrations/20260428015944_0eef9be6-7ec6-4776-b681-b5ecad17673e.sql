-- Seed automation_rules with conservative defaults if missing.
-- Safe to re-run: only inserts when absent.
INSERT INTO public.system_settings (key, value, description)
SELECT
  'automation_rules',
  jsonb_build_object(
    'whatsapp_on_confirm', true,
    'whatsapp_payment_reminder_days', 3,
    'email_on_contract_sent', true,
    'google_calendar_auto_sync', true,
    'stripe_link_on_confirm', false
  ),
  'Flags globais que controlam quais automações o sistema pode disparar (WhatsApp, e-mail, Google Calendar, Stripe).'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'automation_rules');

-- Public read RPC so anon/edge functions (and any role) can check a flag
-- without exposing the full system_settings table. SECURITY DEFINER bypasses
-- the admin-only RLS on system_settings.
CREATE OR REPLACE FUNCTION public.get_automation_rules()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(value, '{}'::jsonb)
    FROM public.system_settings
   WHERE key = 'automation_rules'
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_automation_rules() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_automation_rules() TO anon, authenticated, service_role;

-- Convenience: ask for a single channel flag (default true if not set).
CREATE OR REPLACE FUNCTION public.is_automation_enabled(_channel text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (public.get_automation_rules() ->> _channel)::boolean,
    true
  )
$$;

REVOKE ALL ON FUNCTION public.is_automation_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_automation_enabled(text) TO anon, authenticated, service_role;