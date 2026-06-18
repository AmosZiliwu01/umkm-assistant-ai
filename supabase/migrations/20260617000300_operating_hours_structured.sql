ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS operating_hours_structured JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.business_settings.operating_hours_structured IS
  'Array of {label, open, close} rows, e.g. [{"label":"Senin–Jumat","open":"09:00","close":"21:00"}]. operating_hours (text) is kept in sync as a human-readable summary for the AI assistant.';
