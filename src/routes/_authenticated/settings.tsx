import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LocationPicker } from "@/components/location-picker";
import { THEME_COLORS } from "@/lib/landing-themes";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Pengaturan Bisnis — UMKM AI" }] }),
  component: SettingsPage,
});

const Schema = z.object({
  business_name: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  operating_hours: z.string().trim().max(200).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  instagram: z.string().trim().max(200).optional().or(z.literal("")),
  facebook: z.string().trim().max(200).optional().or(z.literal("")),
  tiktok: z.string().trim().max(200).optional().or(z.literal("")),
  // Pembayaran
  qris: z.boolean(),
  bank_transfer: z.boolean(),
  bank_account: z.string().trim().max(200).optional().or(z.literal("")),
  cod: z.boolean(),
  // Pengambilan
  delivery: z.boolean(),
  delivery_note: z.string().trim().max(400).optional().or(z.literal("")),
  pickup: z.boolean(),
  pickup_note: z.string().trim().max(400).optional().or(z.literal("")),
  // Website
  website_enabled: z.boolean(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]*$/, "Hanya huruf kecil, angka, dan tanda hubung (-)").max(60).optional().or(z.literal("")),
  latitude: z.string().trim().optional().or(z.literal("")),
  longitude: z.string().trim().optional().or(z.literal("")),
  location_label: z.string().trim().max(300).optional().or(z.literal("")),
  theme_color: z.string(),
  promo_text: z.string().trim().max(200).optional().or(z.literal("")),
}).refine((v) => !v.latitude || !isNaN(Number(v.latitude)), { message: "Latitude harus berupa angka", path: ["latitude"] })
  .refine((v) => !v.longitude || !isNaN(Number(v.longitude)), { message: "Longitude harus berupa angka", path: ["longitude"] });
type FormVals = z.infer<typeof Schema>;

const DEFAULT_VALS: FormVals = {
  business_name: "", description: "", address: "", phone: "",
  operating_hours: "", website: "", instagram: "", facebook: "", tiktok: "",
  qris: false, bank_transfer: false, bank_account: "", cod: false,
  delivery: false, delivery_note: "", pickup: false, pickup_note: "",
  website_enabled: false, slug: "", latitude: "", longitude: "", location_label: "",
  theme_color: "green", promo_text: "",
};

interface OperatingHoursRow {
  id: string;
  label: string;
  open: string;
  close: string;
}

function makeHoursRow(label = "", open = "09:00", close = "21:00"): OperatingHoursRow {
  return { id: Math.random().toString(36).slice(2, 9), label, open, close };
}

/** Build the human-readable summary string used by the AI assistant and as a fallback display. */
function summarizeHours(rows: OperatingHoursRow[]): string {
  return rows
    .filter((r) => r.label.trim())
    .map((r) => `${r.label.trim()} ${r.open}–${r.close} WIB`)
    .join(", ");
}

