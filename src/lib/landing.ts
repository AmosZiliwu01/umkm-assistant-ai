import { notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export interface LandingProduct {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  image_url: string | null;
}

export interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
}

export interface OperatingHoursRow {
  label: string;
  open: string;
  close: string;
}

export interface LandingBusiness {
  user_id: string;
  business_name: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  operating_hours: string | null;
  operating_hours_structured: OperatingHoursRow[];
  website: string | null;
  social_media: { instagram?: string; facebook?: string; tiktok?: string } | null;
  landing_template: string;
  cover_image_url: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  theme_color: string;
  promo_text: string | null;
}

export interface LandingData {
  business: LandingBusiness;
  products: LandingProduct[];
  gallery: GalleryImage[];
}

const BUSINESS_SELECT =
  "user_id, business_name, description, address, phone, operating_hours, operating_hours_structured, website, social_media, landing_template, cover_image_url, logo_url, latitude, longitude, theme_color, promo_text";

/**
 * Fetch landing page data for a UMKM identified by its public slug.
 * Throws notFound() if the business doesn't exist or hasn't enabled
 * its public landing page (website_enabled = true required by RLS).
 */
export async function fetchLandingDataBySlug(slug: string): Promise<LandingData> {
  const business = await fetchWithRetry(() =>
    supabase
      .from("business_settings")
      .select(BUSINESS_SELECT)
      .eq("slug", slug)
      .eq("website_enabled", true)
      .maybeSingle(),
  );

  if (!business) throw notFound();

  return loadProducts(business as LandingBusiness);
}

/**
 * Fetch landing page data for a UMKM identified by a custom domain
 * mapped to its business_settings row. Used by the future
 * custom-domain routing handler.
 */
export async function fetchLandingDataByDomain(domain: string): Promise<LandingData> {
  const business = await fetchWithRetry(() =>
    supabase
      .from("business_settings")
      .select(BUSINESS_SELECT)
      .eq("custom_domain", domain)
      .eq("website_enabled", true)
      .maybeSingle(),
  );

  if (!business) throw notFound();

  return loadProducts(business as LandingBusiness);
}

async function loadProducts(business: LandingBusiness): Promise<LandingData> {
  const [productsResult, galleryResult] = await Promise.all([
    fetchWithRetry(() =>
      supabase
        .from("products")
        .select("id, name, description, price, category, image_url")
        .eq("user_id", business.user_id)
        .eq("is_available", true)
        .order("created_at", { ascending: false }),
    ),
    fetchWithRetry(() =>
      supabase
        .from("gallery_images")
        .select("id, image_url, caption")
        .eq("user_id", business.user_id)
        .order("sort_order", { ascending: true }),
    ),
  ]);

  return {
    business,
    products: (productsResult ?? []) as LandingProduct[],
    gallery: (galleryResult ?? []) as GalleryImage[],
  };
}

/**
 * Supabase queries can transiently fail right after a hard page
 * refresh (anon session not fully warmed up yet, brief network
 * hiccup). Previously a failed query silently fell back to an
 * empty array, making sections like the gallery flicker in and
 * out between refreshes. This retries once before giving up, and
 * logs failures instead of swallowing them.
 */
async function fetchWithRetry<T>(
  run: () => PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await run();
    if (!error) return data;
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`Landing data query failed (attempt ${attempt + 1}/2):`, message);
    if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}