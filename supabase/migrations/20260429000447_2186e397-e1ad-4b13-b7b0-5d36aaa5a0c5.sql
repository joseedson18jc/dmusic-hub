-- Seed default UI theme setting if not present
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'ui_theme',
  '{"theme": "neon_syndicate"}'::jsonb,
  'Tema visual global da plataforma. Valores aceitos: neon_syndicate (default, bg #05050A) | dark_slate (alternativo, bg #08090d).'
)
ON CONFLICT (key) DO NOTHING;