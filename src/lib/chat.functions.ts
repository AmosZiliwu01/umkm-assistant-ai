import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SendInput = z.object({
  conversationId: z.string().uuid().optional(),
  customerName: z.string().trim().min(1).max(80).optional(),
  message: z.string().trim().min(1).max(2000),
});

export const sendCustomerMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Ensure conversation exists
    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          customer_name: data.customerName ?? "Customer",
          status: "ai_active",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = conv.id;
    }

    // 2. Load conversation + check status
    const { data: conversation, error: convErr } = await supabase
      .from("conversations")
      .select("id, status")
      .eq("id", conversationId)
      .single();
    if (convErr || !conversation) throw new Error("Conversation not found");

    // 3. Insert customer message
    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "customer",
      content: data.message,
    });
    if (msgErr) throw new Error(msgErr.message);

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    // 4. If admin handling or closed -> no AI reply
    if (conversation.status !== "ai_active") {
      return { conversationId, aiReply: null as string | null };
    }

    // 5. Load context for AI
    const [{ data: business }, { data: kb }, { data: history }] =
      await Promise.all([
        supabase
          .from("business_settings")
          .select(
            "business_name, description, address, phone, operating_hours, website",
          )
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("knowledge_base")
          .select("question, answer, category")
          .eq("user_id", userId)
          .limit(100),
        supabase
          .from("messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(40),
      ]);

    const { generateAiReply } = await import("./ai-service.server");
    const turns = (history ?? [])
      .filter((m) => m.role === "customer" || m.role === "assistant")
      .slice(0, -1) // exclude the just-inserted message
      .map((m) => ({
        role: m.role as "customer" | "assistant",
        content: m.content,
      }));

    const aiReply = await generateAiReply({
      business: business ?? null,
      knowledge: kb ?? [],
      history: turns,
      customerMessage: data.message,
    });

    // 6. Insert AI reply
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: aiReply,
    });
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { conversationId, aiReply };
  });

const StatusInput = z.object({
  conversationId: z.string().uuid(),
  status: z.enum(["ai_active", "admin_handling", "closed"]),
});

export const updateConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatusInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversations")
      .update({ status: data.status })
      .eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AdminReplyInput = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
});

export const sendAdminReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AdminReplyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role: "admin",
      content: data.message,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", data.conversationId);
    return { ok: true };
  });