import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Accedi · Elettro CRM" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account creato. Controlla la tua email se richiesto.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Errore di autenticazione");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <Zap className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Elettro CRM</h1>
            <p className="text-xs text-muted-foreground">Gestionale impresa elettrica</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwd">Password</Label>
            <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Attendere…" : mode === "login" ? "Accedi" : "Registrati"}
          </Button>
        </form>
        <div className="text-sm text-center text-muted-foreground">
          {mode === "login" ? (
            <>Non hai un account?{" "}
              <button className="text-primary underline" onClick={() => setMode("signup")}>Registrati</button>
            </>
          ) : (
            <>Hai già un account?{" "}
              <button className="text-primary underline" onClick={() => setMode("login")}>Accedi</button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Il primo utente registrato deve essere assegnato come <b>admin</b> dal proprietario.
        </p>
        <div className="text-xs text-center"><Link to="/" className="text-muted-foreground hover:underline">← Torna indietro</Link></div>
      </Card>
    </div>
  );
}