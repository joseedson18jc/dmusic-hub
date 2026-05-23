-- Endurecimento de search_path: pg_catalog primeiro impede que objetos
-- criados em public sobrescrevam funções/tipos nativos do PostgreSQL.
-- Mantém compatibilidade com chamadas existentes (public continua resolvido).

-- Funções utilitárias / triggers genéricos
ALTER FUNCTION public.update_updated_at_column()        SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_updated_at()                  SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user()                 SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_audit_event()                 SET search_path = pg_catalog, public;
ALTER FUNCTION public.sanitize_gcal_log_error()         SET search_path = pg_catalog, public;

-- RBAC (mantém schema 'private' acessível)
ALTER FUNCTION public.has_role(uuid, app_role)          SET search_path = pg_catalog, public, private;
ALTER FUNCTION public.is_admin(uuid)                    SET search_path = pg_catalog, public, private;

-- Bookings
ALTER FUNCTION public.bookings_check_no_conflict()      SET search_path = pg_catalog, public;
ALTER FUNCTION public.bookings_validate_timezone()      SET search_path = pg_catalog, public;
ALTER FUNCTION public.supported_timezones()             SET search_path = pg_catalog, public;

-- Contratos / templates
ALTER FUNCTION public.notify_dj_on_contract_signed()    SET search_path = pg_catalog, public;
ALTER FUNCTION public.validate_contract_templates(jsonb) SET search_path = pg_catalog, public;
ALTER FUNCTION public.system_settings_validate()        SET search_path = pg_catalog, public;
ALTER FUNCTION public.upsert_contract_template(text, text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.contract_register_send(uuid, integer)      SET search_path = pg_catalog, public;

-- Automações
ALTER FUNCTION public.get_automation_rules()            SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_automation_enabled(text)       SET search_path = pg_catalog, public;