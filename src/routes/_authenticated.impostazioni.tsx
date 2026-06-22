import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listUsersWithRoles, setUserRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/impostazioni")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["company_settings"], queryFn: async () => (await supabase.from("company_settings").select("*").limit(1).maybeSingle()).data });
  const { data: contractors } = useQuery({ queryKey: ["contractors"], queryFn: async () => (await supabase.from("contractors").select("id, name").order("name")).data ?? [] });
  const listUsers = useServerFn(listUsersWithRoles);
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => listUsers() });
  const setRole = useServerFn(setUserRole);

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (!settings?.id) {
        const { error } = await supabase.from("company_settings").insert(form); if (error) throw error;
      } else {
        const { error } = await supabase.from("company_settings").update(form).eq("id", settings.id); if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvato"); qc.invalidateQueries({ queryKey: ["company_settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Impostazioni" description="Dati aziendali e gestione utenti" />
      <Card className="p-5 mb-6">
        <h2 className="font-semibold mb-3">Dati azienda</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <F label="Ragione sociale" value={form.company_name} on={(v) => setForm({ ...form, company_name: v })} />
          <F label="Legale rappresentante" value={form.legal_rep_name} on={(v) => setForm({ ...form, legal_rep_name: v })} />
          <F label="Responsabile Tecnico" value={form.responsabile_tecnico_name} on={(v) => setForm({ ...form, responsabile_tecnico_name: v })} />
          <F label="Qualifica RT" value={form.responsabile_tecnico_qualification} on={(v) => setForm({ ...form, responsabile_tecnico_qualification: v })} />
          <F label="Partita IVA" value={form.partita_iva} on={(v) => setForm({ ...form, partita_iva: v })} />
          <F label="Codice fiscale" value={form.codice_fiscale} on={(v) => setForm({ ...form, codice_fiscale: v })} />
          <F label="Indirizzo" value={form.address} on={(v) => setForm({ ...form, address: v })} />
          <F label="Email" value={form.email} on={(v) => setForm({ ...form, email: v })} />
          <F label="Telefono" value={form.phone} on={(v) => setForm({ ...form, phone: v })} />
        </div>
        <Button className="mt-4" onClick={() => save.mutate()}>Salva</Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Utenti e ruoli</h2>
        <p className="text-xs text-muted-foreground mb-4">Assegna ruolo admin o operaio. Collega un operaio per consentire la registrazione delle ore.</p>
        <div className="divide-y">
          {(users ?? []).map((u: any) => <UserRow key={u.id} user={u} contractors={contractors ?? []} onChange={async (role, cid) => {
            try { await setRole({ data: { user_id: u.id, role, contractor_id: cid } }); toast.success("Aggiornato"); qc.invalidateQueries({ queryKey: ["users"] }); }
            catch (e: any) { toast.error(e.message); }
          }} />)}
          {!users?.length && <p className="text-sm text-muted-foreground py-4">Nessun utente registrato.</p>}
        </div>
      </Card>
    </div>
  );
}

function UserRow({ user, contractors, onChange }: { user: any; contractors: any[]; onChange: (role: "admin" | "contractor", cid: string | null) => void }) {
  const [role, setRole] = useState<"admin" | "contractor">(user.roles[0] ?? "contractor");
  const [cid, setCid] = useState<string>(user.contractor_id ?? "");
  return (
    <div className="py-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]"><div className="text-sm font-medium">{user.full_name ?? user.email}</div><div className="text-xs text-muted-foreground">{user.email}</div></div>
      <Select value={role} onValueChange={(v) => setRole(v as any)}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="admin">Amministratore</SelectItem><SelectItem value="contractor">Operaio</SelectItem></SelectContent>
      </Select>
      {role === "contractor" && (
        <Select value={cid} onValueChange={setCid}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Collega operaio…" /></SelectTrigger>
          <SelectContent>{contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      <Button size="sm" onClick={() => onChange(role, role === "contractor" ? (cid || null) : null)}>Applica</Button>
    </div>
  );
}

function F({ label, value, on }: { label: string; value: any; on: (v: string) => void }) {
  return (<div className="space-y-1"><Label>{label}</Label><Input value={value ?? ""} onChange={(e) => on(e.target.value)} /></div>);
}