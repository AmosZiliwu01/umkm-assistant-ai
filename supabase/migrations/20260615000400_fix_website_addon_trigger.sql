CREATE OR REPLACE FUNCTION public.protect_website_addon_enabled()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN

  IF current_user = 'authenticated' THEN
    NEW.website_addon_enabled := OLD.website_addon_enabled;
  END IF;

  RETURN NEW;
END;
$$;
