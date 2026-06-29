import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { ContractorForm } from "./_authenticated.contractors";
import { eur, itDate } from "@/lib/format";
import { Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contractors/$id")({ component: ContractorDetail });

function ContractorDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const { data } = useQuery({
    queryKey: ["contractor", id],
    queryFn: async () => {
      const [{ data: c }, { data: hours }, { data: jobs }] = await Promise.all([
        supabase.from("contractors").select("*").eq("id", id).maybeSingle(),
        supabase.from("logged_hours").select("*, jobs(job_name)").eq("contractor_id", id).order("date", { ascending: false }).limit(100),
        supabase.from("jobs").select("id, job_name, clients(name)").order("job_name"),
      ]);
      return { c, hours: hours ?? [], jobs: jobs ?? [] };
    },
  });

  const approve = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("logged_hours").update({ approved: true, approved_at: new Date().toISOString() }).in("id", ids); if (error) throw error;
    },
    onSuccess: () => { toast.success("Ore approvate"); qc.invalidateQueries({ queryKey: ["contractor", id] }); qc.invalidateQueries({ queryKey: ["pending-hours-count"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: async (hid: string) => {
      const { error } = await supabase.from("logged_hours").update({ submitted: false, submitted_at: null }).eq("id", hid); if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contractor", id] }); qc.invalidateQueries({ queryKey: ["pending-hours-count"] }); },
  });
  const reassign = useMutation({
    mutationFn: async ({ hid, jobId }: { hid: string; jobId: string }) => {
      const { error } = await supabase.from("logged_hours").update({ job_id: jobId, client_missing_flag: false, client_missing_note: null }).eq("id", hid); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor", id] }),
  });

  if (!data?.c) return <p>Caricamento…</p>;
  const c = data.c;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthHours = data.hours.filter((h: any) => new Date(h.date) >= monthStart).reduce((s: number, h: any) => s + Number(h.hours), 0);
  const approved = data.hours.filter((h: any) => h.approved).reduce((s: number, h: any) => s + Number(h.hours), 0);
  const pending = data.hours.filter((h: any) => h.submitted && !h.approved);
  const unapproved = data.hours.filter((h: any) => !h.approved).reduce((s: number, h: any) => s + Number(h.hours), 0);

  return (
    <div>
      <PageHeader title={c.name} description={`${eur(c.hourly_rate)} / h`}
        actions={<Dialog open={edit} onOpenChange={setEdit}>
          <DialogTrigger asChild><Button variant="outline"><Pencil className="size-4 mr-1" />Modifica</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Modifica</DialogTitle></DialogHeader>
            <ContractorForm initial={c} onSaved={() => { setEdit(false); qc.invalidateQueries({ queryKey: ["contractor", id] }); }} /></DialogContent>
        </Dialog>} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><div className="text-sm text-muted-foreground">Ore questo mese</div><div className="text-2xl font-semibold">{monthHours.toFixed(1)}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground">Ore approvate</div><div className="text-2xl font-semibold">{approved.toFixed(1)}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground">In attesa</div><div className="text-2xl font-semibold">{unapproved.toFixed(1)}</div></Card>
      </div>

      {pending.length > 0 && (
        <Card className="p-4 mb-4 border-amber-300">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold flex items-center gap-2">Ore da approvare <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{pending.length}</Badge></h2>
            <Button size="sm" onClick={() => approve.mutate(pending.map((h: any) => h.id))}>Approva tutto</Button>
          </div>
          <div className="divide-y">
            {pending.map((h: any) => (
              <div key={h.id} className="py-3 flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm">{itDate(h.date)} · {h.hours}h · {h.description ?? "—"}</div>
                  {h.client_missing_flag ? (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs flex items-start gap-2">
                      <AlertTriangle className="size-4 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-amber-800">Cliente mancante: {h.client_missing_note}</div>
                        <Select onValueChange={(v) => reassign.mutate({ hid: h.id, jobId: v })}>
                          <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue placeholder="Assegna a lavoro…" /></SelectTrigger>
                          <SelectContent>{data.jobs.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.job_name} — {j.clients?.name}</SelectItem>)}</SelectContent>
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
      )}

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Storico ore</h2>
        <div className="divide-y">
          {data.hours.map((h: any) => (
            <div key={h.id} className="flex justify-between py-2 text-sm">
              <div><div>{h.jobs?.job_name ?? <span className="text-amber-600">Cliente mancante</span>}</div><div className="text-xs text-muted-foreground">{itDate(h.date)} · {h.description ?? "—"}</div></div>
              <div className="text-right"><div>{h.hours} h</div><div className="text-xs">{h.approved ? "Approvata" : h.submitted ? "In attesa" : "Bozza"}</div></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
