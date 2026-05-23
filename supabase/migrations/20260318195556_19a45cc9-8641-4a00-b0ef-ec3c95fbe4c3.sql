
-- ==============================================
-- D.MUSIC Manager — Etapa 1: Schema Fundação
-- ==============================================

-- Enum: papéis de usuário
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'finance', 'dj');

-- Enum: papéis comerciais do produtor
CREATE TYPE public.producer_commercial_role AS ENUM (
  'contratante', 'intermediador', 'promoter', 'agencia',
  'parceiro_estrategico', 'produtor_executivo', 'responsavel_financeiro'
);

-- Enum: status do booking
CREATE TYPE public.booking_status AS ENUM (
  'novo_lead', 'qualificado', 'briefing_recebido', 'proposta_enviada',
  'negociacao', 'aguardando_aprovacao', 'contrato_enviado',
  'assinatura_pendente', 'sinal_pendente', 'confirmado',
  'planejamento', 'pronto_para_evento', 'evento_realizado',
  'pagamento_final_pendente', 'repasse_pendente',
  'fechado_ganho', 'fechado_perdido'
);

-- Enum: status de pagamento
CREATE TYPE public.payment_status AS ENUM (
  'pendente', 'parcial', 'pago', 'vencido',
  'cancelado', 'em_disputa', 'reembolsado', 'falhou'
);

-- Enum: tipo de registro financeiro
CREATE TYPE public.financial_type AS ENUM (
  'receita', 'despesa', 'sinal', 'pagamento_final', 'parcela',
  'repasse_dj', 'repasse_produtor', 'comissao', 'imposto',
  'reembolso', 'cancelamento', 'multa', 'chargeback', 'ajuste'
);

-- Enum: prioridade de tarefa
CREATE TYPE public.task_priority AS ENUM ('baixa', 'media', 'alta');

-- Enum: status de tarefa
CREATE TYPE public.task_status AS ENUM (
  'a_fazer', 'em_andamento', 'aguardando_terceiro',
  'concluida', 'atrasada', 'cancelada'
);

-- Enum: tipo de contato do produtor
CREATE TYPE public.contact_role AS ENUM (
  'financeiro', 'operacional', 'booking', 'juridico', 'assistente', 'socio'
);

-- Enum: status do DJ
CREATE TYPE public.dj_status AS ENUM ('ativo', 'pausa', 'indisponivel');

