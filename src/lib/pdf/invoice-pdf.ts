import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface InvoicePdfInput {
  company: {
    company_name?: string | null;
    partita_iva?: string | null;
    address?: string | null;
    email?: string | null;
  };
  client: {
    name: string;
    address?: string | null;
    partita_iva?: string | null;
    codice_fiscale?: string | null;
  };
  invoice: {
    invoice_number?: string | null;
    invoice_date: string;
    labor_total: number;
    materials_total: number;
    markup_percentage: number;
    markup_total: number;
    grand_total: number;
    notes?: string | null;
  };
  job: { job_name: string };
  laborLines: { contractor: string; hours: number; rate: number; amount: number }[];
  materialLines: { description: string; quantity: number; unit_price: number; total: number }[];
}

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  const width = page.getWidth();
  let y = 800;
  const margin = 40;

  const text = (s: string, x: number, yy: number, opts: { size?: number; bold?: boolean; color?: any } = {}) => {
    page.drawText(s, { x, y: yy, size: opts.size ?? 10, font: opts.bold ? bold : font, color: opts.color ?? rgb(0.1, 0.1, 0.1) });
  };

  text(input.company.company_name ?? "", margin, y, { size: 14, bold: true }); y -= 14;
  if (input.company.address) { text(input.company.address, margin, y); y -= 12; }
  if (input.company.partita_iva) { text(`P.IVA ${input.company.partita_iva}`, margin, y); y -= 12; }
  if (input.company.email) { text(input.company.email, margin, y); y -= 12; }

  y = 800;
  text("FATTURA", width - margin - 100, y, { size: 18, bold: true }); y -= 22;
  text(`N. ${input.invoice.invoice_number ?? "—"}`, width - margin - 100, y); y -= 12;
  text(`Data: ${new Date(input.invoice.invoice_date).toLocaleDateString("it-IT")}`, width - margin - 100, y);

  y = 720;
  text("Cliente:", margin, y, { bold: true }); y -= 14;
  text(input.client.name, margin, y); y -= 12;
  if (input.client.address) { text(input.client.address, margin, y); y -= 12; }
  if (input.client.partita_iva) { text(`P.IVA ${input.client.partita_iva}`, margin, y); y -= 12; }
  if (input.client.codice_fiscale) { text(`C.F. ${input.client.codice_fiscale}`, margin, y); y -= 12; }

  y -= 10;
  text(`Lavoro: ${input.job.job_name}`, margin, y, { bold: true }); y -= 22;

  const drawHeader = (cols: string[], widths: number[]) => {
    let x = margin;
    page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 18, color: rgb(0.93, 0.93, 0.93) });
    cols.forEach((c, i) => { text(c, x + 4, y + 2, { bold: true, size: 9 }); x += widths[i]; });
    y -= 22;
  };
  const drawRow = (cells: string[], widths: number[]) => {
    if (y < 80) { page = doc.addPage([595, 842]); y = 800; }
    let x = margin;
    cells.forEach((c, i) => { text(c, x + 4, y, { size: 9 }); x += widths[i]; });
    y -= 14;
  };

  if (input.laborLines.length) {
    text("Manodopera", margin, y, { bold: true }); y -= 14;
    drawHeader(["Operaio", "Ore", "Tariffa", "Importo"], [260, 70, 90, 95]);
    for (const l of input.laborLines)
      drawRow([l.contractor, l.hours.toFixed(2), eur(l.rate), eur(l.amount)], [260, 70, 90, 95]);
    y -= 6;
    text(`Totale manodopera: ${eur(input.invoice.labor_total)}`, width - margin - 200, y, { bold: true });
    y -= 18;
  }

  if (input.materialLines.length) {
    text("Materiali", margin, y, { bold: true }); y -= 14;
    drawHeader(["Descrizione", "Q.ta", "Prezzo", "Totale"], [260, 70, 90, 95]);
    for (const l of input.materialLines)
      drawRow([l.description.slice(0, 60), l.quantity.toString(), eur(l.unit_price), eur(l.total)], [260, 70, 90, 95]);
    y -= 6;
    text(`Totale materiali: ${eur(input.invoice.materials_total)}`, width - margin - 200, y, { bold: true });
    y -= 14;
    text(`Ricarico (${input.invoice.markup_percentage}%): ${eur(input.invoice.markup_total)}`, width - margin - 200, y);
    y -= 18;
  }

  y -= 20;
  page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: width - margin, y: y + 8 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
  text("TOTALE", width - margin - 200, y - 4, { bold: true, size: 12 });
  text(eur(input.invoice.grand_total), width - margin - 90, y - 4, { bold: true, size: 12 });

  if (input.invoice.notes) {
    y -= 30;
    text("Note:", margin, y, { bold: true }); y -= 12;
    text(input.invoice.notes.slice(0, 400), margin, y);
  }

  return await doc.save();
}