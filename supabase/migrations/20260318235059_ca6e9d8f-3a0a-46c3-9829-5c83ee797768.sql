
-- Contract status enum
CREATE TYPE public.contract_status AS ENUM ('rascunho', 'enviado', 'assinado', 'cancelado', 'expirado');

-- Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  dj_id UUID REFERENCES public.djs(id) ON DELETE SET NULL,
  producer_id UUID REFERENCES public.producers(id) ON DELETE SET NULL,
  template_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  status contract_status NOT NULL DEFAULT 'rascunho',
  version INTEGER NOT NULL DEFAULT 1,
  form_data JSONB NOT NULL DEFAULT '{}',
  html_content TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contract history / audit trail
CREATE TABLE public.contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  old_status contract_status,
  new_status contract_status,
  version INTEGER,
  details JSONB,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contracts" ON public.contracts FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Finance reads contracts" ON public.contracts FOR SELECT USING (has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Admins manage contract history" ON public.contract_history FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Finance reads contract history" ON public.contract_history FOR SELECT USING (has_role(auth.uid(), 'finance'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
