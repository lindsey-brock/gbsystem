import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { ClientForm } from "./_authenticated.clienti";
import { JobForm } from "./_authenticated.lavori";
import { eur, itDate, itMonth, JOB_STATUS_LABEL, INVOICE_STATUS_LABEL } from "@/lib/format";
import { MarkPaidDialog, PagamentoStatusBadge } from "@/components/pagamenti";

export const Route = createFileRoute("/_authenticated/clienti/$id")({
  validateSearch: z.object({ tab: z.string().optional() }),
  component: ClienteDetail,
});

function InvoiceStatusBadge({ status }: { status: string }) {
  const cls = status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "sent" ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-muted text-muted-foreground border-transparent";
  return <Badge variant="outline" className={cls}>{INVOICE_STATUS_LABEL[status] ?? status}</Badge>;
}

function ClienteDetail() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { role } = useAuth();
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [newJob, setNewJob] = useState(false);

  const { data } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const [{ data: c }, { data: jobs }, { data: invoices }] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase.from("jobs").select("*, logged_hours(hours, approved, contractors(hourly_rate)), purchases(purchase_line_items(total_price))").eq("client_id", id).order("start_date", { ascending: false }),
        supabase.from("invoices").select("*").eq("client_id", id).order("invoice_date", { ascending: false }),
      ]);
      return { client: c, jobs: jobs ?? [], invoices: invoices ?? [] };
    },
  });

  const jobIds = (data?.jobs ?? []).map((j: any) => j.id);
  const { data: pagamenti } = useQuery({
    queryKey: ["client-pagamenti", id, jobIds],
    enabled: role === "admin" && jobIds.length > 0,
    queryFn: async () => (await supabase.from("pagamenti_operai").select("*, contractors(name), jobs(job_name)").in("job_id", jobIds).order("mese", { ascending: false })).data ?? [],
  });

  const setInvoiceStatus = useMutation({
    mutationFn: async ({ invId, status }: { invId: string; status: "draft" | "sent" | "paid" }) => {
      const { error } = await supabase.from("invoices").update({ status }).eq("id", invId); if (error) throw error;
    },
    onSuccess: () => { toast.success("Stato aggiornato"); qc.invalidateQueries({ queryKey: ["client", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!data?.client) return <p>Caricamento…</p>;
  const c = data.client;

  const totaleFatturato = data.invoices.reduce((s, i: any) => s + Number(i.grand_total), 0);
  const totaleIncassato = data.invoices.filter((i: any) => i.status === "paid").reduce((s, i: any) => s + Number(i.grand_total), 0);
  const totaleSospeso = data.invoices.filter((i: any) => i.status !== "paid").reduce((s, i: any) => s + Number(i.grand_total), 0);
  const lavoriAttivi = data.jobs.filter((j: any) => j.status === "active").length;

  function jobTotals(j: any) {
    const ore = (j.logged_hours ?? []).filter((h: any) => h.approved).reduce((s: number, h: any) => s + Number(h.hours) * Number(h.contractors?.hourly_rate ?? 0), 0);
    const oreCount = (j.logged_hours ?? []).filter((h: any) => h.approved).reduce((s: number, h: any) => s + Number(h.hours), 0);
    const acquisti = (j.purchases ?? []).reduce((s: number, p: any) => s + (p.purchase_line_items ?? []).reduce((ss: number, li: any) => ss + Number(li.total_price), 0), 0);
    return { oreCount, manodopera: ore, acquisti, stimata: ore + acquisti };
  }

  const pagamentiByMonth = (pagamenti ?? []).reduce((acc: any, p: any) => {
    (acc[p.mese] ??= []).push(p);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div>
      <PageHeader title={c.name} description={c.partita_iva ? `P.IVA ${c.partita_iva}` : c.codice_fiscale ?? undefined}
        actions={<Dialog open={edit} onOpenChange={setEdit}>
          <DialogTrigger asChild><Button variant="outline"><Pencil className="size-4 mr-1" />Modifica</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Modifica cliente</DialogTitle></DialogHeader>
            <ClientForm initial={c} onSaved={() => { setEdit(false); qc.invalidateQueries({ queryKey: ["client", id] }); }} /></DialogContent>
        </Dialog>} />

      <Tabs value={tab ?? "panoramica"} onValueChange={(v) => navigate({ to: "/clienti/$id", params: { id }, search: { tab: v }, replace: true })}>
        <TabsList>
          <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
          <TabsTrigger value="lavori">Lavori</TabsTrigger>
          <TabsTrigger value="fatture">Fatture</TabsTrigger>
          {role === "admin" && <TabsTrigger value="pagamenti">Pagamenti operai</TabsTrigger>}
        </TabsList>

        <TabsContent value="panoramica">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-2">Contatti</h2>
              <p className="text-sm">{c.contact_email ?? "—"} · {c.contact_phone ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{c.address ?? "—"}</p>
              {c.notes && <p className="text-sm mt-2 whitespace-pre-line">{c.notes}</p>}
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4"><div className="text-sm text-muted-foreground">Totale fatturato</div><div className="text-2xl font-semibold">{eur(totaleFatturato)}</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Totale incassato</div><div className="text-2xl font-semibold">{eur(totaleIncassato)}</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Totale in sospeso</div><div className="text-2xl font-semibold">{eur(totaleSospeso)}</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Lavori attivi</div><div className="text-2xl font-semibold">{lavoriAttivi}</div></Card>
          </div>
        </TabsContent>

        <TabsContent value="lavori">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Lavori</h2>
              <Dialog open={newJob} onOpenChange={setNewJob}>
                <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />Nuovo lavoro</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Nuovo lavoro</DialogTitle></DialogHeader>
                  <JobForm clients={[{ id: c.id, name: c.name }]} onSaved={() => { setNewJob(false); qc.invalidateQueries({ queryKey: ["client", id] }); }} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="divide-y">
              {data.jobs.map((j: any) => {
                const t = jobTotals(j);
                return (
                  <Link key={j.id} to="/clienti/$id/lavori/$jobId" params={{ id, jobId: j.id }} className="flex justify-between items-center py-3 hover:bg-muted/40 -mx-4 px-4 gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">{j.job_name}</div>
                      <div className="text-xs text-muted-foreground">{itDate(j.start_date)} · {t.oreCount}h approvate</div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right"><div className="text-xs text-muted-foreground">Acquisti</div>{eur(t.acquisti)}</div>
                      <div className="text-right"><div className="text-xs text-muted-foreground">Stima fattura</div>{eur(t.stimata)}</div>
                      <Badge variant="outline">{JOB_STATUS_LABEL[j.status]}</Badge>
                    </div>
                  </Link>
                );
              })}
              {!data.jobs.length && <p className="text-sm text-muted-foreground py-4">Nessun lavoro.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fatture">
          <Card className="p-4 divide-y">
            {data.invoices.map((i: any) => (
              <div key={i.id} className="flex justify-between items-center py-3 gap-3 flex-wrap">
                <div>
                  <div className="font-medium">{i.invoice_number ?? "n/n"}</div>
                  <div className="text-xs text-muted-foreground">{itDate(i.invoice_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium">{eur(i.grand_total)}</div>
                  <Select value={i.status} onValueChange={(v) => setInvoiceStatus.mutate({ invId: i.id, status: v as "draft" | "sent" | "paid" })}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Bozza</SelectItem>
                      <SelectItem value="sent">Inviata</SelectItem>
                      <SelectItem value="paid">Pagata</SelectItem>
                    </SelectContent>
                  </Select>
                  <InvoiceStatusBadge status={i.status} />
                </div>
              </div>
            ))}
            {!data.invoices.length && <p className="text-sm text-muted-foreground py-4">Nessuna fattura.</p>}
          </Card>
        </TabsContent>

        {role === "admin" && (
          <TabsContent value="pagamenti">
            {Object.entries(pagamentiByMonth).map(([mese, items]: any) => (
              <Card key={mese} className="p-4 mb-4">
                <h2 className="font-semibold mb-3 capitalize">{itMonth(mese)}</h2>
                <div className="divide-y">
                  {(items as any[]).map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center py-2 gap-3 flex-wrap text-sm">
                      <div>
                        <div className="font-medium">{p.contractors?.name}</div>
                        <div className="text-xs text-muted-foreground">{p.jobs?.job_name} · {p.ore_approvate}h</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>{eur(p.importo_dovuto)}</div>
                        <PagamentoStatusBadge status={p.status} />
                        {p.status === "da_pagare" && (
                          <MarkPaidDialog pagamentoId={p.id} onPaid={() => qc.invalidateQueries({ queryKey: ["client-pagamenti", id, jobIds] })} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            {!pagamenti?.length && <Card className="p-6 text-center text-muted-foreground">Nessun pagamento.</Card>}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
