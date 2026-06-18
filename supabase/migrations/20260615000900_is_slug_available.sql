CREATE OR REPLACE FUNCTION public.is_slug_available(check_slug TEXT, exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.business_settings
    WHERE slug = check_slug
      AND (exclude_user_id IS NULL OR user_id <> exclude_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_slug_available(TEXT, UUID) TO authenticated;
