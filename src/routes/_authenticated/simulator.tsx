import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ChatView, type ChatMsg } from "@/components/chat-view";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendCustomerMessage } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/simulator")({
  head: () => ({ meta: [{ title: "Chat Simulator | UMKM AI" }] }),
  component: Simulator,
});

function Simulator() {
  const navigate = useNavigate();
  const send = useServerFn(sendCustomerMessage);
  const [customerName, setCustomerName] = useState("Pelanggan Demo");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);

  async function onSend(text: string) {
    const localId = crypto.randomUUID();
    setMessages((m) => [...m, { id: localId, role: "customer", content: text }]);
    setSending(true);
    try {
      const res = await send({ data: { conversationId, customerName, message: text } });
      setConversationId(res.conversationId);
      if (res.aiReply) setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: res.aiReply! }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim pesan");
    } finally { setSending(false); }
  }

  return (
    <AppShell title="Chat Simulator">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nama Pelanggan (simulasi)</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value.slice(0, 80))} />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => { setConversationId(undefined); setMessages([]); }}
              className="text-sm text-primary underline"
            >Mulai percakapan baru</button>
          </div>
        </div>
        <ChatView
          messages={messages}
          onSend={onSend}
          sending={sending}
          placeholder="Ketik sebagai pelanggan…"
          headerRight={
            conversationId ? (
              <button onClick={() => navigate({ to: "/conversations/$id", params: { id: conversationId } })} className="text-xs text-primary underline">
                Buka di Percakapan →
              </button>
            ) : null
          }
        />
        <p className="text-center text-xs text-muted-foreground">
          AI menjawab berdasarkan Knowledge Base & Pengaturan Bisnis Anda. Jika tidak ada jawaban, AI akan menghubungkan ke admin.
        </p>
      </div>
    </AppShell>
  );
}