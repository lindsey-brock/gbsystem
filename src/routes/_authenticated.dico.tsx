import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { itDate, INTERVENTION_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dico")({ component: DicoPage });

function DicoPage() {
  const { data } = useQuery({
    queryKey: ["dico_drafts"],
    queryFn: async () => (await supabase.from("dico_drafts").select("*, jobs(job_name, clients(name))").order("updated_at", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Bozze DICO" description="Crea una bozza dal dettaglio del lavoro." />
      <Card className="p-4 divide-y">
        {(data ?? []).map((d: any) => (
          <Link key={d.id} to="/dico/$id" params={{ id: d.id }} className="flex justify-between py-3 hover:bg-muted/40 -mx-4 px-4">
            <div>
              <div className="font-medium">{d.jobs?.job_name} — {d.jobs?.clients?.name}</div>
              <div className="text-xs text-muted-foreground">{INTERVENTION_LABEL[d.intervention_type ?? ""] ?? "—"} · {itDate(d.updated_at)}</div>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-muted self-center">{d.status}</span>
          </Link>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground py-6 text-center">Nessuna bozza.</p>}
      </Card>
    </div>
  );
}