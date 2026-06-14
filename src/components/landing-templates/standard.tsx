import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Phone, Clock, Instagram, ImageOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { submitContactMessage } from "@/lib/contact.functions";
import type { LandingData } from "@/lib/landing";

function formatPrice(price: number | null) {
  if (price === null) return "Hubungi kami";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
}

function waLink(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

export function StandardLandingTemplate({ data }: { data: LandingData }) {
  const { business, products } = data;
  const sm = business.social_media ?? {};
  const wa = waLink(business.phone);
  const mapsQuery = business.address ? encodeURIComponent(business.address) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* ============ Hero ============ */}
      <header className="border-b bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-semibold sm:text-4xl">{business.business_name ?? "UMKM"}</h1>
          {business.description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">{business.description}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {wa && (
              <Button asChild>
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <Phone className="mr-1.5 h-4 w-4" /> Hubungi via WhatsApp
                </a>
              </Button>
            )}
            {sm.instagram && (
              <Button asChild variant="outline">
                <a href={`https://instagram.com/${sm.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
                  <Instagram className="mr-1.5 h-4 w-4" /> Instagram
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10">
        {/* ============ Info singkat ============ */}
        <section className="grid gap-3 sm:grid-cols-3">
          {business.operating_hours && (
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="flex items-start gap-3 p-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Jam Operasional</p>
                  <p className="text-sm text-muted-foreground">{business.operating_hours}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {business.address && (
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="flex items-start gap-3 p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Lokasi</p>
                  <p className="text-sm text-muted-foreground">{business.address}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {business.phone && (
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="flex items-start gap-3 p-4">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Kontak</p>
                  <p className="text-sm text-muted-foreground">{business.phone}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ============ Katalog Produk ============ */}
        {products.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Produk & Layanan</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <Card key={p.id} className="overflow-hidden shadow-[var(--shadow-card)]">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="grid h-40 w-full place-items-center bg-muted text-muted-foreground">
                      <ImageOff className="h-8 w-8" />
                    </div>
                  )}
                  <CardContent className="space-y-1.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium">{p.name}</h3>
                      {p.category && <Badge variant="secondary" className="shrink-0 text-xs">{p.category}</Badge>}
                    </div>
                    <p className="text-sm font-semibold text-primary">{formatPrice(p.price)}</p>
                    {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ============ Lokasi ============ */}
        {mapsQuery && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Lokasi</h2>
            <div className="overflow-hidden rounded-2xl border shadow-[var(--shadow-card)]">
              <iframe
                title="Lokasi usaha di Google Maps"
                width="100%"
                height="320"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps?q=${mapsQuery}&output=embed`}
              />
            </div>
          </section>
        )}

        {/* ============ Form Kontak ============ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Hubungi Kami</h2>
          <ContactForm businessUserId={business.user_id} />
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Didukung oleh UMKM AI
      </footer>
    </div>
  );
}

function ContactForm({ businessUserId }: { businessUserId: string }) {
  const submit = useServerFn(submitContactMessage);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !message.trim()) {
      toast.error("Mohon lengkapi semua field");
      return;
    }
    setSending(true);
    try {
      await submit({ data: { businessUserId, name, contact, message } });
      setSent(true);
      setName("");
      setContact("");
      setMessage("");
      toast.success("Pesan terkirim, terima kasih!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Terima kasih, pesan Anda sudah kami terima. Kami akan menghubungi Anda secepatnya.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact">No. WhatsApp / Email</Label>
            <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="message">Pesan</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={sending}>
              <Send className="mr-1.5 h-4 w-4" /> {sending ? "Mengirim…" : "Kirim Pesan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}