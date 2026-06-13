import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Percakapan — UMKM AI" }] }),
  component: ConversationsLayout,
});

function statusLabel(s: string) {
  return s === "ai_active" ? "AI Aktif" : s === "admin_handling" ? "Admin Menangani" : "Selesai";
}

function ConversationsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDetail = pathname !== "/conversations" && pathname.startsWith("/conversations/");
  if (isDetail) return <Outlet />;

  const { user } = useAuth();
  const { data = [] } = useQuery({
    enabled: !!user,
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, customer_name, status, last_message_at")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell title="Percakapan">
      {data.length === 0 ? (
        <Card className="shadow-[var(--shadow-card)]"><CardContent className="py-12 text-center text-sm text-muted-foreground">
          Belum ada percakapan. Coba <Link to="/simulator" className="text-primary underline">Chat Simulator</Link>.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {data.map((c) => (
            <Link key={c.id} to="/conversations/$id" params={{ id: c.id }}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] hover:bg-muted/40">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                </p>
              </div>
              <Badge variant={c.status === "ai_active" ? "default" : c.status === "admin_handling" ? "secondary" : "outline"}>
                {statusLabel(c.status)}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}