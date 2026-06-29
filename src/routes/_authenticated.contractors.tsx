import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { eur, ymdMonth } from "@/lib/format";
import { generatePagamentiForMonth } from "@/lib/pagamenti.functions";

export const Route = createFileRoute("/_authenticated/contractors")({ component: ContractorsPage });

function ContractorsPage() {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(ymdMonth(new Date()));
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();
  const generatePagamenti = useServerFn(generatePagamentiForMonth);
  const { data } = useQuery({
    queryKey: ["contractors"],
    queryFn: async () => (await supabase.from("contractors").select("*").order("name")).data ?? [],
  });
  const { data: pendingCounts } = useQuery({
    queryKey: ["pending-hours-by-contractor"],
    queryFn: async () => {
      const { data: hours } = await supabase.from("logged_hours").select("contractor_id").eq("submitted", true).eq("approved", false);
      return (hours ?? []).reduce((acc: Record<string, number>, h: any) => { acc[h.contractor_id] = (acc[h.contractor_id] ?? 0) + 1; return acc; }, {});
    },
  });
  return (
    <div>
      <PageHeader title="Operai" actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40 h-9" />
          <Button variant="outline" disabled={generating} onClick={async () => {
            setGenerating(true);
            try {
              const r = await generatePagamenti({ data: { month } });
              toast.success(`Pagamenti generati: ${r.created} creati, ${r.skipped} già presenti`);
            } catch (e: any) { toast.error(e.message); }
            finally { setGenerating(false); }
          }}>Genera pagamenti mese</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> Nuovo operaio</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Nuovo operaio</DialogTitle></DialogHeader>
              <ContractorForm onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["contractors"] }); }} />
            </DialogContent>
          </Dialog>
        </div>
      } />
      <Card className="p-4 divide-y">
        {(data ?? []).map((c) => (
          <Link key={c.id} to="/contractors/$id" params={{ id: c.id }} className="flex justify-between items-center py-3 hover:bg-muted/40 -mx-4 px-4">
            <div className="flex items-center gap-2">
              <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.email ?? "—"}</div></div>
              {!!pendingCounts?.[c.id] && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{pendingCounts[c.id]} da approvare</Badge>
              )}
            </div>
            <div className="text-sm">{eur(c.hourly_rate)} / h</div>
          </Link>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground py-4">Nessun operaio.</p>}
      </Card>
    </div>
  );
}

export function ContractorForm({ initial, onSaved }: { initial?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "", email: initial?.email ?? "", hourly_rate: initial?.hourly_rate ?? 25, active: initial?.active ?? true,
  });
  const m = useMutation({
    mutationFn: async () => {
      const payload = { ...form, hourly_rate: Number(form.hourly_rate) };
      if (initial?.id) { const { error } = await supabase.from("contractors").update(payload).eq("id", initial.id); if (error) throw error; }
      else { const { error } = await supabase.from("contractors").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Operaio salvato"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
      <div className="space-y-1"><Label>Nome</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div className="space-y-1"><Label>Tariffa oraria (€)</Label><Input type="number" step="0.01" min="0" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value as any })} /></div>
      <Button type="submit" disabled={m.isPending}>Salva</Button>
    </form>
  );
}