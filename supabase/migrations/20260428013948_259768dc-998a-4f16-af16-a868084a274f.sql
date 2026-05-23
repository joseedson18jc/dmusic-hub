CREATE OR REPLACE FUNCTION public.sanitize_gcal_log_error()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF NEW.error_message IS NULL THEN
    RETURN NEW;
  END IF;
  v := NEW.error_message;

  -- Tokens / secrets
  v := regexp_replace(v, '(Bearer|Basic)\s+[A-Za-z0-9._\-+/=]+', '[REDACTED_TOKEN]', 'gi');
  v := regexp_replace(v, 'ya29\.[A-Za-z0-9._\-]+', '[REDACTED_GOOGLE_ACCESS_TOKEN]', 'g');
  v := regexp_replace(v, '1//0[A-Za-z0-9._\-]+', '[REDACTED_GOOGLE_REFRESH_TOKEN]', 'g');
  v := regexp_replace(v, 'eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+', '[REDACTED_JWT]', 'g');
  v := regexp_replace(v, 'sk_(live|test)_[A-Za-z0-9]+', '[REDACTED_STRIPE_KEY]', 'g');
  v := regexp_replace(v, '("?(access_token|refresh_token|id_token|client_secret|api[_-]?key|password|authorization)"?\s*[:=]\s*")[^"]+(")', '\1[REDACTED]\3', 'gi');
  v := regexp_replace(v, '\m(access_token|refresh_token|id_token|client_secret|api[_-]?key|password|authorization)=([^&\s"]+)', '\1=[REDACTED]', 'gi');

  -- Emails
  v := regexp_replace(v, '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[REDACTED_EMAIL]', 'g');

  -- URLs (keep host, drop path/query)
  v := regexp_replace(v, 'https?://([^\s/"]+)/?[^\s"]*', 'https://\1/[…]', 'gi');

  -- IPv4
  v := regexp_replace(v, '\m(\d{1,3}\.){3}\d{1,3}\M', '[REDACTED_IP]', 'g');

  -- Collapse whitespace, truncate
  v := regexp_replace(v, '\s+', ' ', 'g');
  v := btrim(v);
  IF length(v) > 500 THEN
    v := substr(v, 1, 500) || '…';
  END IF;

  NEW.error_message := v;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_gcal_log_error ON public.google_calendar_sync_logs;
CREATE TRIGGER trg_sanitize_gcal_log_error
  BEFORE INSERT OR UPDATE OF error_message ON public.google_calendar_sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_gcal_log_error();