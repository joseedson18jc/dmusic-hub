ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS transporte text,
  ADD COLUMN IF NOT EXISTS alimentacao text,
  ADD COLUMN IF NOT EXISTS reembolso_uber numeric,
  ADD COLUMN IF NOT EXISTS data_pagamento date,
  ADD COLUMN IF NOT EXISTS responsavel_pagamento text,
  ADD COLUMN IF NOT EXISTS contato_responsavel_pagamento text;