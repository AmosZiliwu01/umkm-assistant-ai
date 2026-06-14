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

export interface LandingBusiness {
  user_id: string;
  business_name: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  operating_hours: string | null;
  website: string | null;
  social_media: { instagram?: string; facebook?: string; tiktok?: string } | null;
  landing_template: string;
}

export interface LandingData {
  business: LandingBusiness;
  products: LandingProduct[];
}

const BUSINESS_SELECT =
  "user_id, business_name, description, address, phone, operating_hours, website, social_media, landing_template";

export async function fetchLandingDataBySlug(slug: string): Promise<LandingData> {
  const { data: business, error } = await supabase
    .from("business_settings")
    .select(BUSINESS_SELECT)
    .eq("slug", slug)
    .eq("website_enabled", true)
    .maybeSingle();

  if (error || !business) throw notFound();

  return loadProducts(business as LandingBusiness);
}

export async function fetchLandingDataByDomain(domain: string): Promise<LandingData> {
  const { data: business, error } = await supabase
    .from("business_settings")
    .select(BUSINESS_SELECT)
    .eq("custom_domain", domain)
    .eq("website_enabled", true)
    .maybeSingle();

  if (error || !business) throw notFound();

  return loadProducts(business as LandingBusiness);
}

async function loadProducts(business: LandingBusiness): Promise<LandingData> {
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, price, category, image_url")
    .eq("user_id", business.user_id)
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  return { business, products: (products ?? []) as LandingProduct[] };
}