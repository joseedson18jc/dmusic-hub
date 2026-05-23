-- Revoga EXECUTE de PUBLIC/anon/authenticated em funções SECURITY DEFINER
-- que NÃO devem ser chamadas diretamente pelo cliente.
-- Triggers e processos com service_role continuam funcionando normalmente.

-- 1) Funções estritamente internas (triggers + uso server-side / SQL inline):
REVOKE ALL ON FUNCTION public.get_automation_rules() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_automation_enabled(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_dj_on_contract_signed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;

-- 2) Funções administrativas usadas pelo UI por admins.
--    Mantemos EXECUTE para `authenticated` (a função valida is_admin internamente
--    e lança 42501 quando não autorizada). Revogamos de PUBLIC e anon.
REVOKE ALL ON FUNCTION public.contract_register_send(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_contract_template(text, text, text) FROM PUBLIC, anon;

-- Garante que `authenticated` continua tendo EXECUTE nessas duas (idempotente)
GRANT EXECUTE ON FUNCTION public.contract_register_send(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_contract_template(text, text, text) TO authenticated;

-- service_role já tem acesso por padrão; reforçamos para clareza
GRANT EXECUTE ON FUNCTION public.get_automation_rules() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_automation_enabled(text) TO service_role;