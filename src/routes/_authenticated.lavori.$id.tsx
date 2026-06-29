import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Lavoro detail moved to /clienti/$id/lavori/$jobId. Redirect old bookmarked
// links straight to the new nested location.
export const Route = createFileRoute("/_authenticated/lavori/$id")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.from("jobs").select("client_id").eq("id", params.id).maybeSingle();
    if (data?.client_id) {
      throw redirect({ to: "/clienti/$id/lavori/$jobId", params: { id: data.client_id, jobId: params.id } });
    }
    throw redirect({ to: "/clienti" });
  },
});
