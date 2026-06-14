import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ContactInput = z.object({
  businessUserId: z.string().uuid(),
  name: z.string().trim().min(1, "Nama wajib diisi").max(120),
  contact: z.string().trim().min(1, "Kontak wajib diisi").max(120),
  message: z.string().trim().min(1, "Pesan wajib diisi").max(2000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ContactInput.parse(input))
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase env not configured");
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase.from("contact_messages").insert({
      user_id: data.businessUserId,
      name: data.name,
      contact: data.contact,
      message: data.message,
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });