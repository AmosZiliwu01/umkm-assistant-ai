import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChatView, type ChatMsg } from "@/components/chat-view";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { sendCustomerMessage, sendAdminReply, updateConversationStatus } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/conversations/$id")({
  head: () => ({ meta: [{ title: "Percakapan — UMKM AI" }] }),
  component: ConversationDetail,
});

function ConversationDetail() {
  const { id } = useParams({ from: "/_authenticated/conversations/$id" });
  const qc = useQueryClient();
  const sendCustomer = useServerFn(sendCustomerMessage);
  const sendAdmin = useServerFn(sendAdminReply);
  const updateStatus = useServerFn(updateConversationStatus);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"customer" | "admin">("customer");

  const conv = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const msgs = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("id, role, content, image_url, created_at")
        .eq("conversation_id", id).order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChatMsg[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  async function onSend(text: string) {
    setSending(true);
    try {
      if (mode === "admin") await sendAdmin({ data: { conversationId: id, message: text } });
      else await sendCustomer({ data: { conversationId: id, message: text } });
      qc.invalidateQueries({ queryKey: ["messages", id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal mengirim"); }
    finally { setSending(false); }
  }

  async function changeStatus(value: string) {
    try {
      await updateStatus({ data: { conversationId: id, status: value as "ai_active" | "admin_handling" | "closed" } });
      qc.invalidateQueries({ queryKey: ["conversation", id] });
      toast.success("Status diperbarui");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal"); }
  }

  const status = conv.data?.status ?? "ai_active";
  const closed = status === "closed";

  return (
    <AppShell title={conv.data?.customer_name ?? "Percakapan"}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/conversations"><ArrowLeft className="mr-1 h-4 w-4" /> Kembali</Link></Button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select value={status} onValueChange={changeStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ai_active">AI Aktif</SelectItem>
                <SelectItem value="admin_handling">Admin Menangani</SelectItem>
                <SelectItem value="closed">Selesai</SelectItem>
              </SelectContent>
            </Select>
            <Select value={mode} onValueChange={(v) => setMode(v as "customer" | "admin")}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Kirim sbg Pelanggan</SelectItem>
                <SelectItem value="admin">Kirim sbg Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ChatView
          messages={msgs.data ?? []}
          onSend={onSend}
          sending={sending}
          disabled={closed}
          placeholder={closed ? "Percakapan ditutup" : mode === "admin" ? "Balas sebagai admin…" : "Simulasikan pesan pelanggan…"}
        />
        {status === "admin_handling" && (
          <p className="text-center text-xs text-muted-foreground">AI dinonaktifkan — Anda sedang menangani percakapan ini secara manual.</p>
        )}
      </div>
    </AppShell>
  );
}