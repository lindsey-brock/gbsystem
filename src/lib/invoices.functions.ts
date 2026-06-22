import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const previewInvoiceForJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const supa = context.supabase;
    const [{ data: hours }, { data: purchases }, { data: job }] = await Promise.all([
      supa.from("logged_hours").select("id, hours, contractor_id, contractors(name, hourly_rate)")
        .eq("job_id", data.job_id).eq("approved", true),
      supa.from("purchases").select("id, purchase_line_items(id, item_description, quantity, unit_price, total_price)").eq("job_id", data.job_id),
      supa.from("jobs").select("id, job_name, client_id, clients(name, address, partita_iva, codice_fiscale)").eq("id", data.job_id).single(),
    ]);
    const labor = (hours ?? []).map((h: any) => ({
      id: h.id,
      contractor: h.contractors?.name ?? "",
      hours: parseFloat(h.hours),
      rate: parseFloat(h.contractors?.hourly_rate ?? 0),
      amount: parseFloat(h.hours) * parseFloat(h.contractors?.hourly_rate ?? 0),
    }));
    const materials = (purchases ?? []).flatMap((p: any) =>
      (p.purchase_line_items ?? []).map((li: any) => ({
        id: li.id,
        description: li.item_description,
        quantity: parseFloat(li.quantity),
        unit_price: parseFloat(li.unit_price),
        total: parseFloat(li.total_price),
      })),
    );
    return {
      job,
      labor,
      materials,
      labor_total: +labor.reduce((s, l) => s + l.amount, 0).toFixed(2),
      materials_total: +materials.reduce((s, m) => s + m.total, 0).toFixed(2),
    };
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    job_id: z.string().uuid(),
    markup_percentage: z.number().min(0).max(500),
    invoice_number: z.string().optional().nullable(),
    invoice_date: z.string().optional(),
    notes: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const supa = context.supabase;
    const [{ data: hours }, { data: purchases }, { data: job }] = await Promise.all([
      supa.from("logged_hours").select("id, hours, contractor_id, contractors(hourly_rate)").eq("job_id", data.job_id).eq("approved", true),
      supa.from("purchases").select("id, purchase_line_items(id, total_price)").eq("job_id", data.job_id),
      supa.from("jobs").select("client_id").eq("id", data.job_id).single(),
    ]);
    const labor_total = +(hours ?? []).reduce((s: number, h: any) => s + parseFloat(h.hours) * parseFloat(h.contractors?.hourly_rate ?? 0), 0).toFixed(2);
    const materialItems = (purchases ?? []).flatMap((p: any) => p.purchase_line_items ?? []);
    const materials_total = +materialItems.reduce((s: number, m: any) => s + parseFloat(m.total_price), 0).toFixed(2);
    const markup_total = +((materials_total * data.markup_percentage) / 100).toFixed(2);
    const grand_total = +(labor_total + materials_total + markup_total).toFixed(2);
    const { data: inv, error } = await supa.from("invoices").insert({
      client_id: job!.client_id,
      job_id: data.job_id,
      invoice_number: data.invoice_number ?? null,
      invoice_date: data.invoice_date ?? new Date().toISOString().slice(0, 10),
      labor_total,
      materials_total,
      markup_percentage: data.markup_percentage,
      markup_total,
      grand_total,
      notes: data.notes ?? null,
      status: "draft",
    }).select("id").single();
    if (error) throw error;
    const sources = [
      ...(hours ?? []).map((h: any) => ({
        invoice_id: inv.id, source_type: "logged_hours", source_id: h.id,
        amount: parseFloat(h.hours) * parseFloat(h.contractors?.hourly_rate ?? 0),
      })),
      ...materialItems.map((m: any) => ({
        invoice_id: inv.id, source_type: "purchase_line_item", source_id: m.id, amount: parseFloat(m.total_price),
      })),
    ];
    if (sources.length) await supa.from("invoice_line_sources").insert(sources);
    await supa.from("jobs").update({ status: "invoiced" }).eq("id", data.job_id);
    return { id: inv.id };
  });

export const generateInvoicePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ invoice_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const supa = context.supabase;
    const [{ data: inv }, { data: company }] = await Promise.all([
      supa.from("invoices").select("*, clients(*), jobs(*), invoice_line_sources(*)").eq("id", data.invoice_id).single(),
      supa.from("company_settings").select("*").limit(1).maybeSingle(),
    ]);
    if (!inv) throw new Error("Fattura non trovata");
    // Reconstruct line lists
    const hourIds = inv.invoice_line_sources.filter((s: any) => s.source_type === "logged_hours").map((s: any) => s.source_id);
    const matIds = inv.invoice_line_sources.filter((s: any) => s.source_type === "purchase_line_item").map((s: any) => s.source_id);
    const [{ data: hours }, { data: mats }] = await Promise.all([
      hourIds.length ? supa.from("logged_hours").select("id, hours, contractors(name, hourly_rate)").in("id", hourIds) : Promise.resolve({ data: [] as any[] }),
      matIds.length ? supa.from("purchase_line_items").select("*").in("id", matIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const { buildInvoicePdf } = await import("./pdf/invoice-pdf");
    const pdf = await buildInvoicePdf({
      company: company ?? {},
      client: inv.clients,
      job: inv.jobs,
      invoice: {
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        labor_total: Number(inv.labor_total),
        materials_total: Number(inv.materials_total),
        markup_percentage: Number(inv.markup_percentage),
        markup_total: Number(inv.markup_total),
        grand_total: Number(inv.grand_total),
        notes: inv.notes,
      },
      laborLines: (hours ?? []).map((h: any) => ({
        contractor: h.contractors?.name ?? "",
        hours: parseFloat(h.hours),
        rate: parseFloat(h.contractors?.hourly_rate ?? 0),
        amount: parseFloat(h.hours) * parseFloat(h.contractors?.hourly_rate ?? 0),
      })),
      materialLines: (mats ?? []).map((m: any) => ({
        description: m.item_description,
        quantity: parseFloat(m.quantity),
        unit_price: parseFloat(m.unit_price),
        total: parseFloat(m.total_price),
      })),
    });
    const path = `${context.userId}/${data.invoice_id}.pdf`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    const { data: signed } = await supabaseAdmin.storage.from("invoices").createSignedUrl(path, 3600);
    await supa.from("invoices").update({ pdf_url: signed?.signedUrl ?? null }).eq("id", data.invoice_id);
    return { url: signed?.signedUrl ?? null, base64: btoa(String.fromCharCode(...pdf)) };
  });