import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState } from "react";
import { parseBollaFile, savePurchase } from "@/lib/purchases.functions";
import type { ParsedLineItem } from "@/lib/parsers";
import { toast } from "sonner";
import { Trash2, Plus, Upload } from "lucide-react";
import { eur } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/acquisti/nuovo")({ component: NuovoAcquisto });

function NuovoAcquisto() {
  const navigate = useNavigate();
  const { data: wholesalers } = useQuery({ queryKey: ["wholesalers"], queryFn: async () => (await supabase.from("wholesalers").select("id, name, system_type").order("name")).data ?? [] });
  const { data: jobs } = useQuery({ queryKey: ["jobs-all"], queryFn: async () => (await supabase.from("jobs").select("id, job_name, clients(name)").order("job_name")).data ?? [] });
  const [wholesalerId, setWholesalerId] = useState("");
  const [jobId, setJobId] = useState("");
  const [bollaNumber, setBollaNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<ParsedLineItem[]>([]);
  const [busy, setBusy] = useState(false);
  const parseFn = useServerFn(parseBollaFile);
  const saveFn = useServerFn(savePurchase);

  async function handleFile(file: File) {
    if (!wholesalerId) { toast.error("Seleziona prima il grossista"); return; }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const res = await parseFn({ data: { wholesaler_id: wholesalerId, filename: file.name, base64: b64 } });
      setItems(res.items);
      toast.success(`${res.items.length} righe estratte (${res.system_type}). Verifica e correggi prima di salvare.`);
    } catch (e: any) { toast.error("Parsing fallito: " + e.message); }
    finally { setBusy(false); }
  }

  const total = items.reduce((s, i) => s + Number(i.total_price), 0);

  async function save() {
    if (!wholesalerId || !items.length) { toast.error("Aggiungi almeno una riga"); return; }
    setBusy(true);
    try {
      const r = await saveFn({ data: {
        wholesaler_id: wholesalerId, job_id: jobId || null, bolla_number: bollaNumber || null,
        purchase_date: date,
        items: items.map((it) => ({ ...it, quantity: Number(it.quantity), unit_price: Number(it.unit_price), total_price: Number(it.total_price) })),
      } });
      toast.success("Acquisto salvato");
      navigate({ to: "/acquisti" });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Importa bolla" description="Carica il file, correggi le righe e salva." />
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>Grossista</Label>
            <Select value={wholesalerId} onValueChange={setWholesalerId}>
              <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
              <SelectContent>{(wholesalers ?? []).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name} ({w.system_type})</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label>Lavoro (opzionale, assegnabile dopo)</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger><SelectValue placeholder="Nessuno" /></SelectTrigger>
              <SelectContent>{(jobs ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.job_name} — {j.clients?.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1"><Label>N. bolla</Label><Input value={bollaNumber} onChange={(e) => setBollaNumber(e.target.value)} /></div>
          <div className="space-y-1"><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="md:col-span-2 space-y-1">
            <Label>File bolla (xlsx, csv, pdf)</Label>
            <div className="flex items-center gap-3">
              <Input type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={busy || !wholesalerId} />
              <Upload className="size-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex justify-between mb-3">
          <h2 className="font-semibold">Righe ({items.length}) — Totale {eur(total)}</h2>
          <Button size="sm" variant="outline" onClick={() => setItems([...items, { item_description: "", quantity: 1, unit_price: 0, total_price: 0 }])}><Plus className="size-4 mr-1" />Riga</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr>
              <th className="text-left p-2">Descrizione</th><th className="text-left p-2">Codice</th>
              <th className="text-right p-2">Q.tà</th><th className="text-right p-2">Prezzo</th><th className="text-right p-2">Totale</th><th></th>
            </tr></thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-1"><Input value={it.item_description} onChange={(e) => upd(idx, { item_description: e.target.value })} /></td>
                  <td className="p-1"><Input value={it.manufacturer_code ?? ""} onChange={(e) => upd(idx, { manufacturer_code: e.target.value })} /></td>
                  <td className="p-1 w-24"><Input className="text-right" type="number" step="0.01" value={it.quantity} onChange={(e) => upd(idx, { quantity: Number(e.target.value) })} /></td>
                  <td className="p-1 w-28"><Input className="text-right" type="number" step="0.01" value={it.unit_price} onChange={(e) => upd(idx, { unit_price: Number(e.target.value), total_price: +(Number(e.target.value) * Number(it.quantity)).toFixed(2) })} /></td>
                  <td className="p-1 w-28"><Input className="text-right" type="number" step="0.01" value={it.total_price} onChange={(e) => upd(idx, { total_price: Number(e.target.value) })} /></td>
                  <td className="p-1"><Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="size-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={save} disabled={busy || !items.length}>Salva acquisto</Button></div>
      </Card>
    </div>
  );

  function upd(idx: number, patch: Partial<ParsedLineItem>) {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
}