import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden: solo amministratore");
}

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    endpoint: z.string().url(),
    p256dh: z.string(),
    auth: z.string(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert({
      user_id: context.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
    }, { onConflict: "endpoint" });
    if (error) throw error;
    return { ok: true };
  });

export const submitMonthHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(d))
  .handler(async ({ context, data }) => {
    const supa = context.supabase;
    const { data: profile } = await supa.from("profiles").select("contractor_id").eq("id", context.userId).maybeSingle();
    const contractorId = profile?.contractor_id;
    if (!contractorId) throw new Error("Account non collegato a nessun operaio");

    const [y, mo] = data.month.split("-").map(Number);
    const start = new Date(y, mo - 1, 1).toISOString().slice(0, 10);
    const end = new Date(y, mo, 1).toISOString().slice(0, 10);

    const { error } = await supa.from("logged_hours")
      .update({ submitted: true, submitted_at: new Date().toISOString() })
      .eq("contractor_id", contractorId).eq("submitted", false)
      .gte("date", start).lt("date", end);
    if (error) throw error;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: contractor } = await supabaseAdmin.from("contractors").select("name").eq("id", contractorId).maybeSingle();
    const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("*");

    let notified = 0;
    if (subs?.length) {
      const webpush = (await import("web-push")).default;
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT!,
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
      );
      const payload = JSON.stringify({
        title: "Nuove ore inviate",
        body: `${contractor?.name ?? "Un operaio"} ha inviato ore per approvazione`,
        url: "/contractors",
      });
      await Promise.all(subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          notified++;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }));
    }

    return { ok: true, notified };
  });
