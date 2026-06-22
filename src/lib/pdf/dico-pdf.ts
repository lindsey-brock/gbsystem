import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface DicoPdfInput {
  dico: {
    installer_company_name?: string | null;
    installer_legal_rep_name?: string | null;
    responsabile_tecnico_name?: string | null;
    responsabile_tecnico_qualification?: string | null;
    intervention_type?: string | null;
    client_name?: string | null;
    client_address?: string | null;
    property_use?: string | null;
    technical_norms_followed?: string | null;
    notes?: string | null;
  };
  job: { job_name: string };
  materials: { description: string; manufacturer_code?: string | null; quantity: number }[];
}

const INTERVENTION: Record<string, string> = {
  nuovo_impianto: "Nuovo impianto",
  trasformazione: "Trasformazione",
  ampliamento: "Ampliamento",
  manutenzione_straordinaria: "Manutenzione straordinaria",
};

export async function buildDicoPdf(input: DicoPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  const width = page.getWidth();
  const margin = 40;
  let y = 800;

  const text = (s: string, x: number, yy: number, o: { size?: number; bold?: boolean; color?: any } = {}) => {
    page.drawText(s, { x, y: yy, size: o.size ?? 10, font: o.bold ? bold : font, color: o.color ?? rgb(0.1, 0.1, 0.1) });
  };
  const wrap = (s: string, max: number) => {
    const words = s.split(" "); const out: string[] = []; let cur = "";
    for (const w of words) {
      if ((cur + " " + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
    }
    if (cur) out.push(cur); return out;
  };
  const newPageIfNeeded = (need = 80) => {
    if (y < need) { page = doc.addPage([595, 842]); y = 800; }
  };

  text("BOZZA DICHIARAZIONE DI CONFORMITA (DICO)", margin, y, { size: 14, bold: true }); y -= 16;
  text("DM 37/08 - DOCUMENTO IN BOZZA, NON UTILIZZARE COME DICHIARAZIONE LEGALE", margin, y, { size: 9, color: rgb(0.7, 0.1, 0.1) });
  y -= 24;

  const disclaimer =
    "Questo documento e' una bozza generata per assistere la preparazione. Deve essere rivista, completata con lo schema dell'impianto e firmata dall'installatore qualificato / Responsabile Tecnico in conformita' al DM 37/08. Questo strumento NON costituisce dichiarazione legale di conformita'.";
  page.drawRectangle({ x: margin, y: y - 56, width: width - margin * 2, height: 60, borderColor: rgb(0.7, 0.1, 0.1), borderWidth: 1, color: rgb(1, 0.96, 0.92) });
  const dlines = wrap(disclaimer, 110);
  let dy = y - 8;
  for (const ln of dlines) { text(ln, margin + 6, dy, { size: 9 }); dy -= 11; }
  y -= 70;

  const section = (label: string, value: string) => {
    newPageIfNeeded();
    text(label, margin, y, { bold: true, size: 9 }); y -= 12;
    const lines = wrap(value || "—", 95);
    for (const ln of lines) { text(ln, margin, y); y -= 12; }
    y -= 6;
  };

  section("Impresa installatrice", input.dico.installer_company_name ?? "—");
  section("Legale rappresentante", input.dico.installer_legal_rep_name ?? "—");
  section("Responsabile Tecnico", `${input.dico.responsabile_tecnico_name ?? "—"} (${input.dico.responsabile_tecnico_qualification ?? "—"})`);
  section("Tipologia intervento", INTERVENTION[input.dico.intervention_type ?? ""] ?? "—");
  section("Committente", input.dico.client_name ?? "—");
  section("Ubicazione impianto", input.dico.client_address ?? "—");
  section("Uso dell'immobile", input.dico.property_use ?? "—");
  section("Norme tecniche seguite", input.dico.technical_norms_followed ?? "—");
  section("Lavoro", input.job.job_name);

  newPageIfNeeded(120);
  text("Relazione tipologica dei materiali utilizzati", margin, y, { bold: true }); y -= 14;
  page.drawRectangle({ x: margin, y: y - 2, width: width - margin * 2, height: 16, color: rgb(0.93, 0.93, 0.93) });
  text("Descrizione", margin + 4, y + 3, { bold: true, size: 9 });
  text("Codice", margin + 320, y + 3, { bold: true, size: 9 });
  text("Q.ta", margin + 440, y + 3, { bold: true, size: 9 });
  y -= 18;
  for (const m of input.materials) {
    newPageIfNeeded();
    text(m.description.slice(0, 60), margin + 4, y, { size: 9 });
    text((m.manufacturer_code ?? "").slice(0, 20), margin + 320, y, { size: 9 });
    text(m.quantity.toString(), margin + 440, y, { size: 9 });
    y -= 12;
  }

  newPageIfNeeded(200);
  y -= 20;
  text("Da completare offline", margin, y, { bold: true, size: 11 }); y -= 14;
  const box = (label: string) => {
    newPageIfNeeded(70);
    page.drawRectangle({ x: margin, y: y - 50, width: width - margin * 2, height: 50, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1, color: rgb(0.98, 0.98, 0.98) });
    text(label, margin + 6, y - 12, { bold: true, size: 9 });
    y -= 60;
  };
  box("Schema planimetrico dell'impianto - allegare");
  box("Firma Responsabile Tecnico");
  box("Timbro azienda");

  return await doc.save();
}