/**
 * AI Service Abstraction
 * --------------------------------------------------------------
 * Single entry-point for generating AI replies. The implementation
 * currently uses Lovable AI Gateway, but the public surface
 * (`generateAiReply`) is provider-agnostic so the underlying
 * model/provider can be swapped (Groq, OpenAI, Gemini, Claude…)
 * without changing any business logic or UI code.
 */
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const FALLBACK_REPLY =
  "Maaf, saya akan menghubungkan Anda ke admin.";

export interface KnowledgeEntry {
  question: string;
  answer: string;
  category?: string | null;
}

export interface BusinessContext {
  business_name?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  operating_hours?: string | null;
  website?: string | null;
}

export interface AiTurn {
  role: "customer" | "assistant";
  content: string;
}

export interface GenerateReplyInput {
  business: BusinessContext | null;
  knowledge: KnowledgeEntry[];
  history: AiTurn[];
  customerMessage: string;
}

function buildSystemPrompt(input: GenerateReplyInput): string {
  const { business, knowledge } = input;
  const biz = business
    ? `Nama bisnis: ${business.business_name ?? "-"}
Deskripsi: ${business.description ?? "-"}
Alamat: ${business.address ?? "-"}
Telepon: ${business.phone ?? "-"}
Jam operasional: ${business.operating_hours ?? "-"}
Website: ${business.website ?? "-"}`
    : "Belum ada informasi bisnis.";

  const kb = knowledge.length
    ? knowledge
        .map(
          (k, i) =>
            `(${i + 1}) [${k.category ?? "Umum"}] T: ${k.question}\n    J: ${k.answer}`,
        )
        .join("\n")
    : "Belum ada knowledge base.";

  return `Anda adalah asisten AI customer service untuk UMKM (usaha kecil menengah) Indonesia.
Selalu balas dalam Bahasa Indonesia yang ramah, singkat, dan profesional.

=== Informasi Bisnis ===
${biz}

=== Knowledge Base (FAQ) ===
${kb}

=== Aturan ===
1. Gunakan HANYA informasi dari Knowledge Base dan Informasi Bisnis di atas.
2. Jika pertanyaan pelanggan tidak dapat dijawab dengan informasi tersebut, balas TEPAT seperti ini tanpa tambahan apapun:
"${FALLBACK_REPLY}"
3. Jangan mengarang fakta, harga, atau kebijakan.
4. Balas singkat dan jelas (maks ~3 kalimat) kecuali pelanggan minta detail.`;
}

/**
 * Generate an assistant reply given the business context, knowledge base,
 * conversation history and the latest customer message.
 */
export async function generateAiReply(
  input: GenerateReplyInput,
): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-3-flash-preview");

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
    const reply = text.trim();
    return reply.length > 0 ? reply : FALLBACK_REPLY;
  } catch (err) {
    console.error("AI generation failed", err);
    return FALLBACK_REPLY;
  }
}