-- Refine audit log function to ignore non-business / noisy fields
CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action text;
  v_old jsonb;
  v_new jsonb;
  v_diff_old jsonb := '{}'::jsonb;
  v_diff_new jsonb := '{}'::jsonb;
  v_entity_id uuid;
  v_user_id uuid := auth.uid();
  v_key text;
  -- Fields that should NEVER trigger an audit entry on their own
  -- (timestamps, external sync ids, auto-generated file urls, internal sync metadata)
  v_ignored_keys text[] := ARRAY[
    'updated_at',
    'created_at',
    'google_calendar_event_id',
    'stripe_payment_intent_id',
    'stripe_invoice_id',
    'payment_url',
    'file_url',
    'file_path',
    'html_content',
    'version'
  ];
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_entity_id := (NEW).id;
    v_diff_new := v_new;

  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_entity_id := (NEW).id;

    -- Only changed BUSINESS fields (excluding noisy/system fields)
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF NOT (v_key = ANY(v_ignored_keys))
         AND COALESCE(v_old -> v_key, 'null'::jsonb) IS DISTINCT FROM COALESCE(v_new -> v_key, 'null'::jsonb) THEN
        v_diff_old := v_diff_old || jsonb_build_object(v_key, v_old -> v_key);
        v_diff_new := v_diff_new || jsonb_build_object(v_key, v_new -> v_key);
      END IF;
    END LOOP;

    -- Skip log if no business field changed
    IF v_diff_new = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_entity_id := (OLD).id;
    v_diff_old := v_old;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    jsonb_build_object(
      'op', TG_OP,
      'before', v_diff_old,
      'after', v_diff_new,
      'ts', now()
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Audit must never block business operations
  RAISE WARNING 'audit log failed for % on %: %', TG_OP, TG_TABLE_NAME, SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$function$;