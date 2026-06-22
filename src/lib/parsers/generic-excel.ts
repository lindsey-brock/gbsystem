import * as XLSX from "xlsx";
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

export const genericExcelParser: Parser = (buffer) => {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: "" });
  if (rows.length < 2) return [];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const matches = (rows[i] as any[]).filter(
      (c) => typeof c === "string" && HEADER_MAP[c.trim().toLowerCase()],
    ).length;
    if (matches >= 2) { headerIdx = i; break; }
  }
  const headers = (rows[headerIdx] as any[]).map((h) =>
    HEADER_MAP[(String(h ?? "").trim().toLowerCase())],
  );
  const items: ParsedLineItem[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] as any[];
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