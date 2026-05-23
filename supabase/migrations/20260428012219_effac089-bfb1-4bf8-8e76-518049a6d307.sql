
-- Triggers de auditoria nas 3 tabelas
DROP TRIGGER IF EXISTS audit_bookings ON public.bookings;
CREATE TRIGGER audit_bookings
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_contracts ON public.contracts;
CREATE TRIGGER audit_contracts
AFTER INSERT OR UPDATE OR DELETE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_financial_records ON public.financial_records;
CREATE TRIGGER audit_financial_records
AFTER INSERT OR UPDATE OR DELETE ON public.financial_records
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Index para acelerar consultas por entidade
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id, created_at DESC);
