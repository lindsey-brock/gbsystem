import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { eur, itDate, JOB_STATUS_LABEL } from "@/lib/format";
import { createInvoice } from "@/lib/invoices.functions";
import { createDicoFromJob } from "@/lib/dico.functions";
import { JobForm } from "./_authenticated.lavori";
import { toast } from "sonner";
import { Pencil, FileText, FileCheck, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clienti/$id/lavori/$jobId")({ component: LavoroDetail });

function LavoroDetail() {
  const { id: clientId, jobId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [invDlg, setInvDlg] = useState(false);
  const [markup, setMarkup] = useState("20");

  const { data } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const [{ data: job }, { data: hours }, { data: purchases }, { data: dicos }] = await Promise.all([
        supabase.from("jobs").select("*, clients(name)").eq("id", jobId).maybeSingle(),
        supabase.from("logged_hours").select("*, contractors(name, hourly_rate)").eq("job_id", jobId).order("date", { ascending: false }),
        supabase.from("purchases").select("*, wholesalers(name), purchase_line_items(quantity, unit_price, total_price)").eq("job_id", jobId).order("purchase_date", { ascending: false }),
        supabase.from("dico_drafts").select("*").eq("job_id", jobId).order("updated_at", { ascending: false }),
      ]);
      return { job, hours: hours ?? [], purchases: purchases ?? [], dicos: dicos ?? [] };
    },
  });

  const setStatus = useMutation({
    mutationFn: async (status: "active" | "completed" | "invoiced") => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId); if (error) throw error;
    },
    onSuccess: () => { toast.success("Stato aggiornato"); qc.invalidateQueries({ queryKey: ["job", jobId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const createInv = useServerFn(createInvoice);
  const createDico = useServerFn(createDicoFromJob);

  if (!data?.job) return <p>Caricamento…</p>;
  const job = data.job;
  const laborTotal = data.hours.filter((h: any) => h.approved).reduce((s: number, h: any) => s + Number(h.hours) * Number(h.contractors?.hourly_rate ?? 0), 0);
  const materialsTotal = data.purchases.reduce((s: number, p: any) => s + (p.purchase_line_items ?? []).reduce((ss: number, li: any) => ss + Number(li.total_price), 0), 0);
  const m = Number(markup) || 0;
  const markupTotal = (materialsTotal * m) / 100;
  const grandTotal = laborTotal + materialsTotal + markupTotal;

  const hoursByContractor = data.hours.reduce((acc: any, h: any) => {
    const key = h.contractors?.name ?? "—";
    (acc[key] ??= { hours: 0, rate: Number(h.contractors?.hourly_rate ?? 0), items: [] });
    acc[key].hours += Number(h.hours);
    acc[key].items.push(h);
    return acc;
  }, {} as Record<string, { hours: number; rate: number; items: any[] }>);

  return (
    <div>
      <PageHeader title={job.job_name} description={`${job.clients?.name} · ${JOB_STATUS_LABEL[job.status]}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link to="/clienti/$id" params={{ id: clientId }} search={{ tab: "lavori" }}>
              <Button variant="ghost">← Cliente</Button>
            </Link>
            <Dialog open={edit} onOpenChange={setEdit}>
              <DialogTrigger asChild><Button variant="outline"><Pencil className="size-4 mr-1" />Modifica</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Modifica lavoro</DialogTitle></DialogHeader>
                <JobForm initial={job} clients={[{ id: clientId, name: job.clients?.name }]} onSaved={() => { setEdit(false); qc.invalidateQueries({ queryKey: ["job", jobId] }); }} />
              </DialogContent>
            </Dialog>
          </div>
        } />

      <Tabs defaultValue="riepilogo">
        <TabsList>
          <TabsTrigger value="riepilogo">Riepilogo</TabsTrigger>
          <TabsTrigger value="ore">Ore</TabsTrigger>
          <TabsTrigger value="acquisti">Acquisti</TabsTrigger>
          <TabsTrigger value="dico">DICO</TabsTrigger>
        </TabsList>

        <TabsContent value="riepilogo">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-muted-foreground">Stato:</span>
            <Select value={job.status} onValueChange={(v) => setStatus.mutate(v as "active" | "completed" | "invoiced")}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Attivo</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
                <SelectItem value="invoiced">Fatturato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card className="p-4"><div className="text-sm text-muted-foreground">Manodopera (approvata)</div><div className="text-2xl font-semibold">{eur(laborTotal)}</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Materiali</div><div className="text-2xl font-semibold">{eur(materialsTotal)}</div></Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Ricarico %</div>
              <Input type="number" min="0" max="500" step="0.1" value={markup} onChange={(e) => setMarkup(e.target.value)} className="h-8" />
              <div className="text-xs text-muted-foreground mt-1">{eur(markupTotal)}</div>
            </Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Totale stimato</div><div className="text-2xl font-semibold">{eur(grandTotal)}</div></Card>
          </div>
          <div className="flex gap-2 flex-wrap">
            {job.status === "completed" && (
              <Dialog open={invDlg} onOpenChange={setInvDlg}>
                <DialogTrigger asChild><Button><FileText className="size-4 mr-1" />Genera fattura</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Genera fattura</DialogTitle></DialogHeader>
                  <InvoiceForm laborTotal={laborTotal} materialsTotal={materialsTotal} initialMarkup={markup} onConfirm={async (mk, num, notes) => {
                    try {
                      const r = await createInv({ data: { job_id: jobId, markup_percentage: mk, invoice_number: num || null, notes: notes || null } });
                      toast.success("Fattura creata");
                      setInvDlg(false);
                      navigate({ to: "/fatture/$id", params: { id: r.id } });
                    } catch (e: any) { toast.error(e.message); }
                  }} />
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" onClick={async () => {
              try { const r = await createDico({ data: { job_id: jobId } }); toast.success("Bozza DICO creata"); navigate({ to: "/dico/$id", params: { id: r.id } }); }
              catch (e: any) { toast.error(e.message); }
            }}><FileCheck className="size-4 mr-1" />Genera bozza DICO</Button>
          </div>
        </TabsContent>

        <TabsContent value="ore">
          <Card className="p-4 divide-y">
            {Object.entries(hoursByContractor).map(([name, g]: any) => (
              <div key={name} className="py-3">
                <div className="flex justify-between items-center text-sm">
                  <div className="font-medium">{name}</div>
                  <div>{g.hours}h · {eur(g.rate)}/h · <span className="font-medium">{eur(g.hours * g.rate)}</span></div>
                </div>
                <div className="mt-1 space-y-1">
                  {g.items.map((h: any) => (
                    <div key={h.id} className="text-xs text-muted-foreground flex justify-between">
                      <span>{itDate(h.date)} · {h.description ?? "—"}</span>
                      <span>{h.hours}h {h.approved ? <span className="text-emerald-600">· Approvata</span> : h.submitted ? <span className="text-amber-600">· In attesa</span> : <span>· Bozza</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!data.hours.length && <p className="text-sm text-muted-foreground py-3">Nessuna ora registrata.</p>}
          </Card>
        </TabsContent>

        <TabsContent value="acquisti">
          <Card className="p-4 divide-y">
            {data.purchases.map((p: any) => {
              const tot = (p.purchase_line_items ?? []).reduce((s: number, li: any) => s + Number(li.total_price), 0);
              return (
                <Link key={p.id} to="/acquisti/$id" params={{ id: p.id }} className="flex justify-between py-2 text-sm hover:bg-muted/40 -mx-4 px-4">
                  <div><div>{p.wholesalers?.name} · Bolla {p.bolla_number ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{itDate(p.purchase_date)} · {(p.purchase_line_items ?? []).length} articoli</div></div>
                  <div>{eur(tot)}</div>
                </Link>
              );
            })}
            {!data.purchases.length && <p className="text-sm text-muted-foreground py-3">Nessun acquisto.</p>}
          </Card>
        </TabsContent>

        <TabsContent value="dico">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Bozze DICO</h2>
              <Button size="sm" variant="outline" onClick={async () => {
                try { const r = await createDico({ data: { job_id: jobId } }); toast.success("Bozza DICO creata"); qc.invalidateQueries({ queryKey: ["job", jobId] }); navigate({ to: "/dico/$id", params: { id: r.id } }); }
                catch (e: any) { toast.error(e.message); }
              }}><Plus className="size-4 mr-1" />Nuova bozza DICO</Button>
            </div>
            <div className="divide-y">
              {data.dicos.map((d: any) => (
                <Link key={d.id} to="/dico/$id" params={{ id: d.id }} className="flex justify-between items-center py-3 hover:bg-muted/40 -mx-4 px-4">
                  <div>
                    <Badge variant="outline">{d.status}</Badge>
                    <span className="text-xs text-muted-foreground ml-2">{itDate(d.updated_at)}</span>
                  </div>
                  {d.pdf_url && <a href={d.pdf_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-primary underline">PDF</a>}
                </Link>
              ))}
              {!data.dicos.length && <p className="text-sm text-muted-foreground py-3">Nessuna bozza.</p>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceForm({ laborTotal, materialsTotal, initialMarkup, onConfirm }: { laborTotal: number; materialsTotal: number; initialMarkup: string; onConfirm: (markup: number, num: string, notes: string) => Promise<void> }) {
  const [markup, setMarkup] = useState(initialMarkup);
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
