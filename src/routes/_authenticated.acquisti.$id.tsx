import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { eur, itDate, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/acquisti/$id")({ component: AcquistoDetail });

function AcquistoDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["purchase", id],
    queryFn: async () => (await supabase.from("purchases")
      .select("*, wholesalers(name), jobs(job_name, client_id, clients(name)), purchase_line_items(*)")
      .eq("id", id).maybeSingle()).data,
  });
  if (!data) return <p>Caricamento…</p>;
  const items = data.purchase_line_items ?? [];
  const total = items.reduce((s: number, li: any) => s + Number(li.total_price), 0);
  return (
    <div>
      <PageHeader title={`Bolla ${data.bolla_number ?? "—"}`} description={data.wholesalers?.name}
        actions={data.jobs?.client_id && data.job_id ? (
          <Link to="/clienti/$id/lavori/$jobId" params={{ id: data.jobs.client_id, jobId: data.job_id }}>
            <Button variant="outline">← {data.jobs?.job_name}</Button>
          </Link>
        ) : null} />
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-muted-foreground">Grossista</div><div className="font-medium">{data.wholesalers?.name ?? "—"}</div></div>
          <div><div className="text-muted-foreground">Data</div><div className="font-medium">{itDate(data.purchase_date)}</div></div>
          <div><div className="text-muted-foreground">Lavoro</div><div className="font-medium">{data.jobs?.job_name ?? "—"} {data.jobs?.clients?.name ? `· ${data.jobs.clients.name}` : ""}</div></div>
          <div><div className="text-muted-foreground">Totale</div><div className="font-medium">{eur(total)}</div></div>
        </div>
        {data.notes && <p className="text-sm mt-3 whitespace-pre-line">{data.notes}</p>}
      </Card>
      <Card className="p-4 divide-y">
        {items.map((li: any) => (
          <div key={li.id} className="flex justify-between items-center py-2 text-sm gap-3">
            <div className="flex-1">
              <div>{li.item_description}</div>
              <div className="text-xs text-muted-foreground">{li.manufacturer_code ?? "—"} · {li.technical_spec ?? ""}</div>
            </div>
            <div className="text-right text-xs text-muted-foreground w-20">{num(li.quantity)}</div>
            <div className="text-right w-24">{eur(li.unit_price)}</div>
            <div className="text-right w-24 font-medium">{eur(li.total_price)}</div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground py-4">Nessun articolo.</p>}
      </Card>
    </div>
  );
}
