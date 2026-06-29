import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export const PAGAMENTO_STATUS_LABEL: Record<string, string> = {
  da_pagare: "Da pagare",
  pagato: "Pagato",
};

export function PagamentoStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={status === "pagato" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}
    >
      {PAGAMENTO_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function MarkPaidDialog({ pagamentoId, onPaid }: { pagamentoId: string; onPaid: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Segna come pagato</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Segna pagamento come pagato</DialogTitle></DialogHeader>
        <MarkPaidForm pagamentoId={pagamentoId} onSaved={() => { setOpen(false); onPaid(); }} />
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidForm({ pagamentoId, onSaved }: { pagamentoId: string; onSaved: () => void }) {
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [metodo, setMetodo] = useState<"contanti" | "bonifico">("bonifico");
  const [note, setNote] = useState("");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pagamenti_operai").update({
        status: "pagato",
        data_pagamento: dataPagamento,
        metodo_pagamento: metodo,
        note: note || null,
      }).eq("id", pagamentoId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pagamento registrato"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
      <div className="space-y-1"><Label>Data pagamento</Label><Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} required /></div>
      <div className="space-y-1"><Label>Metodo</Label>
        <Select value={metodo} onValueChange={(v) => setMetodo(v as "contanti" | "bonifico")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bonifico">Bonifico</SelectItem>
            <SelectItem value="contanti">Contanti</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <Button type="submit" disabled={m.isPending}>Conferma pagamento</Button>
    </form>
  );
}
