import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { ClientForm } from "./_authenticated.clienti";
import { eur, itDate, JOB_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clienti/$id")({ component: ClienteDetail });

function ClienteDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const { data } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const [{ data: c }, { data: jobs }, { data: invoices }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase.from("jobs").select("id, job_name, status, start_date").eq("client_id", id).order("start_date", { ascending: false }),
        supabase.from("invoices").select("grand_total").eq("client_id", id),
      ]);
      return { client: c, jobs: jobs ?? [], total: (invoices ?? []).reduce((s, i: any) => s + Number(i.grand_total), 0) };
    },
  });
  if (!data?.client) return <p>Caricamento…</p>;
  const c = data.client;
  return (
    <div>
      <PageHeader title={c.name} description={c.partita_iva ? `P.IVA ${c.partita_iva}` : c.codice_fiscale ?? undefined}
        actions={<Dialog open={edit} onOpenChange={setEdit}>
          <DialogTrigger asChild><Button variant="outline"><Pencil className="size-4 mr-1" />Modifica</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Modifica cliente</DialogTitle></DialogHeader>
            <ClientForm initial={c} onSaved={() => { setEdit(false); qc.invalidateQueries({ queryKey: ["client", id] }); }} /></DialogContent>
        </Dialog>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 md:col-span-2">
          <h2 className="font-semibold mb-2">Contatti</h2>
          <p className="text-sm">{c.contact_email ?? "—"} · {c.contact_phone ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{c.address ?? "—"}</p>
          {c.notes && <p className="text-sm mt-2 whitespace-pre-line">{c.notes}</p>}
        </Card>
        <Card className="p-4">
          <h2 className="text-sm text-muted-foreground">Totale fatturato</h2>
          <p className="text-2xl font-semibold">{eur(data.total)}</p>
        </Card>
      </div>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Lavori</h2>
        <div className="divide-y">
          {data.jobs.map((j) => (
            <Link key={j.id} to="/lavori/$id" params={{ id: j.id }} className="flex justify-between py-3 hover:bg-muted/40 -mx-4 px-4">
              <div>
                <div className="font-medium">{j.job_name}</div>
                <div className="text-xs text-muted-foreground">{itDate(j.start_date)}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-muted">{JOB_STATUS_LABEL[j.status]}</span>
            </Link>
          ))}
          {!data.jobs.length && <p className="text-sm text-muted-foreground py-4">Nessun lavoro.</p>}
        </div>
      </Card>
    </div>
  );
}