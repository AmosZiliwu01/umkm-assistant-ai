import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ChatMsg {
  id: string;
  role: "customer" | "assistant" | "admin";
  content: string;
  image_url?: string | null;
  created_at?: string;
}

export function ChatView({
  messages, onSend, disabled, sending, placeholder, headerRight,
}: {
  messages: ChatMsg[];
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  headerRight?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled || sending) return;
    setText("");
    await onSend(t);
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      {headerRight && <div className="flex items-center justify-end gap-2 border-b p-3">{headerRight}</div>}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Mulai percakapan dengan mengetik pesan di bawah.</p>
        )}
        {messages.map((m) => {
          const hasText = m.content.trim().length > 0;
          const hasImage = !!m.image_url;
          return (
            <div key={m.id} className={cn("flex", m.role === "customer" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                m.role === "customer" && "bg-primary text-primary-foreground",
                m.role === "assistant" && "bg-muted text-foreground",
                m.role === "admin" && "bg-[var(--accent)] text-[var(--accent-foreground)]",
                hasImage && !hasText && "p-2",
              )}>
                {m.role === "admin" && <div className="mb-0.5 text-[10px] font-medium uppercase opacity-70">Admin</div>}
                {hasImage && (
                  <img
                    src={m.image_url ?? undefined}
                    alt="Lampiran"
                    className={cn("max-w-[220px] rounded-lg object-contain", hasText && "mb-1.5")}
                  />
                )}
                {hasText && (
                  <div className="prose prose-sm max-w-none [&_p]:m-0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {sending && <div className="text-xs text-muted-foreground">AI sedang mengetik…</div>}
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as unknown as React.FormEvent); } }}
          rows={1} maxLength={2000} disabled={disabled}
          placeholder={placeholder ?? "Ketik pesan…"}
          className="min-h-[44px] resize-none"
        />
        <Button type="submit" size="icon" disabled={disabled || sending || !text.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}