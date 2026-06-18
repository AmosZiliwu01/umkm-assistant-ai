import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/gallery")({
  head: () => ({ meta: [{ title: "Galeri — UMKM AI" }] }),
  component: GalleryPage,
});

interface GalleryRow {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

function GalleryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<GalleryRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("gallery_images")
      .select("id, image_url, caption, sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setItems((data ?? []) as GalleryRow[]);
        setLoading(false);
      });
  }, [user]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    if (items.length + files.length > 12) {
      toast.error("Maksimal 12 foto galeri");
      return;
    }

    setUploading(true);
    try {
      const newRows: GalleryRow[] = [];
      let nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;

      for (const file of Array.from(files)) {
        if (file.size > 4 * 1024 * 1024) {
          toast.error(`${file.name} melebihi 4MB, dilewati`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) {
          toast.error(`Gagal upload ${file.name}`);
          continue;
        }
        const imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;

        const { data: inserted, error: insErr } = await supabase
          .from("gallery_images")
          .insert({ user_id: user.id, image_url: imageUrl, sort_order: nextOrder })
          .select("id, image_url, caption, sort_order")
          .single();
        if (insErr || !inserted) {
          toast.error(`Gagal menyimpan ${file.name}`);
          continue;
        }
        newRows.push(inserted as GalleryRow);
        nextOrder += 1;
      }

      setItems((prev) => [...prev, ...newRows]);
      if (newRows.length > 0) toast.success(`${newRows.length} foto ditambahkan`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus foto");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Foto dihapus");
  }

  function handleCaptionChange(id: string, caption: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, caption } : i)));
  }

  async function handleCaptionBlur(id: string, caption: string) {
    await supabase.from("gallery_images").update({ caption: caption || null }).eq("id", id);
  }

  return (
    <AppShell title="Galeri">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">Galeri Kegiatan</h1>
          <p className="text-sm text-muted-foreground">
            Foto dokumentasi/kegiatan UMKM (terpisah dari foto produk), ditampilkan di landing page. Kosongkan jika tidak ingin menampilkan galeri.
          </p>
        </div>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Foto Galeri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && items.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <div key={item.id} className="space-y-2 rounded-lg border p-2">
                    <div className="relative">
                      <img src={item.image_url} alt={item.caption ?? "Galeri"} className="h-32 w-full rounded-md object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-destructive shadow hover:bg-background"
                        title="Hapus foto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      value={item.caption ?? ""}
                      onChange={(e) => handleCaptionChange(item.id, e.target.value)}
                      onBlur={(e) => handleCaptionBlur(item.id, e.target.value)}
                      placeholder="Keterangan (opsional)"
                      maxLength={120}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-muted">
                <Upload className="h-4 w-4" />
                {uploading ? "Mengunggah…" : "Tambah Foto Galeri"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">Maksimal 12 foto, masing-masing maksimal 4MB.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}