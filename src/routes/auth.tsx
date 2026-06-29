import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { GBLogo } from "@/components/GBLogo";
import { WaveBackground } from "@/components/WaveBackground";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Accedi · GB System" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&display=swap" },
    ],
  }),
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
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#0a0414", fontFamily: "'Sora', sans-serif" }}
    >
      <WaveBackground />
      <Card className="w-full max-w-md p-8 space-y-6 border-white/10 bg-[#13091f]/80 text-white backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-3">
          <GBLogo className="h-12 w-auto text-white" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/80">Nome completo</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-white/5 border-white/10 text-white" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwd" className="text-white/80">Password</Label>
            <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-white/5 border-white/10 text-white" />
          </div>
          <Button type="submit" className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white" disabled={busy}>
            {busy ? "Attendere…" : mode === "login" ? "Accedi" : "Registrati"}
          </Button>
        </form>
        <div className="text-sm text-center text-white/60">
          {mode === "login" ? (
            <>Non hai un account?{" "}
              <button className="text-[#a78bfa] underline" onClick={() => setMode("signup")}>Registrati</button>
            </>
          ) : (
            <>Hai già un account?{" "}
              <button className="text-[#a78bfa] underline" onClick={() => setMode("login")}>Accedi</button>
            </>
          )}
        </div>
        <p className="text-xs text-white/50 text-center">
          Il primo utente registrato deve essere assegnato come <b>admin</b> dal proprietario.
        </p>
        <div className="text-xs text-center"><Link to="/" className="text-white/50 hover:underline">← Torna indietro</Link></div>
      </Card>
    </div>
  );
}