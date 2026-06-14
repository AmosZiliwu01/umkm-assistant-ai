import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
});
type FormVals = z.infer<typeof Schema>;

const DEFAULT_VALS: FormVals = {
  business_name: "", description: "", address: "", phone: "",
  operating_hours: "", website: "", instagram: "", facebook: "", tiktok: "",
  qris: false, bank_transfer: false, bank_account: "", cod: false,
  delivery: false, delivery_note: "", pickup: false, pickup_note: "",
  website_enabled: false, slug: "",
};

function SettingsPage() {
  const { user } = useAuth();
  const [vals, setVals] = useState<FormVals>(DEFAULT_VALS);
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [websiteAddonEnabled, setWebsiteAddonEnabled] = useState(false);

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
        });
        setQrisImageUrl(typeof pm.qris_image_url === "string" ? pm.qris_image_url : null);
        setWebsiteAddonEnabled(Boolean(data.website_addon_enabled));
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = Schema.safeParse(vals);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
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

      const payload = {
        user_id: user.id,
        business_name: vals.business_name || null,
        description: vals.description || null,
        address: vals.address || null,
        phone: vals.phone || null,
        operating_hours: vals.operating_hours || null,
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
      };
      const { error } = await supabase.from("business_settings").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Pengaturan tersimpan");
      setQrisFile(null);
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

  return (
    <AppShell title="Pengaturan Bisnis">
      <form onSubmit={save} className="w-full space-y-8 pb-10">
        {/* ============ Profil Bisnis ============ */}
        <section className="space-y-4">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Profil Bisnis</CardTitle>
              <CardDescription>Informasi dasar yang ditampilkan ke pelanggan dan dipahami oleh AI.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Bisnis" v={vals.business_name} onChange={set("business_name")} />
              <Field label="Telepon" v={vals.phone} onChange={set("phone")} />
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Deskripsi</Label>
                <Textarea rows={3} value={vals.description} onChange={set("description")} maxLength={1000} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Alamat</Label>
                <Textarea rows={2} value={vals.address} onChange={set("address")} maxLength={400} />
              </div>
              <Field label="Jam Operasional" v={vals.operating_hours} onChange={set("operating_hours")} placeholder="Mis. Senin–Sabtu 09.00–21.00" />
              <Field label="Website" v={vals.website} onChange={set("website")} placeholder="https://" />
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Media Sosial</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 lg:max-w-2xl">
              <Field label="Instagram" v={vals.instagram} onChange={set("instagram")} />
              <Field label="Facebook" v={vals.facebook} onChange={set("facebook")} />
              <Field label="TikTok" v={vals.tiktok} onChange={set("tiktok")} />
            </CardContent>
          </Card>
        </section>

        {/* ============ Transaksi: Pembayaran & Pengiriman ============ */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Transaksi</h2>
            <p className="text-sm text-muted-foreground">Diisi ke AI agar bisa menutup pesanan dengan informasi yang tepat.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-base">Pembayaran</CardTitle>
                <CardDescription>Metode yang diterima saat closing transaksi.</CardDescription>
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
                <CardDescription>Cara pelanggan menerima pesanan.</CardDescription>
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
        </section>

        {/* ============ Pengaturan Lanjutan ============ */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Pengaturan Lanjutan</h2>
            <p className="text-sm text-muted-foreground">Opsional — sesuaikan dengan paket layanan Anda.</p>
          </div>
          {websiteAddonEnabled ? (
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader>
                <CardTitle className="text-base">Website</CardTitle>
                <CardDescription>Landing page publik untuk bisnis ini.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ToggleRow label="Aktifkan Website" desc="Tampilkan landing page publik untuk bisnis ini" checked={vals.website_enabled} onChange={setBool("website_enabled")} />
                {vals.website_enabled && (
                  <div className="space-y-1.5 rounded-lg border border-dashed p-3">
                    <Label className="text-sm">URL Slug</Label>
                    <Input value={vals.slug} onChange={set("slug")} placeholder="Mis. toko-budi-jaya" maxLength={60} />
                    <p className="text-xs text-muted-foreground">Hanya huruf kecil, angka, dan tanda hubung (-).</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-[var(--shadow-card)] border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Website</CardTitle>
                <CardDescription>
                  Landing page publik belum aktif untuk akun Anda. Fitur ini tersedia pada paket Website atau paket gabungan — hubungi admin untuk mengaktifkan.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </section>

        <div className="sticky bottom-0 -mx-1 flex justify-end border-t bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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