function SettingsPage() {
  const { user } = useAuth();
  const [vals, setVals] = useState<FormVals>(DEFAULT_VALS);
  const [hoursRows, setHoursRows] = useState<OperatingHoursRow[]>([]);
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [websiteAddonEnabled, setWebsiteAddonEnabled] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "own">("idle");
  const slugCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("business_settings").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const sm = (data.social_media ?? {}) as Record<string, string>;
        const pm = (data.payment_methods ?? {}) as Record<string, unknown>;
        const fm = (data.fulfillment_methods ?? {}) as Record<string, unknown>;
        setVals({
          business_name: data.business_name ?? "",
          description: data.description ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          operating_hours: data.operating_hours ?? "",
          website: data.website ?? "",
          instagram: sm.instagram ?? "",
          facebook: sm.facebook ?? "",
          tiktok: sm.tiktok ?? "",
          qris: Boolean(pm.qris),
          bank_transfer: Boolean(pm.bank_transfer),
          bank_account: typeof pm.bank_account === "string" ? pm.bank_account : "",
          cod: Boolean(pm.cod),
          delivery: Boolean(fm.delivery),
          delivery_note: typeof fm.delivery_note === "string" ? fm.delivery_note : "",
          pickup: Boolean(fm.pickup),
          pickup_note: typeof fm.pickup_note === "string" ? fm.pickup_note : "",
          website_enabled: Boolean(data.website_enabled),
          slug: data.slug ?? "",
          latitude: data.latitude !== null && data.latitude !== undefined ? String(data.latitude) : "",
          longitude: data.longitude !== null && data.longitude !== undefined ? String(data.longitude) : "",
          location_label: data.location_label ?? "",
          theme_color: data.theme_color || "green",
          promo_text: data.promo_text ?? "",
        });
        const structuredRaw = data.operating_hours_structured as unknown;
        const parsedRows = Array.isArray(structuredRaw)
          ? (structuredRaw as Array<{ label?: string; open?: string; close?: string }>).map((r) =>
              makeHoursRow(r.label ?? "", r.open ?? "09:00", r.close ?? "21:00"),
            )
          : [];
        setHoursRows(parsedRows.length > 0 ? parsedRows : [makeHoursRow()]);
        setQrisImageUrl(typeof pm.qris_image_url === "string" ? pm.qris_image_url : null);
        setWebsiteAddonEnabled(Boolean(data.website_addon_enabled));
        setLogoUrl(data.logo_url ?? null);
        setCoverUrl(data.cover_image_url ?? null);
        if (data.slug) {
          setSlugStatus("own");
          initialSlugRef.current = data.slug;
        }
      });
  }, [user]);

  function handleQrisFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar QRIS maksimal 2MB");
      return;
    }
    setQrisFile(file);
    const reader = new FileReader();
    reader.onload = () => setQrisImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleImagePreview(
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File) => void,
    setUrl: (u: string) => void,
    maxMb: number,
    label: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Ukuran ${label} maksimal ${maxMb}MB`);
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => setUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = Schema.safeParse(vals);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (websiteAddonEnabled && vals.website_enabled && slugStatus === "taken") {
      toast.error("Slug sudah digunakan UMKM lain, pilih yang lain.");
      return;
    }
    setSaving(true);
    try {
      let qrisUrl = qrisImageUrl;
      if (qrisFile) {
        const ext = qrisFile.name.split(".").pop() || "png";
        const path = `${user.id}/qris.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, qrisFile, {
          cacheControl: "3600",
          upsert: true,
        });
        if (upErr) throw upErr;
        qrisUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }

      let logoUrlFinal = logoUrl;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `${user.id}/logo.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, logoFile, {
          cacheControl: "3600",
          upsert: true,
        });
        if (upErr) throw upErr;
        logoUrlFinal = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }

      let coverUrlFinal = coverUrl;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop() || "png";
        const path = `${user.id}/cover.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, coverFile, {
          cacheControl: "3600",
          upsert: true,
        });
        if (upErr) throw upErr;
        coverUrlFinal = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        user_id: user.id,
        business_name: vals.business_name || null,
        description: vals.description || null,
        address: vals.address || null,
        phone: vals.phone || null,
        operating_hours: summarizeHours(hoursRows) || null,
        operating_hours_structured: hoursRows
          .filter((r) => r.label.trim())
          .map((r) => ({ label: r.label.trim(), open: r.open, close: r.close })) as Array<{ label: string; open: string; close: string }>,
        website: vals.website || null,
        social_media: {
          instagram: vals.instagram || "",
          facebook: vals.facebook || "",
          tiktok: vals.tiktok || "",
        },
        payment_methods: {
          qris: vals.qris,
          qris_image_url: qrisUrl || "",
          bank_transfer: vals.bank_transfer,
          bank_account: vals.bank_account || "",
          cod: vals.cod,
        },
        fulfillment_methods: {
          delivery: vals.delivery,
          delivery_note: vals.delivery_note || "",
          pickup: vals.pickup,
          pickup_note: vals.pickup_note || "",
        },
        website_enabled: websiteAddonEnabled ? vals.website_enabled : false,
        slug: websiteAddonEnabled ? (vals.slug || null) : null,
        logo_url: logoUrlFinal || null,
        cover_image_url: coverUrlFinal || null,
        latitude: vals.latitude ? Number(vals.latitude) : null,
        longitude: vals.longitude ? Number(vals.longitude) : null,
        location_label: vals.location_label || null,
        theme_color: vals.theme_color,
        promo_text: vals.promo_text || null,
      };
      const { error } = await supabase.from("business_settings").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Pengaturan tersimpan");
      setQrisFile(null);
      setLogoFile(null);
      setCoverFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof FormVals>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setVals((v) => ({ ...v, [k]: e.target.value as FormVals[K] }));

  const setBool = (k: keyof FormVals) => (checked: boolean) =>
    setVals((v) => ({ ...v, [k]: checked }));

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const slug = e.target.value.trim().toLowerCase();
    setVals((v) => ({ ...v, slug }));

    if (slugCheckRef.current) clearTimeout(slugCheckRef.current);
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    slugCheckRef.current = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_slug_available", {
        check_slug: slug,
        exclude_user_id: user?.id ?? undefined,
      });
      if (error) {
        setSlugStatus("idle");
        return;
      }
      if (data === true) {
        setSlugStatus(slug === initialSlugRef.current ? "own" : "available");
      } else {
        setSlugStatus("taken");
      }
    }, 500);
  }

  return (
    <AppShell title="Pengaturan Bisnis">
      <form onSubmit={save} className="w-full space-y-6 pb-10">
        <div>
          <h1 className="text-lg font-semibold">Pengaturan Bisnis</h1>
          <p className="text-sm text-muted-foreground">Kelola informasi bisnis yang ditampilkan ke pelanggan dan digunakan oleh AI.</p>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList>
            <TabsTrigger value="info">Informasi Bisnis</TabsTrigger>
            <TabsTrigger value="website">Website</TabsTrigger>
          </TabsList>

          {/* ============ TAB: Informasi Bisnis ============ */}
          <TabsContent value="info" className="space-y-6 pt-4">
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="grid gap-6 p-4 sm:p-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h2 className="font-medium">Informasi Bisnis</h2>
                  <Field label="Nama Bisnis" v={vals.business_name} onChange={set("business_name")} />
                  <Field label="Telepon" v={vals.phone} onChange={set("phone")} />
                  <div className="space-y-1.5">
                    <Label>Deskripsi</Label>
                    <Textarea rows={3} value={vals.description} onChange={set("description")} maxLength={1000} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Jam Operasional</Label>
                    <div className="space-y-2">
                      {hoursRows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2">
                          <Input
                            value={row.label}
                            onChange={(e) =>
                              setHoursRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))
                            }
                            placeholder="Mis. Senin–Jumat"
                            maxLength={40}
                            className="flex-1"
                          />
                          <Input
                            type="time"
                            value={row.open}
                            onChange={(e) =>
                              setHoursRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, open: e.target.value } : r)))
                            }
                            className="w-28 shrink-0"
                          />
                          <span className="shrink-0 text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={row.close}
                            onChange={(e) =>
                              setHoursRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, close: e.target.value } : r)))
                            }
                            className="w-28 shrink-0"
                          />
                          <button
                            type="button"
                            onClick={() => setHoursRows((prev) => prev.filter((r) => r.id !== row.id))}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                            title="Hapus baris"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHoursRows((prev) => [...prev, makeHoursRow()])}
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> Tambah Baris
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Buat baris sesuai jadwal usaha Anda, mis. "Senin–Jumat", "Sabtu", "Minggu", atau "Tutup setiap Senin".
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Website" v={vals.website} onChange={set("website")} placeholder="https://" />
                    <Field label="Instagram" v={vals.instagram} onChange={set("instagram")} />
                    <Field label="TikTok" v={vals.tiktok} onChange={set("tiktok")} />
                    <Field label="Facebook" v={vals.facebook} onChange={set("facebook")} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="font-medium invisible">Alamat</h2>
                  <div className="space-y-1.5">
                    <Label>Alamat</Label>
                    <Textarea rows={2} value={vals.address} onChange={set("address")} maxLength={400} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Lokasi di Peta (opsional)</Label>
                    <LocationPicker
                      value={{
                        lat: vals.latitude ? Number(vals.latitude) : null,
                        lng: vals.longitude ? Number(vals.longitude) : null,
                        label: vals.location_label,
                      }}
                      onChange={(loc) => {
                        setVals((v) => ({
                          ...v,
                          latitude: String(loc.lat),
                          longitude: String(loc.lng),
                          location_label: loc.label ?? v.location_label,
                        }));
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle className="text-base">Pembayaran</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ToggleRow label="QRIS" desc="Pelanggan bayar via scan QRIS" checked={vals.qris} onChange={setBool("qris")} />
                  {vals.qris && (
                    <div className="space-y-1.5 rounded-lg border border-dashed p-3">
                      <Label className="text-sm">Gambar QRIS (opsional)</Label>
                      <div className="flex items-center gap-3">
                        {qrisImageUrl && <img src={qrisImageUrl} alt="QRIS" className="h-20 w-20 rounded-lg border object-cover" />}
                        <Input type="file" accept="image/*" onChange={handleQrisFile} className="text-xs" />
                      </div>
                    </div>
                  )}

                  <ToggleRow label="Transfer Bank" desc="Pelanggan bayar via transfer rekening" checked={vals.bank_transfer} onChange={setBool("bank_transfer")} />
                  {vals.bank_transfer && (
                    <div className="space-y-1.5 rounded-lg border border-dashed p-3">
                      <Label className="text-sm">Info Rekening</Label>
                      <Input value={vals.bank_account} onChange={set("bank_account")} placeholder="Mis. BCA 1234567890 a.n. Budi Santoso" maxLength={200} />
                    </div>
                  )}

                  <ToggleRow label="Bayar di Tempat (COD)" desc="Pelanggan bayar saat menerima/mengambil barang" checked={vals.cod} onChange={setBool("cod")} />
                </CardContent>
              </Card>

              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle className="text-base">Pengiriman & Pengambilan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ToggleRow label="Diantar (Delivery)" desc="Pesanan diantar ke alamat pelanggan" checked={vals.delivery} onChange={setBool("delivery")} />
                  {vals.delivery && (
                    <div className="space-y-1.5 rounded-lg border border-dashed p-3">
                      <Label className="text-sm">Catatan Pengiriman (opsional)</Label>
                      <Textarea rows={2} value={vals.delivery_note} onChange={set("delivery_note")} placeholder="Mis. Ongkir tergantung jarak, area Yogyakarta saja" maxLength={400} />
                    </div>
                  )}

                  <ToggleRow label="Ambil Sendiri (Pickup)" desc="Pelanggan mengambil pesanan di lokasi" checked={vals.pickup} onChange={setBool("pickup")} />
                  {vals.pickup && (
                    <div className="space-y-1.5 rounded-lg border border-dashed p-3">
                      <Label className="text-sm">Catatan Pengambilan (opsional)</Label>
                      <Textarea rows={2} value={vals.pickup_note} onChange={set("pickup_note")} placeholder="Mis. Ambil di toko, jam 09.00–17.00" maxLength={400} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ TAB: Website ============ */}
          <TabsContent value="website" className="space-y-6 pt-4">
            {websiteAddonEnabled ? (
              <Card className="shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle className="text-base">Website</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleRow label="Aktifkan Website" desc="Tampilkan landing page publik untuk bisnis ini" checked={vals.website_enabled} onChange={setBool("website_enabled")} />
                  {vals.website_enabled && (
                    <>
                      <div className="space-y-1.5 rounded-lg border border-dashed p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">URL Slug</Label>
                            <Input value={vals.slug} onChange={handleSlugChange} placeholder="Mis. toko-budi-jaya" maxLength={60} />
                            <p className="text-xs text-muted-foreground">Hanya huruf kecil, angka, dan tanda hubung (-).</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">URL Website Anda</Label>
                            <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                              <span className="truncate">
                                {typeof window !== "undefined" ? window.location.origin : "localhost:8080"}/{vals.slug || "slug-anda"}
                              </span>
                            </div>
                            {slugStatus === "checking" && <p className="text-xs text-muted-foreground">Memeriksa ketersediaan…</p>}
                            {slugStatus === "available" && <p className="text-xs text-green-600">URL ini tersedia.</p>}
                            {slugStatus === "own" && <p className="text-xs text-muted-foreground">Ini adalah URL website Anda saat ini.</p>}
                            {slugStatus === "taken" && <p className="text-xs text-destructive">URL ini sudah digunakan UMKM lain, ubah slug.</p>}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Logo Usaha</Label>
                          <div className="flex items-center gap-3">
                            {logoUrl ? (
                              <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-full border object-cover" />
                            ) : (
                              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border bg-muted text-sm font-semibold text-muted-foreground">
                                {(vals.business_name || "U").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <Input
                              type="file" accept="image/*" className="text-xs"
                              onChange={(e) => handleImagePreview(e, setLogoFile, setLogoUrl, 2, "logo")}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Jika kosong, ditampilkan inisial nama bisnis.</p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-sm">Foto Cover (Hero)</Label>
                          <div className="flex items-center gap-3">
                            {coverUrl ? (
                              <img src={coverUrl} alt="Cover" className="h-14 w-24 rounded-lg border object-cover" />
                            ) : (
                              <div className="grid h-14 w-24 shrink-0 place-items-center rounded-lg border bg-muted text-xs text-muted-foreground">
                                Kosong
                              </div>
                            )}
                            <Input
                              type="file" accept="image/*" className="text-xs"
                              onChange={(e) => handleImagePreview(e, setCoverFile, setCoverUrl, 5, "cover")}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Jika kosong, otomatis pakai slider dari 3 foto produk pertama.</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Warna Tema Landing Page</Label>
                        <div className="flex flex-wrap gap-2">
                          {THEME_COLORS.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setVals((v) => ({ ...v, theme_color: t.id }))}
                              title={t.label}
                              className={`flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors ${
                                vals.theme_color === t.id ? "border-foreground ring-2 ring-offset-2 ring-offset-background" : "border-border hover:bg-muted"
                              }`}
                              style={vals.theme_color === t.id ? { "--tw-ring-color": t.swatch } as React.CSSProperties : undefined}
                            >
                              <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: t.swatch }} />
                              {t.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Warna aksen (tombol, judul, ikon, background section) pada landing page publik Anda.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Teks Promo (opsional)</Label>
                        <Input value={vals.promo_text} onChange={set("promo_text")} placeholder="Mis. Diskon 10% untuk pembelian pertama" maxLength={200} />
                        <p className="text-xs text-muted-foreground">Ditampilkan sebagai banner promo di landing page. Kosongkan jika tidak ada promo saat ini.</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-[var(--shadow-card)] border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Website</CardTitle>
                  <CardDescription>
                    Landing page publik belum aktif untuk akun Anda. Hubungi admin untuk mengaktifkan.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 z-[1100] -mx-1 flex justify-end border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Perubahan"}</Button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({ label, v, onChange, placeholder }: { label: string; v: string | undefined; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={v ?? ""} onChange={onChange} placeholder={placeholder} maxLength={400} />
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <Label className="text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}