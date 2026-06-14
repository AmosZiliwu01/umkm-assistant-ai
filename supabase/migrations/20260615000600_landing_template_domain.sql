ALTER TABLE public.business_settings
  ADD COLUMN landing_template TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE public.business_settings
  ADD COLUMN custom_domain TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.protect_landing_addons()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.landing_template := OLD.landing_template;
    NEW.custom_domain := OLD.custom_domain;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_landing_addons_trigger
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_landing_addons();
