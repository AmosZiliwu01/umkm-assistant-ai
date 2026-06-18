import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ImageOff } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Produk | UMKM AI" }] }),
  component: ProductsPage,
});

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  image_url: string | null;
  is_available: boolean;
}

const Schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.string().trim().optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  is_available: z.boolean(),
});

const MAX_IMAGE_MB = 3;

function formatPrice(price: number | null) {
  if (price === null) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
}

function ProductsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(true);

  const { data: items = [] } = useQuery({
    enabled: !!user,
    queryKey: ["products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, category, image_url, is_available")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (x) =>
        x.name.toLowerCase().includes(q) ||
        (x.description ?? "").toLowerCase().includes(q) ||
        (x.category ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  function openCreate() {
    setEditing(null);
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
    setAvailable(true);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setImageFile(null);
    setImagePreview(p.image_url);
    setRemoveImage(false);
    setAvailable(p.is_available);
    setOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Ukuran gambar maksimal ${MAX_IMAGE_MB}MB`);
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  }

  async function uploadImage(file: File): Promise<string> {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = Schema.safeParse({
      name: f.get("name"),
      description: f.get("description"),
      price: f.get("price"),
      category: f.get("category"),
      is_available: available,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      let image_url: string | null | undefined = undefined;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      } else if (removeImage) {
        image_url = null;
      }

      const priceStr = parsed.data.price?.replace(/[^0-9.]/g, "");
      const payload: TablesInsert<"products"> & Partial<TablesUpdate<"products">> = {
        user_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: priceStr ? Number(priceStr) : null,
        category: parsed.data.category || null,
        is_available: parsed.data.is_available,
      };
      if (image_url !== undefined) payload.image_url = image_url;

      const { error } = editing
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert(payload);

      if (error) { toast.error(error.message); return; }
      toast.success(editing ? "Produk diperbarui" : "Produk ditambahkan");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("products").delete().eq("id", toDelete.id);
    if (error) toast.error(error.message);
    else { toast.success("Produk dihapus"); qc.invalidateQueries({ queryKey: ["products"] }); }
    setToDelete(null);
  }

  return (
    <AppShell title="Produk">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari nama, kategori…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> Tambah Produk</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div>
                  <Label>Foto Produk (opsional)</Label>
                  <div className="mt-1.5 flex items-center gap-3">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-lg border object-cover" />
                    ) : (
                      <div className="grid h-20 w-20 place-items-center rounded-lg border bg-muted text-muted-foreground">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <Input type="file" accept="image/*" onChange={handleFileChange} className="text-xs" />
                      {imagePreview && (
                        <Button type="button" variant="ghost" size="sm" onClick={clearImage} className="h-7 w-fit px-2 text-xs text-muted-foreground">
                          Hapus foto
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Maks {MAX_IMAGE_MB}MB. Boleh dikosongkan.</p>
                </div>
                <div><Label>Nama Produk</Label><Input name="name" defaultValue={editing?.name} required maxLength={200} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Harga (Rp, opsional)</Label>
                    <Input name="price" type="text" inputMode="decimal" defaultValue={editing?.price ?? ""} placeholder="Mis. 25000" />
                  </div>
                  <div><Label>Kategori (opsional)</Label><Input name="category" defaultValue={editing?.category ?? ""} maxLength={80} /></div>
                </div>
                <div>
                  <Label>Deskripsi (opsional)</Label>
                  <Textarea name="description" rows={4} defaultValue={editing?.description ?? ""} maxLength={2000} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">Tersedia / Dijual</Label>
                    <p className="text-xs text-muted-foreground">Nonaktifkan jika produk sedang tidak dijual.</p>
                  </div>
                  <Switch checked={available} onCheckedChange={setAvailable} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : editing ? "Simpan" : "Tambah"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {filtered.length === 0 ? (
          <Card className="shadow-[var(--shadow-card)]"><CardContent className="py-12 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "Belum ada produk. Tambah produk pertama Anda." : "Tidak ada produk yang cocok."}
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Card key={p.id} className="shadow-[var(--shadow-card)]">
                <CardContent className="flex gap-3 p-4">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-16 w-16 shrink-0 rounded-lg border object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium">{p.name}</h3>
                      <div className="flex shrink-0 gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setToDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary">{formatPrice(p.price)}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.category && <Badge variant="secondary" className="text-xs">{p.category}</Badge>}
                      {!p.is_available && <Badge variant="outline" className="text-xs">Tidak tersedia</Badge>}
                    </div>
                    {p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}