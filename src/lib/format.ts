export const eur = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v || 0);
};
export const itDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
};
export const itMonth = (d: string | Date) =>
  new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(new Date(d));
export const ymdMonth = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const num = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(v || 0);
};
export const JOB_STATUS_LABEL: Record<string, string> = {
  active: "Attivo",
  completed: "Completato",
  invoiced: "Fatturato",
};
export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: "Bozza",
  sent: "Inviata",
  paid: "Pagata",
};
export const INTERVENTION_LABEL: Record<string, string> = {
  nuovo_impianto: "Nuovo impianto",
  trasformazione: "Trasformazione",
  ampliamento: "Ampliamento",
  manutenzione_straordinaria: "Manutenzione straordinaria",
};