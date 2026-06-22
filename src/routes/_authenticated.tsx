import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";

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
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Account in attesa di approvazione</h1>
          <p className="text-sm text-muted-foreground">
            Il tuo account non ha ancora un ruolo assegnato. Contatta l'amministratore.
          </p>
        </div>
      </div>
    );
  }
  return <AppShell><Outlet /></AppShell>;
}