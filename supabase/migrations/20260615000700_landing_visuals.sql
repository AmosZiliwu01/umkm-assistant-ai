ALTER TABLE public.business_settings
  ADD COLUMN cover_image_url TEXT,
  ADD COLUMN logo_url TEXT,
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;
