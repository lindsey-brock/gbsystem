import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Briefcase, Clock, ShoppingCart, FileText, AlertTriangle } from "lucide-react";
import { eur, itDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { promoteFirstUserToAdmin } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ymdMonth } from "@/lib/format";
import { MarkPaidDialog } from "@/components/pagamenti";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const [jobs, hours, purchases, invoices] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("logged_hours").select("id", { count: "exact", head: true }).eq("submitted", true).eq("approved", false),
        supabase.from("purchases").select("id, purchase_date, bolla_number, wholesalers(name)").order("purchase_date", { ascending: false }).limit(5),
        supabase.from("invoices").select("id, invoice_number, grand_total, clients(name)").eq("status", "draft").limit(5),
      ]);
      return {
        active_jobs: jobs.count ?? 0,
        pending_hours: hours.count ?? 0,
        purchases: purchases.data ?? [],
        invoices: invoices.data ?? [],
      };
    },
  });

  const { data: pagamentiSospesi } = useQuery({
    queryKey: ["dashboard-pagamenti-sospesi"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("pagamenti_operai")
      .select("*, contractors(name)")
      .eq("status", "da_pagare")
      .eq("mese", `${ymdMonth(new Date())}-01`)
      .order("contractor_id")).data ?? [],
  });

  const { data: fattureSospese } = useQuery({
    queryKey: ["dashboard-fatture-sospese"],
    enabled: role === "admin",
    queryFn: async () => (await supabase.from("invoices")
      .select("*, clients(name)")
      .eq("status", "sent")
      .order("updated_at", { ascending: true })).data ?? [],
  });

  const pagamentiByContractor = (pagamentiSospesi ?? []).reduce((acc: any, p: any) => {
    const key = p.contractors?.name ?? "—";
    (acc[key] ??= { items: [], total: 0 });
    acc[key].items.push(p);
    acc[key].total += Number(p.importo_dovuto);
    return acc;
  }, {} as Record<string, { items: any[]; total: number }>);
  return (
    <div>
      <PageHeader title="Dashboard" description="Panoramica generale" />
      {role === "admin" && user && <NoAdminCheck />}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI icon={Briefcase} label="Lavori attivi" value={data?.active_jobs ?? 0} loading={isLoading} />
        <KPI icon={Clock} label="Ore da approvare" value={data?.pending_hours ?? 0} loading={isLoading} />
        <KPI icon={ShoppingCart} label="Acquisti recenti" value={data?.purchases.length ?? 0} loading={isLoading} />
        <KPI icon={FileText} label="Fatture in bozza" value={data?.invoices.length ?? 0} loading={isLoading} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Acquisti recenti</h2>
          <div className="space-y-2">
            {(data?.purchases ?? []).map((p: any) => (
              <div key={p.id} className="flex justify-between text-sm border-b pb-2">
                <div>{p.wholesalers?.name} <span className="text-muted-foreground">· Bolla {p.bolla_number ?? "—"}</span></div>
                <div className="text-muted-foreground">{itDate(p.purchase_date)}</div>
              </div>
            ))}
            {!data?.purchases.length && <p className="text-sm text-muted-foreground">Nessun acquisto.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Fatture in bozza</h2>
          <div className="space-y-2">
            {(data?.invoices ?? []).map((i: any) => (
              <Link key={i.id} to="/fatture/$id" params={{ id: i.id }} className="flex justify-between text-sm border-b pb-2 hover:bg-muted/40 -mx-2 px-2 rounded">
                <div>{i.clients?.name} <span className="text-muted-foreground">· {i.invoice_number ?? "n/n"}</span></div>
                <div>{eur(i.grand_total)}</div>
              </Link>
            ))}
            {!data?.invoices.length && <p className="text-sm text-muted-foreground">Nessuna bozza.</p>}
          </div>
        </Card>
      </div>

      {role === "admin" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Pagamenti operai in sospeso</h2>
            <div className="space-y-3">
              {Object.entries(pagamentiByContractor).map(([name, g]: any) => (
                <div key={name} className="border-b pb-2">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <div className="font-medium">{name}</div>
                    <div className="font-medium">{eur(g.total)}</div>
                  </div>
                  <div className="space-y-1">
                    {g.items.map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>{p.ore_approvate}h · {eur(p.importo_dovuto)}</span>
                        <MarkPaidDialog pagamentoId={p.id} onPaid={() => qc.invalidateQueries({ queryKey: ["dashboard-pagamenti-sospesi"] })} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!pagamentiSospesi?.length && <p className="text-sm text-muted-foreground">Nessun pagamento in sospeso.</p>}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Fatture in sospeso</h2>
            <div className="space-y-2">
              {(fattureSospese ?? []).map((i: any) => {
                const days = Math.floor((Date.now() - new Date(i.updated_at).getTime()) / 86400000);
                return (
                  <Link key={i.id} to="/fatture/$id" params={{ id: i.id }} className="flex justify-between items-center text-sm border-b pb-2 hover:bg-muted/40 -mx-2 px-2 rounded">
                    <div>{i.clients?.name} <span className="text-muted-foreground">· {i.invoice_number ?? "n/n"}</span></div>
                    <div className="flex items-center gap-2">
                      <span>{eur(i.grand_total)}</span>
                      <span className="text-xs text-muted-foreground">{days}gg</span>
                    </div>
                  </Link>
                );
              })}
              {!fattureSospese?.length && <p className="text-sm text-muted-foreground">Nessuna fattura in sospeso.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, loading }: any) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-2"><Icon className="size-5 text-primary" /></div>
      <div className="text-3xl font-semibold">{loading ? "…" : value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  );
}

function NoAdminCheck() {
  // Show prompt only if no admin exists at all (best-effort client check)
  const [needs, setNeeds] = useState(false);
  const promote = useServerFn(promoteFirstUserToAdmin);
  useEffect(() => {
    supabase.from("user_roles").select("role", { count: "exact", head: true }).eq("role", "admin").then((r) => {
      if ((r.count ?? 0) === 0) setNeeds(true);
    });
  }, []);
  if (!needs) return null;
  return (
    <Card className="p-4 mb-6 border-amber-400 bg-amber-50 flex items-start gap-3">
      <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
      <div className="flex-1">
        <div className="font-medium text-sm">Nessun amministratore configurato</div>
        <p className="text-xs text-muted-foreground mb-2">Promuovi te stesso come amministratore per gestire l'applicazione.</p>
        <Button size="sm" onClick={async () => {
          try { await promote(); toast.success("Promosso ad admin. Ricarica la pagina."); setTimeout(() => location.reload(), 500); }
          catch (e: any) { toast.error(e.message); }
        }}>Diventa amministratore</Button>
      </div>
    </Card>
  );
}