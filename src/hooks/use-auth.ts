import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: "admin" | "contractor" | null;
  contractorId: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    role: null,
    contractorId: null,
  });

  useEffect(() => {
    let active = true;
    async function loadRole(user: User | null) {
      if (!user) {
        if (active) setState({ loading: false, session: null, user: null, role: null, contractorId: null });
        return;
      }
      const [{ data: roleData }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("contractor_id").eq("id", user.id).maybeSingle(),
      ]);
      const roles = (roleData ?? []).map((r) => r.role);
      const role: "admin" | "contractor" | null =
        roles.includes("admin") ? "admin" : roles.includes("contractor") ? "contractor" : null;
      if (!active) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        user,
        role,
        contractorId: profile?.contractor_id ?? null,
      }));
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState((p) => ({ ...p, session: data.session ?? null }));
      loadRole(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((p) => ({ ...p, session: session ?? null }));
      loadRole(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}