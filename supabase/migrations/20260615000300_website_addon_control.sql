ALTER TABLE public.business_settings
  ADD COLUMN website_addon_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_website_addon_enabled()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- service_role (Super Admin / operasi manual) boleh mengubah bebas.
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Selain itu (Owner via authenticated), paksa nilai tetap seperti lama.
  NEW.website_addon_enabled := OLD.website_addon_enabled;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_website_addon_enabled_trigger
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_website_addon_enabled();
