import { generateText } from "ai";
import { createGroqProvider } from "./ai-gateway.server";

export const FALLBACK_REPLY =
  "Maaf, saya akan menghubungkan Anda ke admin.";

export interface KnowledgeEntry {
  question: string;
  answer: string;
  category?: string | null;
}

export interface ProductEntry {
  name: string;
  description?: string | null;
  price?: number | null;
  category?: string | null;
  is_available?: boolean;
}

export interface PaymentMethods {
  qris?: boolean;
  bank_transfer?: boolean;
  bank_account?: string | null;
  cod?: boolean;
}

export interface FulfillmentMethods {
  delivery?: boolean;
  delivery_note?: string | null;
  pickup?: boolean;
  pickup_note?: string | null;
}

export interface BusinessContext {
  business_name?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  operating_hours?: string | null;
  website?: string | null;
  social_media?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
  } | null;
  payment_methods?: PaymentMethods | null;
  fulfillment_methods?: FulfillmentMethods | null;
}

export interface AiTurn {
  role: "customer" | "assistant";
  content: string;
}

export interface GenerateReplyInput {
  business: BusinessContext | null;
  knowledge: KnowledgeEntry[];
  products: ProductEntry[];
  history: AiTurn[];
  customerMessage: string;
}

function formatPrice(price?: number | null): string {
  if (price === null || price === undefined) return "Harga belum ditentukan";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
}

function buildSystemPrompt(input: GenerateReplyInput): string {
  const { business, knowledge, products } = input;

  const sm = business?.social_media ?? {};
  const socialLines: string[] = [];
  if (sm.instagram) socialLines.push(`Instagram: ${sm.instagram}`);
  if (sm.facebook) socialLines.push(`Facebook: ${sm.facebook}`);
  if (sm.tiktok) socialLines.push(`TikTok: ${sm.tiktok}`);
  const social = socialLines.length ? socialLines.join("\n") : "-";

  const pm = business?.payment_methods ?? {};
  const paymentLines: string[] = [];
  if (pm.qris) paymentLines.push("QRIS (kirim gambar/info QRIS jika pelanggan minta bayar via QRIS)");
  if (pm.bank_transfer) paymentLines.push(`Transfer Bank${pm.bank_account ? `: ${pm.bank_account}` : ""}`);
  if (pm.cod) paymentLines.push("Bayar di Tempat (COD)");
  const payment = paymentLines.length ? paymentLines.join("\n") : "Belum ada metode pembayaran yang diatur.";

  const fm = business?.fulfillment_methods ?? {};
  const fulfillmentLines: string[] = [];
  if (fm.delivery) fulfillmentLines.push(`Diantar (Delivery)${fm.delivery_note ? `: ${fm.delivery_note}` : ""}`);
  if (fm.pickup) fulfillmentLines.push(`Ambil Sendiri (Pickup)${fm.pickup_note ? `: ${fm.pickup_note}` : ""}`);
  const fulfillment = fulfillmentLines.length ? fulfillmentLines.join("\n") : "Belum ada metode pengambilan yang diatur.";

  const biz = business
    ? `Nama bisnis: ${business.business_name ?? "-"}
Deskripsi: ${business.description ?? "-"}
Alamat: ${business.address ?? "-"}
Telepon: ${business.phone ?? "-"}
Jam operasional: ${business.operating_hours ?? "-"}
Website: ${business.website ?? "-"}
Media Sosial:
${social}`
    : "Belum ada informasi bisnis.";

  const kb = knowledge.length
    ? knowledge
        .map(
          (k, i) =>
            `(${i + 1}) [${k.category ?? "Umum"}] T: ${k.question}\n    J: ${k.answer}`,
        )
        .join("\n")
    : "Belum ada knowledge base.";

  const productList = products.length
    ? products
        .filter((p) => p.is_available !== false)
        .map((p, i) => {
          const parts = [`(${i + 1}) ${p.name}`];
          parts.push(`Harga: ${formatPrice(p.price)}`);
          if (p.category) parts.push(`Kategori: ${p.category}`);
          if (p.description) parts.push(`Deskripsi: ${p.description}`);
          return parts.join(" | ");
        })
        .join("\n")
    : "Belum ada data produk.";

  return `Anda adalah asisten AI customer service untuk UMKM (usaha kecil menengah) Indonesia.
Selalu balas dalam Bahasa Indonesia yang ramah, singkat, dan profesional.

=== Informasi Bisnis ===
${biz}

=== Daftar Produk ===
${productList}

=== Metode Pembayaran ===
${payment}

=== Metode Pengiriman/Pengambilan ===
${fulfillment}

=== Knowledge Base (FAQ) ===
${kb}

=== Aturan ===
1. Gunakan HANYA informasi dari Daftar Produk, Knowledge Base, dan Informasi Bisnis (termasuk Media Sosial, Metode Pembayaran, Metode Pengiriman/Pengambilan) di atas.
2. Jika pelanggan bertanya soal produk (nama, harga, kategori, deskripsi), jawab berdasarkan Daftar Produk di atas.
3. Jika pelanggan bertanya soal media sosial (Instagram, Facebook, TikTok), jawab berdasarkan bagian Media Sosial di atas.
4. Jika pelanggan ingin memesan/membeli dan sudah sepakat dengan harga, konfirmasi pesanan secara ringkas, lalu sebutkan metode pembayaran yang tersedia (dari Metode Pembayaran di atas) dan metode pengiriman/pengambilan yang tersedia (dari Metode Pengiriman/Pengambilan di atas).
5. Jika pertanyaan pelanggan tidak dapat dijawab dengan informasi tersebut, balas TEPAT seperti ini tanpa tambahan apapun:
"${FALLBACK_REPLY}"
6. Jangan mengarang fakta, harga, atau kebijakan.
7. Balas singkat dan jelas (maks ~3 kalimat) kecuali pelanggan minta detail.
8. KHUSUS QRIS: jika QRIS tersedia (lihat Metode Pembayaran) DAN pelanggan ingin/menyetujui membayar via QRIS (mis. "pakai qris", "qris nya mana", "ya saya bayar qris"), akhiri balasan Anda dengan menambahkan baris baru berisi TEPAT teks ini di posisi paling akhir:
[SEND_QRIS]
Tulis balasan normal terlebih dahulu (mis. "Baik, berikut QRIS untuk pembayarannya ya."), lalu tambahkan baris [SEND_QRIS] di akhir. Jangan gunakan [SEND_QRIS] untuk kasus lain.`;
}

export interface AiReplyResult {
  text: string;
  sendQrisImage: boolean;
}

const SEND_QRIS_TOKEN = "[SEND_QRIS]";

export async function generateAiReply(
  input: GenerateReplyInput,
): Promise<AiReplyResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY");

  const gateway = createGroqProvider(key);
  const model = gateway("llama-3.3-70b-versatile");

  const messages = [
    { role: "system" as const, content: buildSystemPrompt(input) },
    ...input.history.map((m) => ({
      role: m.role === "customer" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user" as const, content: input.customerMessage },
  ];

  try {
    const { text } = await generateText({ model, messages });
    let reply = text.trim();
    let sendQrisImage = false;

    if (reply.includes(SEND_QRIS_TOKEN)) {
      sendQrisImage = true;
      reply = reply.split(SEND_QRIS_TOKEN).join("").trim();
    }

    if (reply.length === 0) {
      return { text: FALLBACK_REPLY, sendQrisImage: false };
    }
    return { text: reply, sendQrisImage };
  } catch (err) {
    console.error("AI generation failed", err);
    return { text: FALLBACK_REPLY, sendQrisImage: false };
  }
}