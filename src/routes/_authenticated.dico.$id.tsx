import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { generateDicoPdf } from "@/lib/dico.functions";
import { INTERVENTION_LABEL } from "@/lib/format";
import { toast } from "sonner";
import { Download, AlertTriangle, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dico/$id")({ component: DicoDetail });

function DicoDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const genPdf = useServerFn(generateDicoPdf);
  const { data } = useQuery({
    queryKey: ["dico", id],
    queryFn: async () => {
      const { data: d } = await supabase.from("dico_drafts").select("*, jobs(job_name, client_id, clients(name, address))").eq("id", id).maybeSingle();
      if (!d) return null;
      const { data: purchases } = await supabase.from("purchases").select("purchase_line_items(item_description, manufacturer_code, quantity)").eq("job_id", d.job_id);
      const materials = (purchases ?? []).flatMap((p: any) => p.purchase_line_items ?? []);
      return { d, materials };
    },
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data?.d) setForm(data.d); }, [data?.d]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("dico_drafts").update({
        installer_company_name: form.installer_company_name, installer_legal_rep_name: form.installer_legal_rep_name,
        responsabile_tecnico_name: form.responsabile_tecnico_name, responsabile_tecnico_qualification: form.responsabile_tecnico_qualification,
        intervention_type: form.intervention_type || null, client_name: form.client_name, client_address: form.client_address,
        property_use: form.property_use, technical_norms_followed: form.technical_norms_followed, notes: form.notes,
        status: form.status,
      }).eq("id", id); if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvato"); qc.invalidateQueries({ queryKey: ["dico", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function download() {
    try {
      await save.mutateAsync();
      const r = await genPdf({ data: { dico_id: id } });
      const bin = atob(r.base64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `dico-bozza-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e.message); }
  }

  if (!data?.d) return <p>Caricamento…</p>;
  return (
    <div>
      <PageHeader title={`Bozza DICO — ${data.d.jobs?.job_name}`} description={data.d.jobs?.clients?.name}
        actions={<div className="flex gap-2"><Button variant="outline" onClick={() => save.mutate()}>Salva</Button><Button onClick={download}><Download className="size-4 mr-1" />Scarica PDF</Button></div>} />

      <Card className="p-4 mb-6 border-amber-500 bg-amber-50 flex items-start gap-3">
        <AlertTriangle className="size-5 text-amber-700 mt-0.5" />
        <div className="text-sm text-amber-900">
          <b>Avviso legale.</b> Questa è una bozza per assistere la preparazione del documento. Deve essere
          rivista, completata con lo schema dell'impianto e firmata dall'installatore qualificato /
          Responsabile Tecnico in conformità al <b>DM 37/08</b>. Questo strumento <u>non costituisce</u>
          dichiarazione legale di conformità.
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Impresa installatrice</h2>
          <F label="Ragione sociale" value={form.installer_company_name} on={(v) => setForm({ ...form, installer_company_name: v })} />
          <F label="Legale rappresentante" value={form.installer_legal_rep_name} on={(v) => setForm({ ...form, installer_legal_rep_name: v })} />
          <F label="Responsabile Tecnico" value={form.responsabile_tecnico_name} on={(v) => setForm({ ...form, responsabile_tecnico_name: v })} />
          <F label="Qualifica RT" value={form.responsabile_tecnico_qualification} on={(v) => setForm({ ...form, responsabile_tecnico_qualification: v })} />
        </Card>
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Intervento</h2>
          <div className="space-y-1"><Label>Tipologia</Label>
            <Select value={form.intervention_type ?? ""} onValueChange={(v) => setForm({ ...form, intervention_type: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
              <SelectContent>{Object.entries(INTERVENTION_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <F label="Committente" value={form.client_name} on={(v) => setForm({ ...form, client_name: v })} />
          <F label="Indirizzo impianto" value={form.client_address} on={(v) => setForm({ ...form, client_address: v })} />
          <F label="Uso dell'immobile" value={form.property_use} on={(v) => setForm({ ...form, property_use: v })} />
          <div className="space-y-1"><Label>Norme tecniche seguite</Label>
            <Textarea value={form.technical_norms_followed ?? ""} onChange={(e) => setForm({ ...form, technical_norms_followed: e.target.value })} placeholder="es. CEI 64-8, …" /></div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold mb-2">Relazione materiali utilizzati</h2>
          <p className="text-xs text-muted-foreground mb-3">Generata automaticamente dagli acquisti collegati al lavoro.</p>
          <div className="divide-y text-sm">
            {data.materials.map((m: any, i: number) => (
              <div key={i} className="flex justify-between py-1">
                <div>{m.item_description} {m.manufacturer_code && <span className="text-muted-foreground">· {m.manufacturer_code}</span>}</div>
                <div className="text-muted-foreground">{m.quantity}</div>
              </div>
            ))}
            {!data.materials.length && <p className="text-muted-foreground py-3">Nessun materiale registrato per il lavoro.</p>}
          </div>
        </Card>

        <Card className="p-5 border-dashed border-2"><div className="flex items-center gap-2 mb-2"><Upload className="size-4 text-muted-foreground" /><b>Schema planimetrico</b></div>
          <p className="text-xs text-muted-foreground">Da allegare manualmente al PDF stampato.</p></Card>
        <Card className="p-5 border-dashed border-2"><b>Firma Responsabile Tecnico / Timbro azienda</b>
          <p className="text-xs text-muted-foreground mt-1">Da apporre offline sul documento stampato.</p></Card>
      </div>
    </div>
  );
}

function F({ label, value, on }: { label: string; value: any; on: (v: string) => void }) {
  return (<div className="space-y-1"><Label>{label}</Label><Input value={value ?? ""} onChange={(e) => on(e.target.value)} /></div>);
}