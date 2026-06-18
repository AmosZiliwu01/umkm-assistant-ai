import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  MapPin, Phone, Clock, Instagram, Facebook, ImageOff, Send,
  Star, ShieldCheck, Truck, Smile, MessageCircle, Check,
  ShoppingCart, Plus, Minus, X, Trash2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { submitContactMessage } from "@/lib/contact.functions";
import { getThemeColor } from "@/lib/landing-themes";
import type { LandingData, LandingProduct } from "@/lib/landing";

function formatPrice(price: number | null) {
  if (price === null) return "Hubungi kami";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
}

function waLink(phone: string | null, text?: string) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  const base = `https://wa.me/${normalized}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

function initials(name: string | null) {
  if (!name) return "U";
  return name.trim().slice(0, 2).toUpperCase();
}

/* ============================================================
 * Cart — local session state, no DB persistence. Building toward
 * a future "checkout via WhatsApp" flow (sends a formatted order
 * summary message, doesn't process real payment).
 * ============================================================ */
interface CartItem {
  product: LandingProduct;
  qty: number;
}

function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  function add(product: LandingProduct) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.product.id !== productId);
      return prev.map((i) => (i.product.id === productId ? { ...i, qty } : i));
    });
  }

  function remove(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function clear() {
    setItems([]);
  }

  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + (i.product.price ?? 0) * i.qty, 0);

  return { items, add, updateQty, remove, clear, totalQty, totalPrice };
}

function buildOrderMessage(businessName: string | null, items: CartItem[], total: number) {
  const lines = items.map(
    (i) => `- ${i.product.name} x${i.qty} = ${formatPrice((i.product.price ?? 0) * i.qty)}`,
  );
  return [
    `Halo ${businessName ?? ""}, saya ingin memesan:`,
    ...lines,
    "",
    `Total: ${formatPrice(total)}`,
    "",
    "Mohon info ketersediaan dan langkah selanjutnya. Terima kasih.",
  ].join("\n");
}

export function StandardLandingTemplate({ data }: { data: LandingData }) {
  const { business, products, gallery } = data;
  const sm = (business.social_media ?? {}) as {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  const wa = waLink(business.phone);
  const theme = getThemeColor(business.theme_color);
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  const hasCoords = business.latitude !== null && business.longitude !== null;
  const mapSrc = hasCoords
    ? `https://www.google.com/maps?q=${business.latitude},${business.longitude}&hl=id&z=15&output=embed`
    : business.address
      ? `https://www.google.com/maps?q=${encodeURIComponent(business.address)}&hl=id&output=embed`
      : null;

  function checkoutViaWhatsapp() {
    if (cart.items.length === 0) return;
    const message = buildOrderMessage(business.business_name, cart.items, cart.totalPrice);
    const link = waLink(business.phone, message);
    if (!link) {
      toast.error("Nomor WhatsApp belum tersedia untuk UMKM ini");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        "--primary": theme.primary,
        "--primary-foreground": theme.primaryFg,
        "--ring": theme.ring,
      } as React.CSSProperties}
    >
      <Navbar business={business} wa={wa} sm={sm} hasProducts={products.length > 0} hasGallery={gallery.length > 0} />
      <Hero business={business} products={products} wa={wa} sm={sm} theme={theme} />

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:space-y-20 sm:py-20">
        {products.length > 0 && <ProductsSection products={products} onAddToCart={cart.add} />}
        {business.promo_text && <PromoBanner text={business.promo_text} />}
        <AboutSection business={business} wa={wa} gallery={gallery} />
        <InfoStripSection business={business} mapSrc={mapSrc} wa={wa} sm={sm} />
        <ContactSection business={business} sm={sm} theme={theme} />
      </main>

      <Footer business={business} wa={wa} sm={sm} theme={theme} />

      {products.length > 0 && (
        <CartWidget
          cart={cart}
          open={cartOpen}
          onOpenChange={setCartOpen}
          onCheckout={checkoutViaWhatsapp}
        />
      )}
    </div>
  );
}

/* ============================================================
 * Navbar
 * ============================================================ */
