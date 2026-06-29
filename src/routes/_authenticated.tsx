import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { promoteFirstUserToAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, user, role } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!role) return;
    // Contractors restricted to /ore/*
    if (role === "contractor" && !pathname.startsWith("/ore")) {
      navigate({ to: "/ore" });
    }
  }, [loading, user, role, pathname, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Caricamento…</div>;
  }
  if (!role) {
    return <NoRoleScreen />;
  }
  return <AppShell><Outlet /></AppShell>;
}

function NoRoleScreen() {
  const [noAdminYet, setNoAdminYet] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const promote = useServerFn(promoteFirstUserToAdmin);

  useEffect(() => {
    supabase
      .from("user_roles")
      .select("role", { count: "exact", head: true })
      .eq("role", "admin")
      .then((r) => setNoAdminYet((r.count ?? 0) === 0));
  }, []);

  async function becomeAdmin() {
    setBusy(true);
    try {
      await promote();
      toast.success("Promosso ad amministratore. Ricarica la pagina.");
      setTimeout(() => location.reload(), 500);
    } catch (e: any) {
      toast.error(e.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold">Account in attesa di approvazione</h1>
        <p className="text-sm text-muted-foreground">
          Il tuo account non ha ancora un ruolo assegnato. Contatta l'amministratore.
        </p>
        {noAdminYet && (
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-2">
              Nessun amministratore configurato ancora: puoi diventare il primo.
            </p>
            <Button onClick={becomeAdmin} disabled={busy}>
              {busy ? "Attendere…" : "Diventa amministratore"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}