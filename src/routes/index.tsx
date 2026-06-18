import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, MessagesSquare, BookOpen, Store } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UMKM AI Assistant | Asisten AI untuk UMKM Indonesia" },
      { name: "description", content: "Kelola percakapan pelanggan dengan AI yang memahami bisnis Anda. Knowledge base, simulator chat, dan handover ke admin." },
      { property: "og:title", content: "UMKM AI Assistant" },
      { property: "og:description", content: "AI customer service untuk UMKM Indonesia." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <span className="font-semibold">UMKM AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/auth">Masuk</Link></Button>
          <Button asChild><Link to="/auth">Mulai Gratis</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-16">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> MVP untuk UMKM Indonesia
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Balas pelanggan Anda otomatis dengan <span className="text-primary">AI yang paham bisnis Anda</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Buat knowledge base, simulasikan percakapan, dan ambil alih kapan saja. Persiapan menuju integrasi WhatsApp.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/auth">Mulai sekarang</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/auth">Sudah punya akun</Link></Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureCard icon={BookOpen} title="Knowledge Base" desc="Simpan FAQ bisnis Anda, AI menjawab berdasarkan itu." />
            <FeatureCard icon={Sparkles} title="Chat Simulator" desc="Uji jawaban AI sebelum diaktifkan ke pelanggan." />
            <FeatureCard icon={MessagesSquare} title="Riwayat Percakapan" desc="Semua percakapan tersimpan rapi dan terkategori." />
            <FeatureCard icon={Store} title="Handover Admin" desc="Ambil alih percakapan kapan pun dibutuhkan." />
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