function Navbar({
  business, wa, sm, hasProducts, hasGallery,
}: {
  business: LandingData["business"];
  wa: string | null;
  sm: { instagram?: string };
  hasProducts: boolean;
  hasGallery: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <a href="#beranda" className="flex items-center gap-2.5 font-semibold">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.business_name ?? "Logo"} className="h-9 w-9 rounded-full border object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials(business.business_name)}
            </span>
          )}
          <span className="truncate text-sm">{business.business_name ?? "UMKM"}</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
          <a href="#beranda" className="transition-colors hover:text-foreground">Beranda</a>
          {hasProducts && <a href="#produk" className="transition-colors hover:text-foreground">Produk</a>}
          <a href="#tentang" className="transition-colors hover:text-foreground">Tentang Kami</a>
          {hasGallery && <a href="#tentang" className="transition-colors hover:text-foreground">Galeri</a>}
          <a href="#lokasi" className="transition-colors hover:text-foreground">Lokasi</a>
          <a href="#kontak" className="transition-colors hover:text-foreground">Hubungi Kami</a>
        </nav>

        <div className="flex items-center gap-2">
          {wa && (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <Phone className="mr-1.5 h-4 w-4" /> WhatsApp
              </a>
            </Button>
          )}
          {sm.instagram && (
            <Button asChild size="icon" variant="outline" className="shrink-0">
              <a href={`https://instagram.com/${sm.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

/* ============================================================
 * Hero — left-aligned text, feature pills, single big info card,
 * asymmetric blob-shaped cover image, static "thank you" plaque
 * ============================================================ */
function Hero({
  business, products, wa, sm, theme,
}: {
  business: LandingData["business"];
  products: LandingProduct[];
  wa: string | null;
  sm: { instagram?: string; tiktok?: string; facebook?: string };
  theme: ReturnType<typeof getThemeColor>;
}) {
  const productImages = products.map((p) => p.image_url).filter((u): u is string => !!u).slice(0, 3);
  const name = business.business_name ?? "UMKM";
  const [firstWord, ...restWords] = name.split(" ");
  const rest = restWords.join(" ");

  const infoItems = [
    business.operating_hours && { icon: Clock, label: "Jam Operasional", value: business.operating_hours },
    business.address && { icon: MapPin, label: "Lokasi", value: business.address },
    business.phone && { icon: Phone, label: "Kontak", value: business.phone },
  ].filter((x): x is { icon: typeof Clock; label: string; value: string } => !!x);

  return (
    <section id="beranda" className="scroll-mt-16 relative overflow-hidden" style={{ background: theme.heroBg }}>
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-primary/5 blur-2xl" />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pt-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <Badge variant="secondary" className="font-normal">UMKM Lokal Terpercaya</Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {rest ? (
                <>
                  {firstWord}{" "}
                  <span className="text-primary">{rest}</span>
                </>
              ) : (
                <span className="text-primary">{firstWord}</span>
              )}
            </h1>
            {business.description && (
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground">{business.description}</p>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              {wa && (
                <Button asChild size="lg" className="font-semibold">
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <Phone className="mr-2 h-4 w-4" /> Hubungi via WhatsApp
                  </a>
                </Button>
              )}
              {sm.instagram && (
                <Button asChild size="lg" variant="outline" className="bg-background/80">
                  <a href={`https://instagram.com/${sm.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
                    <Instagram className="mr-2 h-4 w-4" /> Instagram
                  </a>
                </Button>
              )}
            </div>

            <FeaturePills />
          </div>

          <HeroVisual coverUrl={business.cover_image_url} productImages={productImages} name={business.business_name} />
        </div>

        {infoItems.length > 0 && (
          <div className="relative z-10 mt-10 rounded-2xl border bg-card/95 p-5 shadow-[var(--shadow-card)] backdrop-blur sm:p-6">
            <div className="grid gap-5 sm:grid-cols-3">
              {infoItems.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturePills() {
  const items = [
    { icon: ShieldCheck, label: "Produk Berkualitas" },
    { icon: Truck, label: "Respon Cepat" },
    { icon: Smile, label: "Pelayanan Ramah" },
  ];
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" /> {label}
        </span>
      ))}
    </div>
  );
}

