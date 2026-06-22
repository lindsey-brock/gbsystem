import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createDicoFromJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const supa = context.supabase;
    const [{ data: job }, { data: company }] = await Promise.all([
      supa.from("jobs").select("*, clients(*)").eq("id", data.job_id).single(),
      supa.from("company_settings").select("*").limit(1).maybeSingle(),
    ]);
    if (!job) throw new Error("Lavoro non trovato");
    const { data: dico, error } = await supa.from("dico_drafts").insert({
      job_id: data.job_id,
      installer_company_name: company?.company_name ?? null,
      installer_legal_rep_name: company?.legal_rep_name ?? null,
      responsabile_tecnico_name: company?.responsabile_tecnico_name ?? null,
      responsabile_tecnico_qualification: company?.responsabile_tecnico_qualification ?? null,
      client_name: job.clients?.name ?? null,
      client_address: job.clients?.address ?? null,
      materials_report_generated: true,
    }).select("id").single();
    if (error) throw error;
    return { id: dico.id };
  });

export const generateDicoPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ dico_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const supa = context.supabase;
    const { data: dico } = await supa.from("dico_drafts").select("*, jobs(job_name)").eq("id", data.dico_id).single();
    if (!dico) throw new Error("Bozza non trovata");
    const { data: purchases } = await supa.from("purchases").select("purchase_line_items(item_description, manufacturer_code, quantity)").eq("job_id", dico.job_id);
    const materials = (purchases ?? []).flatMap((p: any) =>
      (p.purchase_line_items ?? []).map((li: any) => ({
        description: li.item_description,
        manufacturer_code: li.manufacturer_code,
        quantity: parseFloat(li.quantity),
      })),
    );
    const { buildDicoPdf } = await import("./pdf/dico-pdf");
    const pdf = await buildDicoPdf({ dico, job: dico.jobs, materials });
    const path = `${context.userId}/${data.dico_id}.pdf`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("dico").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    const { data: signed } = await supabaseAdmin.storage.from("dico").createSignedUrl(path, 3600);
    await supa.from("dico_drafts").update({ pdf_url: signed?.signedUrl ?? null }).eq("id", data.dico_id);
    return { url: signed?.signedUrl ?? null, base64: btoa(String.fromCharCode(...pdf)) };
  });