import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clienti")({ component: ClientiPage });

function ClientiPage() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["clients", q],
    queryFn: async () => {
      let query = supabase.from("clients").select("*").order("name");
      if (q) query = query.ilike("name", `%${q}%`);
      const { data } = await query; return data ?? [];
    },
  });
  return (
    <div>
      <PageHeader title="Clienti" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> Nuovo cliente</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuovo cliente</DialogTitle></DialogHeader>
            <ClientForm onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["clients"] }); }} />
          </DialogContent>
        </Dialog>
      } />
      <Card className="p-4">
        <div className="relative mb-4 max-w-sm">
          <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cerca cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="divide-y">
          {(data ?? []).map((c) => (
            <Link key={c.id} to="/clienti/$id" params={{ id: c.id }} className="flex justify-between py-3 hover:bg-muted/40 -mx-4 px-4">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.contact_email ?? c.partita_iva ?? ""}</div>
              </div>
              <div className="text-xs text-muted-foreground">{c.contact_phone}</div>
            </Link>
          ))}
          {!data?.length && <p className="text-sm text-muted-foreground py-6 text-center">Nessun cliente.</p>}
        </div>
      </Card>
    </div>
  );
}

export function ClientForm({ initial, onSaved }: { initial?: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    contact_email: initial?.contact_email ?? "",
    contact_phone: initial?.contact_phone ?? "",
    address: initial?.address ?? "",
    partita_iva: initial?.partita_iva ?? "",
    codice_fiscale: initial?.codice_fiscale ?? "",
    notes: initial?.notes ?? "",
  });
  const m = useMutation({
    mutationFn: async () => {
      const payload = { ...form, name: form.name.trim() };
      if (initial?.id) {
        const { error } = await supabase.from("clients").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Cliente salvato"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
      <Field label="Nome / Ragione sociale" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} type="email" />
        <Field label="Telefono" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} />
      </div>
      <Field label="Indirizzo" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Partita IVA" value={form.partita_iva} onChange={(v) => setForm({ ...form, partita_iva: v })} />
        <Field label="Codice fiscale" value={form.codice_fiscale} onChange={(v) => setForm({ ...form, codice_fiscale: v })} />
      </div>
      <div className="space-y-1">
        <Label>Note</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <Button type="submit" disabled={m.isPending}>{m.isPending ? "Salvataggio…" : "Salva"}</Button>
    </form>
  );
}

interface FieldProps { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }
function Field({ label, value, onChange, type = "text", required }: FieldProps) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} type={type} required={required} />
    </div>
  );
}