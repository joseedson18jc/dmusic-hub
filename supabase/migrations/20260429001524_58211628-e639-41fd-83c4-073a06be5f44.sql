-- Expand automation_rules with per-channel/per-event flags.
-- Strategy: only set keys that DO NOT already exist, so admin choices are preserved.

DO $$
DECLARE
  v_current jsonb;
  v_defaults jsonb := jsonb_build_object(
    -- ── WhatsApp ─────────────────────────────────────
    'whatsapp_on_confirm',                  true,
    'whatsapp_on_contract_signed',          true,
    'whatsapp_payment_reminder_days',       3,
    'whatsapp_on_event_day',                true,
    'whatsapp_on_payment_received',         true,

    -- ── Email ────────────────────────────────────────
    'email_on_contract_sent',               true,
    'email_on_contract_signed',             true,
    'email_on_booking_confirmed',           true,
    'email_on_invoice_issued',              true,
    'email_on_payment_received',            true,

    -- ── Google Calendar ──────────────────────────────
    'google_calendar_auto_sync',            true,
    'google_calendar_sync_on_update',       true,
    'google_calendar_delete_on_cancel',     true,

    -- ── Stripe ───────────────────────────────────────
    'stripe_link_on_confirm',               false,
    'stripe_invoice_on_event_done',         false,
    'stripe_auto_charge_deposit',           false
  );
  v_merged jsonb;
BEGIN
  SELECT value INTO v_current FROM public.system_settings WHERE key = 'automation_rules';

  IF v_current IS NULL THEN
    -- Row missing: insert full defaults
    INSERT INTO public.system_settings (key, value, description)
    VALUES (
      'automation_rules',
      v_defaults,
      'Gatilhos automáticos por canal e evento (WhatsApp, Email, Google Calendar, Stripe)'
    );
  ELSE
    -- Row exists: only fill in keys that are missing (preserve admin overrides)
    v_merged := v_defaults || v_current;
    UPDATE public.system_settings
       SET value = v_merged,
           description = COALESCE(description, 'Gatilhos automáticos por canal e evento (WhatsApp, Email, Google Calendar, Stripe)'),
           updated_at = now()
     WHERE key = 'automation_rules';
  END IF;
END $$;