import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LineItemSchema = z.object({
  item_description: z.string().min(1),
  manufacturer_code: z.string().optional().nullable(),
  technical_spec: z.string().optional().nullable(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
});

export const parseBollaFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    wholesaler_id: z.string().uuid(),
    filename: z.string(),
    base64: z.string(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: w } = await context.supabase.from("wholesalers").select("system_type").eq("id", data.wholesaler_id).maybeSingle();
    const systemType = w?.system_type ?? "generic";
    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const { parseBolla } = await import("./parsers");
    const items = await parseBolla(systemType, bin.buffer, data.filename);
    return { items, system_type: systemType };
  });

export const savePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    wholesaler_id: z.string().uuid(),
    job_id: z.string().uuid().nullable().optional(),
    bolla_number: z.string().optional().nullable(),
    purchase_date: z.string(),
    items: z.array(LineItemSchema),
    raw_file_url: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: p, error } = await context.supabase.from("purchases").insert({
      wholesaler_id: data.wholesaler_id,
      job_id: data.job_id ?? null,
      bolla_number: data.bolla_number ?? null,
      purchase_date: data.purchase_date,
      raw_file_url: data.raw_file_url ?? null,
    }).select("id").single();
    if (error) throw error;
    if (data.items.length) {
      const { error: e2 } = await context.supabase.from("purchase_line_items").insert(
        data.items.map((it) => ({ ...it, purchase_id: p.id })),
      );
      if (e2) throw e2;
    }
    return { id: p.id };
  });