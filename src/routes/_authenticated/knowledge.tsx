import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Base | UMKM AI" }] }),
  component: KnowledgePage,
});

interface KB { id: string; question: string; answer: string; category: string | null; }

const Schema = z.object({
  question: z.string().trim().min(3, "Pertanyaan minimal 3 karakter").max(500),
  answer: z.string().trim().min(3, "Jawaban minimal 3 karakter").max(2000),
  category: z.string().trim().max(80).optional().or(z.literal("")),
});

function KnowledgePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<KB | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<KB | null>(null);

  const { data: items = [] } = useQuery({
    enabled: !!user,
    queryKey: ["kb", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_base").select("id, question, answer, category").order("created_at", { ascending: false });
      if (error) throw error;
      return data as KB[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (x) => x.question.toLowerCase().includes(q) || x.answer.toLowerCase().includes(q) || (x.category ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = Schema.safeParse({
      question: f.get("question"), answer: f.get("answer"), category: f.get("category"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!user) return;
    const payload = {
      user_id: user.id,
      question: parsed.data.question,
      answer: parsed.data.answer,
      category: parsed.data.category || null,
    };
    const { error } = editing
      ? await supabase.from("knowledge_base").update(payload).eq("id", editing.id)
      : await supabase.from("knowledge_base").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "FAQ diperbarui" : "FAQ ditambahkan");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["kb"] });
  }

  async function doDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", toDelete.id);
    if (error) toast.error(error.message);
    else { toast.success("FAQ dihapus"); qc.invalidateQueries({ queryKey: ["kb"] }); }
    setToDelete(null);
  }

  return (
    <AppShell title="Knowledge Base">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari pertanyaan, jawaban, kategori…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="mr-1 h-4 w-4" /> Tambah FAQ</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit FAQ" : "Tambah FAQ"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Pertanyaan</Label><Input name="question" defaultValue={editing?.question} required maxLength={500} /></div>
                <div><Label>Jawaban</Label><Textarea name="answer" rows={5} defaultValue={editing?.answer} required maxLength={2000} /></div>
                <div><Label>Kategori (opsional)</Label><Input name="category" defaultValue={editing?.category ?? ""} maxLength={80} /></div>
                <DialogFooter><Button type="submit">{editing ? "Simpan" : "Tambah"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {filtered.length === 0 ? (
          <Card className="shadow-[var(--shadow-card)]"><CardContent className="py-12 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "Belum ada FAQ. Tambah pertanyaan pertama Anda." : "Tidak ada FAQ yang cocok."}
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((x) => (
              <Card key={x.id} className="shadow-[var(--shadow-card)]">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{x.question}</h3>
                      {x.category && <Badge variant="secondary">{x.category}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{x.answer}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(x); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(x)}><Trash2 className="h-4 w-4" /></Button>
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
            <AlertDialogTitle>Hapus FAQ?</AlertDialogTitle>
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