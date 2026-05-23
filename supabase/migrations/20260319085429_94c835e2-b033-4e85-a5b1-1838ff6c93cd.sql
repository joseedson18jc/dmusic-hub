CREATE TABLE public.manager_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year_month text NOT NULL,
  meta_receita numeric NOT NULL DEFAULT 50000,
  meta_bookings integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month)
);

ALTER TABLE public.manager_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage goals" ON public.manager_goals FOR ALL TO public USING (is_admin(auth.uid()));
