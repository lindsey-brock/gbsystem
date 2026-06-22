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

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, role } = useAuth();
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