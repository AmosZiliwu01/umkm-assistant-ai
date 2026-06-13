import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
});
type FormVals = z.infer<typeof Schema>;

function SettingsPage() {
  const { user } = useAuth();
  const [vals, setVals] = useState<FormVals>({
    business_name: "", description: "", address: "", phone: "",
    operating_hours: "", website: "", instagram: "", facebook: "", tiktok: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("business_settings").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const sm = (data.social_media ?? {}) as Record<string, string>;
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
        });
      });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = Schema.safeParse(vals);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
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
    };
    const { error } = await supabase.from("business_settings").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Pengaturan tersimpan");
  }

  const set = (k: keyof FormVals) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setVals((v) => ({ ...v, [k]: e.target.value }));

  return (
    <AppShell title="Pengaturan Bisnis">
      <form onSubmit={save} className="mx-auto max-w-3xl space-y-6">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle>Profil Bisnis</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Bisnis" v={vals.business_name} onChange={set("business_name")} />
            <Field label="Telepon" v={vals.phone} onChange={set("phone")} />
            <div className="sm:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea rows={3} value={vals.description} onChange={set("description")} maxLength={1000} />
            </div>
            <div className="sm:col-span-2">
              <Label>Alamat</Label>
              <Textarea rows={2} value={vals.address} onChange={set("address")} maxLength={400} />
            </div>
            <Field label="Jam Operasional" v={vals.operating_hours} onChange={set("operating_hours")} placeholder="Mis. Senin–Sabtu 09.00–21.00" />
            <Field label="Website" v={vals.website} onChange={set("website")} placeholder="https://" />
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle>Media Sosial</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Instagram" v={vals.instagram} onChange={set("instagram")} />
            <Field label="Facebook" v={vals.facebook} onChange={set("facebook")} />
            <Field label="TikTok" v={vals.tiktok} onChange={set("tiktok")} />
          </CardContent>
        </Card>

        <div className="flex justify-end">
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