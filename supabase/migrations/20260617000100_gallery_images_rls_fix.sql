ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_images TO authenticated;
GRANT ALL ON public.gallery_images TO service_role;

DROP POLICY IF EXISTS "Owner can view own gallery images" ON public.gallery_images;
CREATE POLICY "Owner can view own gallery images"
  ON public.gallery_images FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can insert own gallery images" ON public.gallery_images;
CREATE POLICY "Owner can insert own gallery images"
  ON public.gallery_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can update own gallery images" ON public.gallery_images;
CREATE POLICY "Owner can update own gallery images"
  ON public.gallery_images FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can delete own gallery images" ON public.gallery_images;
CREATE POLICY "Owner can delete own gallery images"
  ON public.gallery_images FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view gallery of enabled websites" ON public.gallery_images;
CREATE POLICY "Public can view gallery of enabled websites"
  ON public.gallery_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_settings bs
      WHERE bs.user_id = gallery_images.user_id
        AND bs.website_enabled = true
    )
  );
