import ExcelJS from "exceljs";
import type { Parser, ParsedLineItem } from "./types";

const HEADER_MAP: Record<string, keyof ParsedLineItem> = {
  descrizione: "item_description",
  "descrizione articolo": "item_description",
  articolo: "item_description",
  codice: "manufacturer_code",
  "codice articolo": "manufacturer_code",
  "codice produttore": "manufacturer_code",
  spec: "technical_spec",
  specifica: "technical_spec",
  "specifica tecnica": "technical_spec",
  quantita: "quantity",
  "quantità": "quantity",
  qta: "quantity",
  qty: "quantity",
  "prezzo unitario": "unit_price",
  prezzo: "unit_price",
  importo: "total_price",
  totale: "total_price",
  "totale riga": "total_price",
};

function num(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export const genericExcelParser: Parser = async (buffer) => {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (wb.xlsx.load as any)(new Uint8Array(buffer));
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const rows: any[][] = [];
  sheet.eachRow((row) => {
    rows.push(row.values as any[]);
  });

  // exceljs row.values is 1-indexed (index 0 is null); normalize to 0-indexed arrays
  const normalizedRows = rows.map((r) => {
    const arr = Array.isArray(r) ? r.slice(1) : [];
    return arr.map((c) => {
      if (c && typeof c === "object" && "result" in c) return c.result;
      if (c && typeof c === "object" && "text" in c) return c.text;
      return c ?? "";
    });
  });

  if (normalizedRows.length < 2) return [];

  let headerIdx = 0;
  for (let i = 0; i < Math.min(normalizedRows.length, 10); i++) {
    const matches = normalizedRows[i].filter(
      (c) => typeof c === "string" && HEADER_MAP[c.trim().toLowerCase()],
    ).length;
    if (matches >= 2) { headerIdx = i; break; }
  }

  const headers = normalizedRows[headerIdx].map((h) =>
    HEADER_MAP[String(h ?? "").trim().toLowerCase()],
  );

  const items: ParsedLineItem[] = [];
  for (let i = headerIdx + 1; i < normalizedRows.length; i++) {
    const row = normalizedRows[i];
    if (!row || row.every((c) => c === "" || c == null)) continue;
    const item: ParsedLineItem = { item_description: "", quantity: 1, unit_price: 0, total_price: 0 };
    row.forEach((cell, idx) => {
      const field = headers[idx];
      if (!field) return;
      if (field === "quantity" || field === "unit_price" || field === "total_price") {
        (item as any)[field] = num(cell);
      } else {
        (item as any)[field] = String(cell ?? "").trim();
      }
    });
    if (!item.item_description && !item.manufacturer_code) continue;
    if (item.total_price === 0) item.total_price = +(item.quantity * item.unit_price).toFixed(2);
    items.push(item);
  }
  return items;
};
