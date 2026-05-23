-- Generic audit logger
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_old jsonb;
  v_new jsonb;
  v_diff_old jsonb := '{}'::jsonb;
  v_diff_new jsonb := '{}'::jsonb;
  v_entity_id uuid;
  v_user_id uuid := auth.uid();
  v_key text;
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
    -- Only changed fields (excluding noisy timestamps)
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key NOT IN ('updated_at', 'created_at')
         AND COALESCE(v_old -> v_key, 'null'::jsonb) IS DISTINCT FROM COALESCE(v_new -> v_key, 'null'::jsonb) THEN
        v_diff_old := v_diff_old || jsonb_build_object(v_key, v_old -> v_key);
        v_diff_new := v_diff_new || jsonb_build_object(v_key, v_new -> v_key);
      END IF;
    END LOOP;
    -- Skip log if nothing meaningful changed
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
$$;

-- Attach to bookings
DROP TRIGGER IF EXISTS trg_audit_bookings ON public.bookings;
CREATE TRIGGER trg_audit_bookings
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Attach to contracts
DROP TRIGGER IF EXISTS trg_audit_contracts ON public.contracts;
CREATE TRIGGER trg_audit_contracts
AFTER INSERT OR UPDATE OR DELETE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Attach to financial_records (covers repasses + status financeiro changes)
DROP TRIGGER IF EXISTS trg_audit_financial ON public.financial_records;
CREATE TRIGGER trg_audit_financial
AFTER INSERT OR UPDATE OR DELETE ON public.financial_records
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Index for fast lookup by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);