function HeroVisual({ coverUrl, productImages, name }: { coverUrl: string | null; productImages: string[]; name: string | null }) {
  const images = coverUrl ? [coverUrl] : productImages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length]);

  // Organic blob frame drawn as an explicit SVG path (not border-radius),
  // so the silhouette is genuinely irregular on every side rather than a
  // rounded rectangle. clipPathUnits="objectBoundingBox" makes the path
  // scale to whatever size the wrapping div ends up being.
  const clipId = "hero-blob-clip";

  return (
    <div className="relative px-2 pt-2">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d="M0.06,0.18
                     C0.02,0.06 0.16,0 0.30,0
                     L0.82,0
                     C0.94,0 1,0.05 1,0.16
                     L1,0.62
                     C1,0.78 0.95,0.86 0.84,0.90
                     L0.42,0.99
                     C0.28,1.02 0.14,0.97 0.08,0.86
                     L0.01,0.62
                     C-0.02,0.46 0.01,0.30 0.06,0.18 Z" />
          </clipPath>
        </defs>
      </svg>

      {images.length === 0 ? (
        <div
          className="relative aspect-[4/3] overflow-hidden border bg-gradient-to-br from-primary/10 via-card to-card/50 shadow-[var(--shadow-card)]"
          style={{ clipPath: `url(#${clipId})` }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-7xl font-black text-primary/20">{initials(name)}</span>
          </div>
        </div>
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden border shadow-[var(--shadow-card)]" style={{ clipPath: `url(#${clipId})` }}>
          {images.map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt={name ?? "Cover"}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-white" : "w-2 bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Static decorative "thank you" plaque — same for every UMKM, not editable */}
      <div className="absolute -bottom-5 -left-3 z-10 max-w-[210px] -rotate-2 rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-card)] sm:-left-6">
        <p className="text-xs font-semibold leading-snug">
          Terima kasih sudah <span className="text-primary">mendukung UMKM lokal</span> 🙏
        </p>
      </div>
    </div>
  );
}

/* ============================================================
 * Products — left-aligned heading, slim cards, 5/2 column grid,
 * with a "Lihat Semua Produk" expand control
 * ============================================================ */
function ProductsSection({
  products, onAddToCart,
}: {
  products: LandingProduct[];
  onAddToCart: (p: LandingProduct) => void;
}) {
  const PREVIEW_COUNT = 10;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? products : products.slice(0, PREVIEW_COUNT);
  const hasMore = products.length > PREVIEW_COUNT;

  return (
    <section id="produk" className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-primary">
            <Star className="h-4 w-4 fill-primary" /> Produk & Layanan
          </p>
          <h2 className="text-2xl font-bold sm:text-3xl">Pilihan Terbaik untuk Anda</h2>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {showAll ? "Tampilkan Lebih Sedikit" : "Lihat Semua Produk"}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {visible.map((p) => (
          <Card key={p.id} className="overflow-hidden shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="grid aspect-square w-full place-items-center bg-muted text-muted-foreground">
                <ImageOff className="h-7 w-7" />
              </div>
            )}
            <CardContent className="space-y-1.5 p-2.5">
              <h3 className="text-sm font-semibold leading-snug line-clamp-1">{p.name}</h3>
              <p className="text-sm font-bold text-primary">{formatPrice(p.price)}</p>
              <Button size="sm" className="h-7 w-full px-2 text-xs" onClick={() => onAddToCart(p)}>
                <Plus className="mr-1 h-3 w-3" /> Tambah
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
 * Cart widget — floating button + slide-over panel
 * ============================================================ */
function CartWidget({
  cart, open, onOpenChange, onCheckout,
}: {
  cart: ReturnType<typeof useCart>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCheckout: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <ShoppingCart className="h-5 w-5" />
        {cart.totalQty > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-background px-1 text-xs font-bold text-foreground">
            {cart.totalQty}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => onOpenChange(false)}>
          <div
            className="flex h-full w-full max-w-sm flex-col bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-semibold">Keranjang Pesanan</h3>
              <button onClick={() => onOpenChange(false)} className="rounded-full p-1.5 hover:bg-muted" aria-label="Tutup">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Keranjang masih kosong.</p>
              ) : (
                <div className="space-y-3">
                  {cart.items.map(({ product, qty }) => (
                    <div key={product.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-14 w-14 shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-sm text-primary">{formatPrice(product.price)}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            onClick={() => cart.updateQty(product.id, qty - 1)}
                            className="grid h-6 w-6 place-items-center rounded-full border hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm">{qty}</span>
                          <button
                            onClick={() => cart.updateQty(product.id, qty + 1)}
                            className="grid h-6 w-6 place-items-center rounded-full border hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <button onClick={() => cart.remove(product.id)} className="self-start text-muted-foreground hover:text-destructive" aria-label="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="space-y-3 border-t p-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(cart.totalPrice)}</span>
                </div>
                <Button className="w-full font-semibold" size="lg" onClick={onCheckout}>
                  <Phone className="mr-2 h-4 w-4" /> Pesan via WhatsApp
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Pesanan dikirim sebagai pesan WhatsApp ke UMKM, belum termasuk pembayaran online.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
 * Promo banner
 * ============================================================ */
function PromoBanner({ text }: { text: string }) {
  // Try to split off a leading discount-like fragment (e.g. "Diskon 10%",
  // "Gratis Ongkir") so it can render as its own pill, matching the
  // reference's two-part layout. Falls back to showing the full text
  // as a single line if no clear split point is found.
  const parts = text.split(/[•|–-]/).map((s) => s.trim()).filter(Boolean);
  const mainText = parts[0] ?? text;
  const badgeText = parts.length > 1 ? parts.slice(1).join(" • ") : null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-amber-100/80 to-amber-50 p-5 sm:p-6 dark:border-amber-900/40 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-amber-950/40">
      <div className="relative z-10 flex flex-wrap items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-400/25">
          <PromoTagIcon className="h-6 w-6 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Promo Spesial Minggu Ini</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="font-medium text-amber-950/90 dark:text-amber-100">{mainText}</p>
            {badgeText && (
              <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">
                {badgeText}
              </span>
            )}
          </div>
        </div>
        <Truck className="hidden h-14 w-14 shrink-0 text-amber-400/70 sm:block" />
      </div>
    </section>
  );
}

function PromoTagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41 11 3.83a2 2 0 0 0-1.42-.59H4a2 2 0 0 0-2 2v5.58a2 2 0 0 0 .59 1.42l9.58 9.58a2 2 0 0 0 2.82 0l5.58-5.58a2 2 0 0 0 .02-2.83z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ============================================================
 * About — derived from existing data only, standalone card
 * ============================================================ */
function AboutSection({ business, wa, gallery }: { business: LandingData["business"]; wa: string | null; gallery: LandingData["gallery"] }) {
  const points = useMemo(() => [
    "Produk 100% Berkualitas",
    wa ? "Respon Cepat via WhatsApp" : null,
    "Harga Bersahabat",
    "Dukungan Pelanggan Siap Membantu",
  ].filter((x): x is string => !!x), [wa]);

  if (!business.description && points.length === 0) return null;

  return (
    <section id="tentang" className="scroll-mt-20">
      <Card className="overflow-hidden shadow-[var(--shadow-card)]">
        <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2 lg:items-center">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Tentang Kami</p>
            <h2 className="text-xl font-bold sm:text-2xl">Kualitas dan Kepercayaan Adalah Prioritas Kami</h2>
            {business.description && <p className="text-muted-foreground leading-relaxed">{business.description}</p>}
            {points.length > 0 && (
              <ul className="space-y-2">
                {points.map((point) => (
                  <li key={point} className="flex items-center gap-2.5 text-sm">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                    <span className="font-medium">{point}</span>
                  </li>
                ))}
              </ul>
            )}
            <a href="#kontak">
              <Button className="font-semibold">
                Selengkapnya <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </a>
          </div>

          {gallery.length > 0 ? (
            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">Galeri Kegiatan</p>
                <a href="#" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <AboutGalleryPager images={gallery} />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <AboutFallbackPoint icon={ShieldCheck} label="Produk Berkualitas" desc="Dipilih dan disiapkan dengan standar terbaik untuk Anda." />
              {wa && <AboutFallbackPoint icon={MessageCircle} label="Respon Cepat" desc="Hubungi kami langsung via WhatsApp untuk info dan pemesanan." />}
              {business.address && <AboutFallbackPoint icon={MapPin} label="Lokasi Strategis" desc={business.address} />}
              {business.operating_hours && <AboutFallbackPoint icon={Clock} label="Jam Operasional Jelas" desc={business.operating_hours} />}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/**
 * Paged photo grid for the "Tentang Kami" gallery preview — shows
 * up to 4 photos per page with small dot pagination below, matching
 * the reference layout. Visitors can click a dot or swipe/drag to
 * move between pages; no continuous auto-scroll.
 */
function AboutGalleryPager({ images }: { images: LandingData["gallery"] }) {
  const PAGE_SIZE = 4;
  const pages = useMemo(() => {
    const chunks: LandingData["gallery"][] = [];
    for (let i = 0; i < images.length; i += PAGE_SIZE) {
      chunks.push(images.slice(i, i + PAGE_SIZE));
    }
    return chunks;
  }, [images]);

  const [page, setPage] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  function goToPage(index: number) {
    setPage(index);
    const track = trackRef.current;
    if (track) {
      track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
    }
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== page) setPage(index);
  }

  return (
    <div className="min-w-0 space-y-2.5">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex min-w-0 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((pageImages, i) => (
          <div key={i} className="grid w-full shrink-0 grid-cols-4 snap-start gap-1.5 sm:gap-2.5">
            {pageImages.map((img) => (
              <div key={img.id} className="min-w-0 overflow-hidden rounded-lg border sm:rounded-xl">
                <img src={img.image_url} alt={img.caption ?? "Galeri"} className="aspect-square w-full object-cover" draggable={false} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              aria-label={`Halaman galeri ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === page ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AboutFallbackPoint({ icon: Icon, label, desc }: { icon: typeof ShieldCheck; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{desc}</p>
      </div>
    </div>
  );
}

/* ============================================================
 * Location
 * ============================================================ */
function InfoStripSection({
  business, mapSrc, wa, sm,
}: {
  business: LandingData["business"];
  mapSrc: string | null;
  wa: string | null;
  sm: { instagram?: string; facebook?: string; tiktok?: string };
}) {
  const contactRows = [
    wa ? { icon: Phone, label: "WhatsApp", value: business.phone ?? "" } : null,
    sm.instagram ? { icon: Instagram, label: "Instagram", value: sm.instagram } : null,
    sm.facebook ? { icon: Facebook, label: "Facebook", value: sm.facebook } : null,
    sm.tiktok ? { icon: TikTokIcon, label: "TikTok", value: sm.tiktok } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <section id="lokasi" className="scroll-mt-20 space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Informasi Lengkap</p>
        <h2 className="text-2xl font-bold sm:text-3xl">Lokasi, Jam, dan Cara Menghubungi Kami</h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Lokasi Kami */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className="font-semibold">Lokasi Kami</h3>
                {business.address && <p className="text-sm text-muted-foreground">{business.address}</p>}
              </div>
            </div>
            {mapSrc && (
              <div className="overflow-hidden rounded-xl border">
                <iframe
                  title="Lokasi usaha di Google Maps"
                  width="100%"
                  height="140"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={mapSrc}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jam Operasional */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className="font-semibold">Jam Operasional</h3>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {business.operating_hours ?? "Hubungi kami untuk informasi jam operasional."}
            </p>
          </CardContent>
        </Card>

        {/* Hubungi Kami */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start gap-2.5">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className="font-semibold">Hubungi Kami</h3>
              </div>
            </div>
            {contactRows.length > 0 ? (
              <div className="space-y-2">
                {contactRows.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{label}</span>
                    <span className="ml-auto truncate font-medium">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Informasi kontak belum tersedia.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/* ============================================================
 * Contact
 * ============================================================ */
function ContactSection({
  business, sm, theme,
}: {
  business: LandingData["business"];
  sm: { instagram?: string; facebook?: string; tiktok?: string };
  theme: ReturnType<typeof getThemeColor>;
}) {
  const socialLinks = [
    sm.instagram ? { href: `https://instagram.com/${sm.instagram.replace(/^@/, "")}`, icon: Instagram, label: "Instagram", value: sm.instagram, color: "text-pink-600", bg: "bg-pink-500/10" } : null,
    sm.facebook ? { href: `https://facebook.com/${sm.facebook}`, icon: Facebook, label: "Facebook", value: sm.facebook, color: "text-blue-600", bg: "bg-blue-500/10" } : null,
    sm.tiktok
      ? {
          href: `https://tiktok.com/@${sm.tiktok.replace(/^@/, "")}`,
          icon: TikTokIcon,
          label: "TikTok",
          value: sm.tiktok,
          color: "text-foreground",
          bg: "bg-muted",
        }
      : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <section id="kontak" className="scroll-mt-20 space-y-6 rounded-2xl p-6 sm:p-10" style={{ backgroundColor: theme.sectionTint }}>
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Kirim Pesan</p>
        <h2 className="text-2xl font-bold sm:text-3xl">Ada Pertanyaan? Kami Siap Membantu</h2>
        <p className="max-w-xl text-muted-foreground">
          Isi form di bawah, atau hubungi kami langsung melalui media sosial.
        </p>
      </div>

      <div className={socialLinks.length > 0 ? "grid gap-6 lg:grid-cols-[260px_1fr]" : ""}>
        {socialLinks.length > 0 && (
          <div className="flex flex-col gap-3">
            {socialLinks.map(({ href, icon: Icon, label, value, color, bg }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${bg} ${color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="truncate text-sm text-muted-foreground">{value}</p>
                </div>
              </a>
            ))}
          </div>
        )}

        <ContactForm businessUserId={business.user_id} />
      </div>
    </section>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
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
      setName(""); setContact(""); setMessage("");
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
        <CardContent className="grid h-full min-h-[200px] place-items-center p-6 text-center text-sm text-muted-foreground">
          Terima kasih, pesan Anda sudah kami terima. Kami akan menghubungi Anda secepatnya.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">Nama Lengkap</Label>
            <Input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Nama Anda" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cf-contact">No. WhatsApp / Email</Label>
            <Input id="cf-contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder="0812-3456-7890 atau email Anda" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cf-message">Pesan</Label>
            <Textarea id="cf-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Tulis pesan Anda di sini…" required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" disabled={sending} className="font-semibold">
              <Send className="mr-2 h-4 w-4" /> {sending ? "Mengirim…" : "Kirim Pesan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * Footer — dark, theme-tinted, full social icons, prominent top wave
 * ============================================================ */
function Footer({
  business, wa, sm, theme,
}: {
  business: LandingData["business"];
  wa: string | null;
  sm: { instagram?: string; facebook?: string; tiktok?: string };
  theme: ReturnType<typeof getThemeColor>;
}) {
  const socials = [
    wa ? { href: wa, icon: Phone, label: "WhatsApp" } : null,
    sm.instagram ? { href: `https://instagram.com/${sm.instagram.replace(/^@/, "")}`, icon: Instagram, label: "Instagram" } : null,
    sm.facebook ? { href: `https://facebook.com/${sm.facebook}`, icon: Facebook, label: "Facebook" } : null,
    sm.tiktok ? { href: `https://tiktok.com/@${sm.tiktok.replace(/^@/, "")}`, icon: TikTokIcon, label: "TikTok" } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <footer className="relative mt-4" style={{ backgroundColor: theme.footerBg, color: theme.footerFg }}>
      <svg
        className="absolute left-0 right-0 block w-full -translate-y-full text-background"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        style={{ height: 64 }}
      >
        <path fill={theme.footerBg} d="M0,40 C220,90 480,0 720,24 C980,48 1220,84 1440,20 L1440,80 L0,80 Z" />
      </svg>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8">
        <div className="grid gap-10 sm:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 font-semibold">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.business_name ?? "Logo"} className="h-8 w-8 rounded-full border border-white/20 object-cover" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials(business.business_name)}
                </span>
              )}
              <span className="text-sm">{business.business_name ?? "UMKM"}</span>
            </div>
            {business.description && (
              <p className="text-sm opacity-75 line-clamp-3">{business.description}</p>
            )}
            <div className="flex gap-2 pt-1">
              {socials.map(({ href, icon: Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 transition-colors hover:bg-white/10">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <p className="font-semibold">Kontak</p>
            {business.phone && <p className="opacity-75">{business.phone}</p>}
            {business.address && <p className="opacity-75">{business.address}</p>}
          </div>

          {business.operating_hours && (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">Jam Operasional</p>
              <p className="opacity-75">{business.operating_hours}</p>
            </div>
          )}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs opacity-60">
          &copy; {new Date().getFullYear()} {business.business_name ?? "UMKM"}. Didukung oleh UMKM AI.
        </div>
      </div>
    </footer>
  );
}