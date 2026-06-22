import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { itDate, itMonth, ymdMonth } from "@/lib/format";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ore/storico")({ component: Storico });

function Storico() {
  const { contractorId } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState(ymdMonth(new Date()));
  const [y, mo] = month.split("-").map(Number);
  const start = new Date(y, mo - 1, 1).toISOString().slice(0, 10);
  const end = new Date(y, mo, 1).toISOString().slice(0, 10);
  const { data } = useQuery({
    queryKey: ["my-hours", contractorId, month],
    enabled: !!contractorId,
    queryFn: async () => (await supabase.from("logged_hours").select("*, jobs(job_name, clients(name))").eq("contractor_id", contractorId!).gte("date", start).lt("date", end).order("date", { ascending: false })).data ?? [],
  });
  const total = (data ?? []).reduce((s: number, h: any) => s + Number(h.hours), 0);
  const submitMonth = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("logged_hours").update({ submitted: true, submitted_at: new Date().toISOString() }).eq("contractor_id", contractorId!).eq("submitted", false).gte("date", start).lt("date", end);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ore inviate per approvazione"); qc.invalidateQueries({ queryKey: ["my-hours"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("logged_hours").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-hours"] }),
  });
  const anyUnsubmitted = (data ?? []).some((h: any) => !h.submitted);
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Storico ore" description={`${itMonth(`${month}-01`)} · ${total.toFixed(1)} ore`}
        actions={<Button disabled={!anyUnsubmitted || submitMonth.isPending} onClick={() => submitMonth.mutate()}>Invia il mese</Button>} />
      <div className="mb-4 flex gap-2">
        <input type="month" className="border rounded px-3 py-1.5 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <Card className="divide-y">
        {(data ?? []).map((h: any) => (
          <div key={h.id} className="flex justify-between p-4 text-sm">
            <div>
              <div className="font-medium">{itDate(h.date)} · {h.hours} h</div>
              <div className="text-xs text-muted-foreground">
                {h.client_missing_flag ? <span className="text-amber-600">⚠ Cliente mancante: {h.client_missing_note}</span> : (h.jobs?.job_name ?? "—")} · {h.description ?? ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">{h.approved ? "✓ Approvata" : h.submitted ? "Inviata" : "Bozza"}</span>
              {!h.submitted && <Button size="icon" variant="ghost" onClick={() => del.mutate(h.id)}><Trash2 className="size-4" /></Button>}
            </div>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground p-6 text-center">Nessuna registrazione in questo mese.</p>}
      </Card>
    </div>
  );
}