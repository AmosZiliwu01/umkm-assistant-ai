CREATE TABLE public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gallery_images_user_id ON public.gallery_images(user_id);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Owner: kelola foto galeri miliknya sendiri
CREATE POLICY "Owner can view own gallery images"
  ON public.gallery_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own gallery images"
  ON public.gallery_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own gallery images"
  ON public.gallery_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can delete own gallery images"
  ON public.gallery_images FOR DELETE
  USING (auth.uid() = user_id);

-- Public (anon): boleh lihat foto galeri milik UMKM yang website_enabled
CREATE POLICY "Public can view gallery of enabled websites"
  ON public.gallery_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_settings bs
      WHERE bs.user_id = gallery_images.user_id
        AND bs.website_enabled = true
    )
  );