-- ==============================================
-- Função de updated_at
-- ==============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================
-- Tabela: profiles
-- ==============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- Tabela: user_roles (RBAC)
-- ==============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para checar papel
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para checar se é admin (super_admin ou admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- ==============================================
-- Tabela: djs
-- ==============================================
CREATE TABLE public.djs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome_artistico TEXT NOT NULL,
  nome_civil TEXT,
  foto_url TEXT,
  data_nascimento DATE,
  documento TEXT,
  telefone TEXT,
  email TEXT,
  whatsapp TEXT,
  endereco TEXT,
  cidade TEXT,
  pais TEXT DEFAULT 'Brasil',
  idiomas TEXT[],
  mini_bio TEXT,
  bio_completa TEXT,
  generos_musicais TEXT[],
  estilo_performance TEXT,
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  spotify TEXT,
  soundcloud TEXT,
  press_kit_url TEXT,
  rider_tecnico_url TEXT,
  rider_hospitalidade_url TEXT,
  equipamentos_proprios TEXT,
  equipamentos_necessarios TEXT,
  restricoes TEXT,
  preferencias_viagem TEXT,
  valor_cache_padrao NUMERIC(12,2) DEFAULT 0,
  valor_minimo NUMERIC(12,2) DEFAULT 0,
  comissao_gestao NUMERIC(5,2) DEFAULT 15,
  dados_bancarios JSONB,
  pix TEXT,
  status dj_status NOT NULL DEFAULT 'ativo',
  score_confiabilidade NUMERIC(3,1) DEFAULT 5.0,
  notas_internas TEXT,
  observacoes_estrategicas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_djs_status ON public.djs(status);
CREATE INDEX idx_djs_user_id ON public.djs(user_id);
CREATE TRIGGER update_djs_updated_at BEFORE UPDATE ON public.djs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- Tabela: producers (produtores)
-- ==============================================
CREATE TABLE public.producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  empresa TEXT,
  tipo_produtor TEXT,
  papeis_comerciais producer_commercial_role[] DEFAULT '{}',
  contato_principal TEXT,
  telefone TEXT,
  email TEXT,
  whatsapp TEXT,
  instagram TEXT,
  site TEXT,
  cidade TEXT,
  pais TEXT DEFAULT 'Brasil',
  idiomas TEXT[],
  tags TEXT[],
  origem_relacionamento TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status_relacionamento TEXT DEFAULT 'ativo',
  score_confiabilidade NUMERIC(3,1) DEFAULT 5.0,
  condicoes_comerciais TEXT,
  forma_pagamento TEXT,
  dados_fiscais JSONB,
  dados_bancarios JSONB,
  stripe_customer_id TEXT,
  notas_internas TEXT,
  score_saude NUMERIC(3,1) DEFAULT 5.0,
  ultimo_contato TIMESTAMPTZ,
  proxima_acao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_producers_owner ON public.producers(owner_id);
CREATE INDEX idx_producers_status ON public.producers(status_relacionamento);
CREATE TRIGGER update_producers_updated_at BEFORE UPDATE ON public.producers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- Tabela: producer_contacts
-- ==============================================
CREATE TABLE public.producer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  papel contact_role NOT NULL,
  telefone TEXT,
  email TEXT,
  whatsapp TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.producer_contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_producer_contacts_producer ON public.producer_contacts(producer_id);

-- ==============================================
-- Tabela: bookings
-- ==============================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE RESTRICT,
  dj_id UUID REFERENCES public.djs(id) ON DELETE SET NULL,
  status booking_status NOT NULL DEFAULT 'novo_lead',
  evento_nome TEXT,
  evento_tipo TEXT,
  venue TEXT,
  cidade TEXT,
  pais TEXT DEFAULT 'Brasil',
  data_evento DATE,
  hora_inicio TIME,
  hora_fim TIME,
  fuso_horario TEXT DEFAULT 'America/Sao_Paulo',
  fee_acordado NUMERIC(12,2),
  comissao NUMERIC(5,2),
  custo_total NUMERIC(12,2),
  valor_liquido NUMERIC(12,2),
  status_pagamento payment_status DEFAULT 'pendente',
  sinal NUMERIC(12,2),
  saldo NUMERIC(12,2),
  logistica JSONB,
  briefing_musical TEXT,
  contatos_local TEXT,
  notas_internas TEXT,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  proximo_passo TEXT,
  prioridade_comercial TEXT DEFAULT 'media',
  motivo_perda TEXT,
  probabilidade_fechamento NUMERIC(3,0) DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_producer ON public.bookings(producer_id);
CREATE INDEX idx_bookings_dj ON public.bookings(dj_id);
CREATE INDEX idx_bookings_data ON public.bookings(data_evento);
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- Tabela: financial_records
-- ==============================================
CREATE TABLE public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo financial_type NOT NULL,
  categoria TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  dj_id UUID REFERENCES public.djs(id) ON DELETE SET NULL,
  producer_id UUID REFERENCES public.producers(id) ON DELETE SET NULL,
  descricao TEXT,
  valor_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(12,2),
  comissao NUMERIC(12,2),
  moeda TEXT DEFAULT 'BRL',
  data_vencimento DATE,
  data_pagamento DATE,
  status payment_status NOT NULL DEFAULT 'pendente',
  metodo_pagamento TEXT,
  comprovante_url TEXT,
  notas TEXT,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  centro_custo TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  payment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_financial_status ON public.financial_records(status);
CREATE INDEX idx_financial_vencimento ON public.financial_records(data_vencimento);
CREATE INDEX idx_financial_booking ON public.financial_records(booking_id);
CREATE TRIGGER update_financial_updated_at BEFORE UPDATE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- Tabela: tasks
-- ==============================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  dj_id UUID REFERENCES public.djs(id) ON DELETE SET NULL,
  producer_id UUID REFERENCES public.producers(id) ON DELETE SET NULL,
  prioridade task_priority NOT NULL DEFAULT 'media',
  status task_status NOT NULL DEFAULT 'a_fazer',
  prazo TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_responsavel ON public.tasks(responsavel_id);
CREATE INDEX idx_tasks_prazo ON public.tasks(prazo);
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- Tabela: audit_logs
-- ==============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ==============================================
-- Tabela: notifications
-- ==============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  tipo TEXT DEFAULT 'info',
  lida BOOLEAN DEFAULT FALSE,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_lida ON public.notifications(user_id, lida);

-- ==============================================
-- Trigger: auto-create profile on signup
-- ==============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- RLS Policies
-- ==============================================

-- profiles
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin(auth.uid()));

-- djs
CREATE POLICY "Admins manage DJs" ON public.djs
  FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "DJ reads own" ON public.djs
  FOR SELECT USING (user_id = auth.uid());

-- producers
CREATE POLICY "Admins manage producers" ON public.producers
  FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Finance reads producers" ON public.producers
  FOR SELECT USING (public.has_role(auth.uid(), 'finance'));

-- producer_contacts
CREATE POLICY "Admins manage producer contacts" ON public.producer_contacts
  FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Finance reads producer contacts" ON public.producer_contacts
  FOR SELECT USING (public.has_role(auth.uid(), 'finance'));

-- bookings
CREATE POLICY "Admins manage bookings" ON public.bookings
  FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "DJ reads own bookings" ON public.bookings
  FOR SELECT USING (
    dj_id IN (SELECT id FROM public.djs WHERE user_id = auth.uid())
  );
CREATE POLICY "Finance reads bookings" ON public.bookings
  FOR SELECT USING (public.has_role(auth.uid(), 'finance'));

-- financial_records
CREATE POLICY "Admins manage financial" ON public.financial_records
  FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Finance manages financial" ON public.financial_records
  FOR ALL USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "DJ reads own financial" ON public.financial_records
  FOR SELECT USING (
    dj_id IN (SELECT id FROM public.djs WHERE user_id = auth.uid())
  );

-- tasks
CREATE POLICY "Admins manage tasks" ON public.tasks
  FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Assigned reads tasks" ON public.tasks
  FOR SELECT USING (responsavel_id = auth.uid());
CREATE POLICY "Finance reads tasks" ON public.tasks
  FOR SELECT USING (public.has_role(auth.uid(), 'finance'));

-- audit_logs
CREATE POLICY "Admins read audit" ON public.audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "System inserts audit" ON public.audit_logs
  FOR INSERT WITH CHECK (TRUE);

-- notifications
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT WITH CHECK (TRUE);

-- ==============================================
-- Storage buckets
-- ==============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('dj-assets', 'dj-assets', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('producer-docs', 'producer-docs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('private-files', 'private-files', false);

-- Storage policies
CREATE POLICY "Admins access all storage" ON storage.objects
  FOR ALL USING (public.is_admin(auth.uid()));
