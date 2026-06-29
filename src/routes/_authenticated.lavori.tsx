import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

// "Lavori" no longer has its own top-level list page — jobs now live under
// their client. Redirect any bookmarked /lavori link to the Clienti list.
export const Route = createFileRoute("/_authenticated/lavori")({
  beforeLoad: () => {
    throw redirect({ to: "/clienti" });
  },
});

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
      {clients.length > 1 && (
        <div className="space-y-1"><Label>Cliente</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
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
