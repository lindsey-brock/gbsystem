import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/grossisti")({ component: GrossistiPage });

function GrossistiPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["wholesalers"], queryFn: async () => (await supabase.from("wholesalers").select("*").order("name")).data ?? [] });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("wholesalers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wholesalers"] }); toast.success("Eliminato"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div>
      <PageHeader title="Grossisti" actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />Nuovo grossista</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Nuovo grossista</DialogTitle></DialogHeader>
            <WholesalerForm onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["wholesalers"] }); }} /></DialogContent>
        </Dialog>
      } />
      <Card className="p-4 divide-y">
        {(data ?? []).map((w) => (
          <div key={w.id} className="flex justify-between py-3">
            <div><div className="font-medium">{w.name}</div><div className="text-xs text-muted-foreground">Formato: {w.system_type}</div></div>
            <Button variant="ghost" size="icon" onClick={() => del.mutate(w.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground py-4">Nessun grossista.</p>}
      </Card>
    </div>
  );
}

function WholesalerForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [systemType, setSystemType] = useState("generic_excel");
  const m = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("wholesalers").insert({ name, system_type: systemType }); if (error) throw error; },
    onSuccess: onSaved, onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
      <div className="space-y-1"><Label>Nome</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-1"><Label>Formato bolla</Label>
        <Select value={systemType} onValueChange={setSystemType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="generic_excel">Excel generico (xlsx/csv)</SelectItem>
            <SelectItem value="generic_pdf">PDF generico</SelectItem>
            <SelectItem value="excel_a">Excel formato A</SelectItem>
            <SelectItem value="pdf_b">PDF formato B</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Determina il parser usato durante l'import della bolla.</p>
      </div>
      <Button type="submit">Salva</Button>
    </form>
  );
}