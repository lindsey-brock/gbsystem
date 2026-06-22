import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elettro CRM" },
      { name: "description", content: "Gestionale per piccola impresa elettrica" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { loading, user, role } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (role === "contractor") navigate({ to: "/ore" });
    else navigate({ to: "/dashboard" });
  }, [loading, user, role, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Caricamento…
    </div>
  );
}
