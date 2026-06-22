import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { ContractorForm } from "./_authenticated.contractors";
import { eur, itDate } from "@/lib/format";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contractors/$id")({ component: ContractorDetail });

function ContractorDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const { data } = useQuery({
    queryKey: ["contractor", id],
    queryFn: async () => {
      const [{ data: c }, { data: hours }] = await Promise.all([
        supabase.from("contractors").select("*").eq("id", id).maybeSingle(),
        supabase.from("logged_hours").select("*, jobs(job_name)").eq("contractor_id", id).order("date", { ascending: false }).limit(100),
      ]);
      return { c, hours: hours ?? [] };
    },
  });
  if (!data?.c) return <p>Caricamento…</p>;
  const c = data.c;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthHours = data.hours.filter((h: any) => new Date(h.date) >= monthStart).reduce((s: number, h: any) => s + Number(h.hours), 0);
  const approved = data.hours.filter((h: any) => h.approved).reduce((s: number, h: any) => s + Number(h.hours), 0);
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