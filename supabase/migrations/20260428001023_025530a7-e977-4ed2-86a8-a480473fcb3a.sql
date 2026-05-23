create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

create policy "Admins can view system settings"
on public.system_settings for select
to authenticated
using (public.has_role(auth.uid(), 'super_admin'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can insert system settings"
on public.system_settings for insert
to authenticated
with check (public.has_role(auth.uid(), 'super_admin'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update system settings"
on public.system_settings for update
to authenticated
using (public.has_role(auth.uid(), 'super_admin'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete system settings"
on public.system_settings for delete
to authenticated
using (public.has_role(auth.uid(), 'super_admin'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

insert into public.system_settings (key, value, description) values
  ('event_types', '["Festival","Club Night","Corporate","Casamento","Open Bar","Privado"]'::jsonb, 'Tipos de evento disponíveis em bookings'),
  ('financial_categories', '{"receita":["Cachê","Comissão","Patrocínio","Outros"],"despesa":["Transporte","Hospedagem","Equipamento","Marketing","Imposto","Outros"]}'::jsonb, 'Categorias financeiras de receita e despesa'),
  ('commission_rules', '{"default_pct":15,"min_pct":5,"max_pct":30}'::jsonb, 'Regras padrão de comissão da gestão')
on conflict (key) do nothing;