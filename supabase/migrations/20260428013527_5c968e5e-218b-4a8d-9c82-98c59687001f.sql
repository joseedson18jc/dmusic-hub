-- Sync mode column
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS gcal_sync_mode text NOT NULL DEFAULT 'push';

-- Constrain to allowed values
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_gcal_sync_mode_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_gcal_sync_mode_check
  CHECK (gcal_sync_mode IN ('off', 'push', 'bidirectional'));

-- Backfill any NULL (defensive)
UPDATE public.bookings SET gcal_sync_mode = 'push' WHERE gcal_sync_mode IS NULL;