import type { Parser, ParsedLineItem } from "./types";

function tryDecodeText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  let run = "";
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c >= 32 && c < 127) run += String.fromCharCode(c);
    else if (c === 10 || c === 13) { if (run.length > 3) out += run + "\n"; run = ""; }
    else { if (run.length > 3) out += run + " "; run = ""; }
  }
  return out;
}
function num(v: string): number {
  const s = v.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
export const genericPdfParser: Parser = (buffer) => {
  const text = tryDecodeText(buffer);
  const lines = text.split(/\n+/);
  const items: ParsedLineItem[] = [];
  const re = /^(.+?)\s+(\d{1,4}(?:[.,]\d+)?)\s+(\d{1,6}(?:[.,]\d+))\s+(\d{1,6}(?:[.,]\d+))$/;
  for (const ln of lines) {
    const m = ln.trim().match(re);
    if (!m) continue;
    items.push({
      item_description: m[1].trim(),
      quantity: num(m[2]),
      unit_price: num(m[3]),
      total_price: num(m[4]),
    });
  }
  return items;
};