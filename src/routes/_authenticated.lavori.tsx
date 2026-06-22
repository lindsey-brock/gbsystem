import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { JOB_STATUS_LABEL, itDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/lavori")({ component: LavoriPage });

function LavoriPage() {
  const [status, setStatus] = useState<string>("all");
  const [clientId, setClientId] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data: clients } = useQuery({ queryKey: ["clients-min"], queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [] });
  const { data } = useQuery({
    queryKey: ["jobs", status, clientId],
    queryFn: async () => {
      let q = supabase.from("jobs").select("*, clients(name)").order("start_date", { ascending: false });
      if (status !== "all") q = q.eq("status", status as any);
      if (clientId !== "all") q = q.eq("client_id", clientId);
      return (await q).data ?? [];
    },
  });
  return (
    <div>
      <PageHeader title="Lavori" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> Nuovo lavoro</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Nuovo lavoro</DialogTitle></DialogHeader>
            <JobForm clients={clients ?? []} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["jobs"] }); }} />
          </DialogContent>
        </Dialog>
      } />
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="active">Attivi</SelectItem>
              <SelectItem value="completed">Completati</SelectItem>
              <SelectItem value="invoiced">Fatturati</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-60"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i clienti</SelectItem>
              {(clients ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="divide-y">
          {(data ?? []).map((j: any) => (
            <Link key={j.id} to="/lavori/$id" params={{ id: j.id }} className="flex justify-between py-3 hover:bg-muted/40 -mx-4 px-4">
              <div>
                <div className="font-medium">{j.job_name}</div>
                <div className="text-xs text-muted-foreground">{j.clients?.name} · {itDate(j.start_date)}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-muted self-center">{JOB_STATUS_LABEL[j.status]}</span>
            </Link>
          ))}
          {!data?.length && <p className="text-sm text-muted-foreground py-6 text-center">Nessun lavoro.</p>}
        </div>
      </Card>
    </div>
  );
}

export function JobForm({ initial, clients, onSaved }: { initial?: any; clients: any[]; onSaved: () => void }) {
  const [form, setForm] = useState({
    job_name: initial?.job_name ?? "",
    client_id: initial?.client_id ?? clients[0]?.id ?? "",
    status: initial?.status ?? "active",
    start_date: initial?.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: initial?.end_date ?? "",
    notes: initial?.notes ?? "",
  });
  const m = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, end_date: form.end_date || null };
      if (initial?.id) { const { error } = await supabase.from("jobs").update(payload).eq("id", initial.id); if (error) throw error; }
      else { const { error } = await supabase.from("jobs").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Lavoro salvato"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
      <div className="space-y-1"><Label>Nome lavoro</Label><Input required value={form.job_name} onChange={(e) => setForm({ ...form, job_name: e.target.value })} /></div>
      <div className="space-y-1"><Label>Cliente</Label>
        <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Inizio</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
        <div className="space-y-1"><Label>Fine</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><Label>Stato</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Attivo</SelectItem>
            <SelectItem value="completed">Completato</SelectItem>
            <SelectItem value="invoiced">Fatturato</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={m.isPending}>Salva</Button>
    </form>
  );
}