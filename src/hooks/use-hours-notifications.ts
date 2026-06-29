import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Admin-only: live toast the moment a contractor submits hours for approval
// (submitted flips false -> true), distinct from other updates to the same
// row (approve, reassign) which don't trigger this transition.
export function useHoursNotifications(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("logged_hours-submissions")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "logged_hours" },
        (payload) => {
          const before = payload.old as any;
          const after = payload.new as any;
          if (before?.submitted === false && after?.submitted === true) {
            toast("Nuove ore inviate", { description: "Un operaio ha inviato ore per approvazione." });
            qc.invalidateQueries({ queryKey: ["pending-hours-count"] });
            qc.invalidateQueries({ queryKey: ["pending-hours-by-contractor"] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
