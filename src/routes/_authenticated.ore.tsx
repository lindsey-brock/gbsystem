import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { toast } from "sonner";
import { itDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ore")({ component: OrePage });

function OrePage() {
  const { contractorId, role } = useAuth();
  if (role === "admin") return <AdminHint />;
  if (!contractorId) return <Card className="p-6 max-w-md mx-auto"><p className="text-sm">Il tuo account non è collegato a nessun operaio. Contatta l'amministratore.</p></Card>;
  return <LogForm contractorId={contractorId} />;
}

function AdminHint() {
  return (
    <Card className="p-6 max-w-lg">
      <h2 className="font-semibold mb-2">Registrazione ore</h2>
      <p className="text-sm text-muted-foreground mb-4">Questa pagina è destinata agli operai. Come amministratore puoi consultare e approvare le ore inviate.</p>
      <Link to="/ore/approvazione" className="text-primary underline text-sm">Vai ad approvazione ore →</Link>
    </Card>
  );
}

function LogForm({ contractorId }: { contractorId: string }) {
  const qc = useQueryClient();
  const { data: jobs } = useQuery({
    queryKey: ["jobs-min"],
    queryFn: async () => (await supabase.from("jobs").select("id, job_name, clients(name)").eq("status", "active").order("job_name")).data ?? [],
  });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("8");
  const [jobId, setJobId] = useState<string>("");
  const [missing, setMissing] = useState(false);
  const [missingNote, setMissingNote] = useState("");
  const [desc, setDesc] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("logged_hours").insert({
        contractor_id: contractorId,
        job_id: missing ? null : (jobId || null),
        date, hours: Number(hours), description: desc || null,
        client_missing_flag: missing, client_missing_note: missing ? missingNote : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ora registrata"); setHours("8"); setDesc(""); setMissing(false); setMissingNote(""); qc.invalidateQueries({ queryKey: ["my-hours"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Registra ore" description={itDate(date)} />
      <Card className="p-5">
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-1"><Label>Ore</Label><Input type="number" inputMode="decimal" step="0.25" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} required /></div>
          </div>
          <div className="flex items-center justify-between p-3 rounded bg-muted">
            <div><div className="text-sm font-medium">Cliente mancante</div><div className="text-xs text-muted-foreground">Lavoro non in elenco</div></div>
            <Switch checked={missing} onCheckedChange={setMissing} />
          </div>
          {missing ? (
            <div className="space-y-1"><Label>Nota cliente</Label><Textarea required value={missingNote} onChange={(e) => setMissingNote(e.target.value)} placeholder="Descrivi cliente / indirizzo / lavoro" /></div>
          ) : (
            <div className="space-y-1"><Label>Lavoro</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger><SelectValue placeholder="Seleziona lavoro" /></SelectTrigger>
                <SelectContent>{(jobs ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.job_name} — {j.clients?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1"><Label>Descrizione lavoro</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Cosa hai fatto?" /></div>
          <Button className="w-full h-12 text-base" type="submit" disabled={m.isPending}>{m.isPending ? "Salvataggio…" : "Registra"}</Button>
        </form>
      </Card>
      <div className="mt-4 text-center"><Link to="/ore/storico" className="text-primary underline text-sm">Vedi storico mensile →</Link></div>
    </div>
  );
}