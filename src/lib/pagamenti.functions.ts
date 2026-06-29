import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: solo amministratore");
}

export const generatePagamentiForMonth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const supa = context.supabase;
    const mese = `${data.month}-01`;
    const [y, mo] = data.month.split("-").map(Number);
    const nextMonth = new Date(y, mo, 1).toISOString().slice(0, 10);

    const { data: hours, error } = await supa.from("logged_hours")
      .select("hours, contractor_id, job_id, contractors(hourly_rate)")
      .eq("approved", true)
      .gte("date", mese)
      .lt("date", nextMonth);
    if (error) throw error;

    const groups = new Map<string, { contractor_id: string; job_id: string | null; hours: number; rate: number }>();
    for (const h of hours ?? []) {
      const key = `${h.contractor_id}|${h.job_id ?? "none"}`;
      const rate = parseFloat((h.contractors as any)?.hourly_rate ?? 0);
      const existing = groups.get(key);
      if (existing) existing.hours += parseFloat(h.hours as any);
      else groups.set(key, { contractor_id: h.contractor_id, job_id: h.job_id, hours: parseFloat(h.hours as any), rate });
    }

    let created = 0;
    let skipped = 0;
    for (const g of groups.values()) {
      let existsQuery = supa.from("pagamenti_operai").select("id", { count: "exact", head: true })
        .eq("contractor_id", g.contractor_id).eq("mese", mese);
      existsQuery = g.job_id ? existsQuery.eq("job_id", g.job_id) : existsQuery.is("job_id", null);
      const { count } = await existsQuery;
      if ((count ?? 0) > 0) { skipped++; continue; }
      const { error: insErr } = await supa.from("pagamenti_operai").insert({
        contractor_id: g.contractor_id,
        job_id: g.job_id,
        mese,
        ore_approvate: +g.hours.toFixed(2),
        importo_dovuto: +(g.hours * g.rate).toFixed(2),
        status: "da_pagare",
      });
      if (insErr) throw insErr;
      created++;
    }

    return { created, skipped };
  });
