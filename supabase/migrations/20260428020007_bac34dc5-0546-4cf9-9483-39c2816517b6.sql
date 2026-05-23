REVOKE EXECUTE ON FUNCTION public.get_automation_rules() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_automation_enabled(text) FROM anon, authenticated;
-- service_role keeps execute for edge functions
GRANT EXECUTE ON FUNCTION public.get_automation_rules() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_automation_enabled(text) TO service_role;