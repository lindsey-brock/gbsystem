import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState } from "react";
import { itDate, ymdMonth } from "@/lib/format";
import { generatePagamentiForMonth } from "@/lib/pagamenti.functions";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ore/approvazione")({ component: ApprovazionePage });

function ApprovazionePage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [month, setMonth] = useState(ymdMonth(new Date()));
  const [generating, setGenerating] = useState(false);
  const generatePagamenti = useServerFn(generatePagamentiForMonth);
  const { data } = useQuery({
    queryKey: ["pending-hours"],
    queryFn: async () => (await supabase.from("logged_hours").select("*, contractors(name), jobs(job_name)").eq("submitted", true).eq("approved", false).order("date", { ascending: false })).data ?? [],
  });
  const { data: jobs } = useQuery({ queryKey: ["jobs-all"], queryFn: async () => (await supabase.from("jobs").select("id, job_name, clients(name)").order("job_name")).data ?? [] });

  const approve = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("logged_hours").update({ approved: true, approved_at: new Date().toISOString() }).in("id", ids); if (error) throw error;
    },
    onSuccess: () => { toast.success("Ore approvate"); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["pending-hours"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("logged_hours").update({ submitted: false, submitted_at: null }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-hours"] }),
  });
  const reassign = useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const { error } = await supabase.from("logged_hours").update({ job_id: jobId, client_missing_flag: false, client_missing_note: null }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-hours"] }),
  });

  const grouped = (data ?? []).reduce((acc: any, h: any) => {
    const key = h.contractors?.name ?? "—";
    (acc[key] ??= []).push(h); return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Approvazione ore" description={`${data?.length ?? 0} voci in attesa`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {selected.size > 0 && <Button onClick={() => approve.mutate([...selected])}>Approva selezionate ({selected.size})</Button>}
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 h-9" />
            <Button variant="outline" disabled={generating} onClick={async () => {
              setGenerating(true);
              try {
                const r = await generatePagamenti({ data: { month } });
                toast.success(`Pagamenti generati: ${r.created} creati, ${r.skipped} già presenti`);
              } catch (e: any) { toast.error(e.message); }
              finally { setGenerating(false); }
            }}>Genera pagamenti mese</Button>
          </div>
        } />
      {Object.entries(grouped).map(([name, items]: any) => (
        <Card key={name} className="p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">{name}</h2>
            <Button size="sm" variant="outline" onClick={() => approve.mutate((items as any[]).map((i) => i.id))}>Approva tutto ({(items as any[]).length})</Button>
          </div>
          <div className="divide-y">
            {(items as any[]).map((h: any) => (
              <div key={h.id} className="py-3 flex flex-wrap items-start gap-3">
                <Checkbox checked={selected.has(h.id)} onCheckedChange={(v) => {
                  const ns = new Set(selected); v ? ns.add(h.id) : ns.delete(h.id); setSelected(ns);
                }} className="mt-1" />
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm">{itDate(h.date)} · {h.hours}h · {h.description ?? "—"}</div>
                  {h.client_missing_flag ? (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs flex items-start gap-2">
                      <AlertTriangle className="size-4 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-amber-800">Cliente mancante: {h.client_missing_note}</div>
                        <Select onValueChange={(v) => reassign.mutate({ id: h.id, jobId: v })}>
                          <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue placeholder="Assegna a lavoro…" /></SelectTrigger>
                          <SelectContent>{(jobs ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.job_name} — {j.clients?.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">{h.jobs?.job_name ?? "—"}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve.mutate([h.id])}>Approva</Button>
                  <Button size="sm" variant="ghost" onClick={() => reject.mutate(h.id)}>Rifiuta</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
      {!data?.length && <Card className="p-8 text-center text-muted-foreground">Nessuna ora in attesa.</Card>}
    </div>
  );
}