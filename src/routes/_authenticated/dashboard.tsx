import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessagesSquare, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | UMKM AI" }] }),
  component: Dashboard,
});

function statusLabel(s: string) {
  return s === "ai_active" ? "AI Aktif" : s === "admin_handling" ? "Admin Menangani" : "Selesai";
}

function Dashboard() {
  const { user } = useAuth();
  const [convCount, setConvCount] = useState(0);
  const [kbCount, setKbCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => setConvCount(count ?? 0));
    supabase.from("knowledge_base").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => setKbCount(count ?? 0));
  }, [user]);

  const recent = useQuery({
    enabled: !!user,
    queryKey: ["recent-conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, customer_name, status, last_message_at")
        .order("last_message_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Selamat datang 👋</h2>
          <p className="text-sm text-muted-foreground">Ringkasan aktivitas asisten AI Anda hari ini.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Percakapan" value={convCount} icon={MessagesSquare} />
          <StatCard title="Knowledge Base" value={kbCount} icon={BookOpen} />
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status AI</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--success)]" />
                <span className="text-2xl font-bold">Aktif</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Powered by Lovable AI</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Percakapan Terbaru</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">5 percakapan terakhir.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/conversations">Lihat semua <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.data && recent.data.length > 0 ? (
              <ul className="divide-y">
                {recent.data.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link to="/conversations/$id" params={{ id: c.id }} className="truncate font-medium hover:underline">
                        {c.customer_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={c.status === "ai_active" ? "default" : c.status === "admin_handling" ? "secondary" : "outline"}>
                      {statusLabel(c.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Belum ada percakapan. Coba <Link to="/simulator" className="text-primary underline">Chat Simulator</Link>.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}