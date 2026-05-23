-- Tabela de tokens de assinatura e registros de assinatura
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  signer_name TEXT,
  signer_email TEXT,
  signer_role TEXT,
  signature_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract ON public.contract_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_token ON public.contract_signatures(token);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage signatures"
  ON public.contract_signatures FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Finance reads signatures"
  ON public.contract_signatures FOR SELECT
  USING (public.has_role(auth.uid(), 'finance'::app_role));

-- Trigger: when a contract becomes signed, create notification for the linked DJ
CREATE OR REPLACE FUNCTION public.notify_dj_on_contract_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dj_user_id UUID;
BEGIN
  IF NEW.status = 'assinado' AND (OLD.status IS DISTINCT FROM 'assinado') AND NEW.dj_id IS NOT NULL THEN
    SELECT user_id INTO v_dj_user_id FROM public.djs WHERE id = NEW.dj_id;
    IF v_dj_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, titulo, mensagem, tipo, entity_type, entity_id)
      VALUES (
        v_dj_user_id,
        'Contrato assinado',
        'O contrato "' || NEW.template_name || '" foi assinado pelo produtor.',
        'success',
        'contract',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dj_on_contract_signed ON public.contracts;
CREATE TRIGGER trg_notify_dj_on_contract_signed
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_dj_on_contract_signed();