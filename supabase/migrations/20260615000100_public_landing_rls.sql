GRANT SELECT ON public.business_settings TO anon;

CREATE POLICY "Public read enabled business settings" ON public.business_settings
  FOR SELECT TO anon
  USING (website_enabled = true AND slug IS NOT NULL);

GRANT SELECT ON public.products TO anon;

CREATE POLICY "Public read products of enabled businesses" ON public.products
  FOR SELECT TO anon
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM public.business_settings bs
      WHERE bs.user_id = products.user_id
        AND bs.website_enabled = true
        AND bs.slug IS NOT NULL
    )
  );
