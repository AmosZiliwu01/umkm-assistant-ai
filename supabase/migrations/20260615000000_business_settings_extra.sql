ALTER TABLE public.business_settings
  ADD COLUMN slug TEXT UNIQUE;

ALTER TABLE public.business_settings
  ADD COLUMN website_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.business_settings
  ADD COLUMN payment_methods JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.business_settings
  ADD COLUMN fulfillment_methods JSONB NOT NULL DEFAULT '{}'::jsonb;