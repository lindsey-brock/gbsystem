import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { eur, itDate, INVOICE_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fatture")({ component: FatturePage });

function FatturePage() {
  const { data } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await supabase.from("invoices").select("*, clients(name), jobs(job_name)").order("invoice_date", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Fatture" />
      <Card className="p-4 divide-y">
        {(data ?? []).map((i: any) => (
          <Link key={i.id} to="/fatture/$id" params={{ id: i.id }} className="flex justify-between py-3 hover:bg-muted/40 -mx-4 px-4">
            <div>
              <div className="font-medium">{i.invoice_number ?? "n/n"} · {i.clients?.name}</div>
              <div className="text-xs text-muted-foreground">{i.jobs?.job_name} · {itDate(i.invoice_date)}</div>
            </div>
            <div className="text-right">
              <div className="font-medium">{eur(i.grand_total)}</div>
              <span className="text-xs px-2 py-0.5 rounded bg-muted">{INVOICE_STATUS_LABEL[i.status]}</span>
            </div>
          </Link>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground py-6 text-center">Nessuna fattura.</p>}
      </Card>
    </div>
  );
}