import type { ComponentType } from "react";
import type { LandingData } from "@/lib/landing";
import { StandardLandingTemplate } from "@/components/landing-templates/standard";

export type LandingTemplateComponent = ComponentType<{ data: LandingData }>;

/**
 * Mapping dari nilai business_settings.landing_template ke komponen
 * yang dirender. "standard" adalah default untuk semua UMKM.
 *
 * Untuk klien yang minta layout custom (di luar template standar,
 * tapi tetap hosting di domain/slug platform ini):
 * 1. Buat komponen baru di folder ini, mis. `custom-kopi-merapi.tsx`,
 *    menerima props `{ data: LandingData }` (sama seperti standard).
 * 2. Import & daftarkan di sini dengan key sesuai nama yang akan
 *    diisi ke kolom landing_template untuk klien tersebut
 *    (mis. "custom_kopi_merapi").
 * 3. Set business_settings.landing_template = "custom_kopi_merapi"
 *    untuk baris klien tersebut (via Table Editor / Super Admin).
 *
 * Jika nilai landing_template tidak ditemukan di registry ini,
 * fallback otomatis ke "standard".
 */
export const landingTemplateRegistry: Record<string, LandingTemplateComponent> = {
  standard: StandardLandingTemplate,
  // custom_kopi_merapi: CustomKopiMerapiTemplate,
};

export function getLandingTemplate(name: string): LandingTemplateComponent {
  return landingTemplateRegistry[name] ?? StandardLandingTemplate;
}