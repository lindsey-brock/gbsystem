import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Store } from "lucide-react";
import { eur, itDate } from "@/lib/format";
import { toast } from "sonner";
import { WholesalerForm } from "@/routes/_authenticated.grossisti";

export const Route = createFileRoute("/_authenticated/acquisti")({ component: AcquistiPage });

function AcquistiPage() {
  const [wholesaler, setWholesaler] = useState("all");
  const [jobId, setJobId] = useState("all");
  const [newWholesalerOpen, setNewWholesalerOpen] = useState(false);
  const qc = useQueryClient();
  const { data: wholesalers } = useQuery({ queryKey: ["wholesalers"], queryFn: async () => (await supabase.from("wholesalers").select("id, name").order("name")).data ?? [] });
  const { data: jobs } = useQuery({ queryKey: ["jobs-all"], queryFn: async () => (await supabase.from("jobs").select("id, job_name, clients(name)").order("job_name")).data ?? [] });
  const { data } = useQuery({
    queryKey: ["purchases", wholesaler, jobId],
    queryFn: async () => {
      let q = supabase.from("purchases").select("*, wholesalers(name), jobs(job_name), purchase_line_items(total_price)").order("purchase_date", { ascending: false });
      if (wholesaler !== "all") q = q.eq("wholesaler_id", wholesaler);
      if (jobId !== "all") q = q.eq("job_id", jobId);
      return (await q).data ?? [];
    },
  });
  const reassign = useMutation({
    mutationFn: async ({ id, job }: { id: string; job: string | null }) => { const { error } = await supabase.from("purchases").update({ job_id: job }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Riassegnato"); qc.invalidateQueries({ queryKey: ["purchases"] }); },
  });
  return (
    <div>
      <PageHeader title="Acquisti" actions={
        <>
          <Dialog open={newWholesalerOpen} onOpenChange={setNewWholesalerOpen}>
            <DialogTrigger asChild><Button variant="outline"><Store className="size-4 mr-1" />Nuovo grossista</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Nuovo grossista</DialogTitle></DialogHeader>
              <WholesalerForm onSaved={() => { setNewWholesalerOpen(false); qc.invalidateQueries({ queryKey: ["wholesalers"] }); }} /></DialogContent>
          </Dialog>
          <Link to="/acquisti/nuovo"><Button><Plus className="size-4 mr-1" />Importa bolla</Button></Link>
        </>
      } />
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={wholesaler} onValueChange={setWholesaler}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Grossista" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti i grossisti</SelectItem>{(wholesalers ?? []).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="w-60"><SelectValue placeholder="Lavoro" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti i lavori</SelectItem>{(jobs ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.job_name} — {j.clients?.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="divide-y">
          {(data ?? []).map((p: any) => {
            const tot = (p.purchase_line_items ?? []).reduce((s: number, li: any) => s + Number(li.total_price), 0);
            return (
              <div key={p.id} className="py-3 flex flex-wrap justify-between gap-3 items-center">
                <div>
                  <div className="font-medium">{p.wholesalers?.name} · Bolla {p.bolla_number ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{itDate(p.purchase_date)} · {(p.purchase_line_items ?? []).length} articoli</div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={p.job_id ?? "none"} onValueChange={(v) => reassign.mutate({ id: p.id, job: v === "none" ? null : v })}>
                    <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Assegna lavoro" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">— Nessuno —</SelectItem>{(jobs ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.job_name}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="text-sm font-medium w-24 text-right">{eur(tot)}</div>
                </div>
              </div>
            );
          })}
          {!data?.length && <p className="text-sm text-muted-foreground py-6 text-center">Nessun acquisto.</p>}
        </div>
      </Card>
    </div>
  );
}