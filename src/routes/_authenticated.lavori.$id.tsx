import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { eur, itDate, JOB_STATUS_LABEL } from "@/lib/format";
import { createInvoice } from "@/lib/invoices.functions";
import { createDicoFromJob } from "@/lib/dico.functions";
import { JobForm } from "./_authenticated.lavori";
import { toast } from "sonner";
import { Pencil, FileText, FileCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lavori/$id")({ component: LavoroDetail });

function LavoroDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [invDlg, setInvDlg] = useState(false);
  const { data: clients } = useQuery({ queryKey: ["clients-min"], queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [] });
  const { data } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const [{ data: job }, { data: hours }, { data: purchases }] = await Promise.all([
        supabase.from("jobs").select("*, clients(name)").eq("id", id).maybeSingle(),
        supabase.from("logged_hours").select("*, contractors(name, hourly_rate)").eq("job_id", id).order("date", { ascending: false }),
        supabase.from("purchases").select("*, wholesalers(name), purchase_line_items(quantity, unit_price, total_price)").eq("job_id", id).order("purchase_date", { ascending: false }),
      ]);
      return { job, hours: hours ?? [], purchases: purchases ?? [] };
    },
  });
  const createInv = useServerFn(createInvoice);
  const createDico = useServerFn(createDicoFromJob);
  if (!data?.job) return <p>Caricamento…</p>;
  const job = data.job;
  const laborTotal = data.hours.filter((h: any) => h.approved).reduce((s: number, h: any) => s + Number(h.hours) * Number(h.contractors?.hourly_rate ?? 0), 0);
  const materialsTotal = data.purchases.reduce((s: number, p: any) => s + (p.purchase_line_items ?? []).reduce((ss: number, li: any) => ss + Number(li.total_price), 0), 0);
  return (
    <div>
      <PageHeader title={job.job_name} description={`${job.clients?.name} · ${JOB_STATUS_LABEL[job.status]}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Dialog open={edit} onOpenChange={setEdit}>
              <DialogTrigger asChild><Button variant="outline"><Pencil className="size-4 mr-1" />Modifica</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Modifica lavoro</DialogTitle></DialogHeader>
                <JobForm initial={job} clients={clients ?? []} onSaved={() => { setEdit(false); qc.invalidateQueries({ queryKey: ["job", id] }); }} />
              </DialogContent>
            </Dialog>
            <Dialog open={invDlg} onOpenChange={setInvDlg}>
              <DialogTrigger asChild><Button><FileText className="size-4 mr-1" />Genera fattura</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Genera fattura</DialogTitle></DialogHeader>
                <InvoiceForm laborTotal={laborTotal} materialsTotal={materialsTotal} onConfirm={async (markup, num, notes) => {
                  try {
                    const r = await createInv({ data: { job_id: id, markup_percentage: markup, invoice_number: num || null, notes: notes || null } });
                    toast.success("Fattura creata");
                    setInvDlg(false);
                    navigate({ to: "/fatture/$id", params: { id: r.id } });
                  } catch (e: any) { toast.error(e.message); }
                }} />
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={async () => {
              try { const r = await createDico({ data: { job_id: id } }); toast.success("Bozza DICO creata"); navigate({ to: "/dico/$id", params: { id: r.id } }); }
              catch (e: any) { toast.error(e.message); }
            }}><FileCheck className="size-4 mr-1" />Bozza DICO</Button>
          </div>
        } />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><div className="text-sm text-muted-foreground">Manodopera (approvata)</div><div className="text-2xl font-semibold">{eur(laborTotal)}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground">Materiali</div><div className="text-2xl font-semibold">{eur(materialsTotal)}</div></Card>
        <Card className="p-4"><div className="text-sm text-muted-foreground">Totale (senza ricarico)</div><div className="text-2xl font-semibold">{eur(laborTotal + materialsTotal)}</div></Card>
      </div>
      <Tabs defaultValue="hours">
        <TabsList><TabsTrigger value="hours">Ore</TabsTrigger><TabsTrigger value="materials">Acquisti</TabsTrigger></TabsList>
        <TabsContent value="hours">
          <Card className="p-4 divide-y">
            {data.hours.map((h: any) => (
              <div key={h.id} className="flex justify-between py-2 text-sm">
                <div>
                  <div>{h.contractors?.name} · <span className="text-muted-foreground">{itDate(h.date)}</span></div>
                  <div className="text-xs text-muted-foreground">{h.description ?? "—"}</div>
                </div>
                <div className="text-right">
                  <div>{h.hours} h · {eur(Number(h.hours) * Number(h.contractors?.hourly_rate ?? 0))}</div>
                  <div className="text-xs">{h.approved ? <span className="text-emerald-600">Approvata</span> : h.submitted ? <span className="text-amber-600">In attesa</span> : <span className="text-muted-foreground">Bozza</span>}</div>
                </div>
              </div>
            ))}
            {!data.hours.length && <p className="text-sm text-muted-foreground py-3">Nessuna ora registrata.</p>}
          </Card>
        </TabsContent>
        <TabsContent value="materials">
          <Card className="p-4 divide-y">
            {data.purchases.map((p: any) => {
              const tot = (p.purchase_line_items ?? []).reduce((s: number, li: any) => s + Number(li.total_price), 0);
              return (
                <div key={p.id} className="flex justify-between py-2 text-sm">
                  <div><div>{p.wholesalers?.name} · Bolla {p.bolla_number ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{itDate(p.purchase_date)} · {(p.purchase_line_items ?? []).length} articoli</div></div>
                  <div>{eur(tot)}</div>
                </div>
              );
            })}
            {!data.purchases.length && <p className="text-sm text-muted-foreground py-3">Nessun acquisto.</p>}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceForm({ laborTotal, materialsTotal, onConfirm }: { laborTotal: number; materialsTotal: number; onConfirm: (markup: number, num: string, notes: string) => Promise<void> }) {
  const [markup, setMarkup] = useState("20");
  const [num, setNum] = useState("");
  const [notes, setNotes] = useState("");
  const m = Number(markup) || 0;
  const markupTotal = (materialsTotal * m) / 100;
  const grand = laborTotal + materialsTotal + markupTotal;
  return (
    <div className="space-y-3">
      <div className="text-sm space-y-1">
        <div>Manodopera: {eur(laborTotal)}</div>
        <div>Materiali: {eur(materialsTotal)}</div>
        <div>Ricarico ({m}% su materiali): {eur(markupTotal)}</div>
        <div className="font-semibold">Totale: {eur(grand)}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>N. fattura</Label><Input value={num} onChange={(e) => setNum(e.target.value)} /></div>
        <div className="space-y-1"><Label>Ricarico %</Label><Input type="number" min="0" max="500" step="0.1" value={markup} onChange={(e) => setMarkup(e.target.value)} /></div>
      </div>
      <div className="space-y-1"><Label>Note</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <Button onClick={() => onConfirm(m, num, notes)}>Crea fattura</Button>
    </div>
  );
}