import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { generateInvoicePdf } from "@/lib/invoices.functions";
import { eur, itDate, INVOICE_STATUS_LABEL } from "@/lib/format";
import { toast } from "sonner";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fatture/$id")({ component: FatturaDetail });

function FatturaDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const genPdf = useServerFn(generateInvoicePdf);
  const { data } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("*, clients(*), jobs(job_name), invoice_line_sources(*)").eq("id", id).maybeSingle();
      if (!data) return null;
      const hourIds = data.invoice_line_sources.filter((s: any) => s.source_type === "logged_hours").map((s: any) => s.source_id);
      const matIds = data.invoice_line_sources.filter((s: any) => s.source_type === "purchase_line_item").map((s: any) => s.source_id);
      const [{ data: hours }, { data: mats }] = await Promise.all([
        hourIds.length ? supabase.from("logged_hours").select("hours, contractors(name, hourly_rate)").in("id", hourIds) : Promise.resolve({ data: [] as any[] }),
        matIds.length ? supabase.from("purchase_line_items").select("*").in("id", matIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      return { invoice: data, hours: hours ?? [], mats: mats ?? [] };
    },
  });
  const setStatus = useMutation({
    mutationFn: async (status: string) => { const { error } = await supabase.from("invoices").update({ status: status as any }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice", id] }),
  });
  async function download() {
    try {
      const r = await genPdf({ data: { invoice_id: id } });
      const bin = atob(r.base64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `fattura-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e.message); }
  }
  if (!data?.invoice) return <p>Caricamento…</p>;
  const inv = data.invoice;
  return (
    <div>
      <PageHeader title={`Fattura ${inv.invoice_number ?? "(senza numero)"}`} description={`${inv.clients?.name} · ${itDate(inv.invoice_date)}`}
        actions={<div className="flex gap-2 items-center">
          <Select value={inv.status} onValueChange={(v) => setStatus.mutate(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{INVOICE_STATUS_LABEL.draft}</SelectItem>
              <SelectItem value="sent">{INVOICE_STATUS_LABEL.sent}</SelectItem>
              <SelectItem value="paid">{INVOICE_STATUS_LABEL.paid}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={download}><Download className="size-4 mr-1" />PDF</Button>
        </div>} />
      <Card className="p-6 max-w-3xl mx-auto print:shadow-none">
        <div className="flex justify-between mb-6">
          <div><h2 className="text-xl font-semibold">{inv.clients?.name}</h2>
            <p className="text-sm text-muted-foreground">{inv.clients?.address}</p>
            {inv.clients?.partita_iva && <p className="text-sm">P.IVA {inv.clients.partita_iva}</p>}
          </div>
          <div className="text-right text-sm">
            <div className="text-xl font-semibold">FATTURA</div>
            <div>N. {inv.invoice_number ?? "—"}</div>
            <div>{itDate(inv.invoice_date)}</div>
          </div>
        </div>
        <p className="text-sm mb-4"><b>Lavoro:</b> {inv.jobs?.job_name}</p>
        {data.hours.length > 0 && <>
          <h3 className="font-medium mt-4 mb-1">Manodopera</h3>
          <table className="w-full text-sm border-t border-b mb-2"><tbody>
            {data.hours.map((h: any, i: number) => (
              <tr key={i} className="border-b last:border-0"><td className="py-1">{h.contractors?.name}</td>
                <td className="text-right">{h.hours} h × {eur(h.contractors?.hourly_rate)}</td>
                <td className="text-right w-28">{eur(Number(h.hours) * Number(h.contractors?.hourly_rate))}</td></tr>
            ))}
          </tbody></table>
          <p className="text-right text-sm">Totale manodopera: <b>{eur(inv.labor_total)}</b></p>
        </>}
        {data.mats.length > 0 && <>
          <h3 className="font-medium mt-4 mb-1">Materiali</h3>
          <table className="w-full text-sm border-t border-b mb-2"><tbody>
            {data.mats.map((m: any, i: number) => (
              <tr key={i} className="border-b last:border-0"><td className="py-1">{m.item_description}</td>
                <td className="text-right">{m.quantity} × {eur(m.unit_price)}</td>
                <td className="text-right w-28">{eur(m.total_price)}</td></tr>
            ))}
          </tbody></table>
          <p className="text-right text-sm">Totale materiali: <b>{eur(inv.materials_total)}</b></p>
          <p className="text-right text-sm">Ricarico ({inv.markup_percentage}%): <b>{eur(inv.markup_total)}</b></p>
        </>}
        <div className="mt-6 pt-4 border-t text-right">
          <div className="text-sm text-muted-foreground">TOTALE</div>
          <div className="text-2xl font-semibold">{eur(inv.grand_total)}</div>
        </div>
        {inv.notes && <div className="mt-4 text-sm"><b>Note:</b> {inv.notes}</div>}
        <p className="text-xs text-muted-foreground mt-6 italic">SDI XML — integrazione futura.</p>
      </Card>
    </div>
  );
}