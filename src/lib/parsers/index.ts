import type { ParsedLineItem, Parser } from "./types";
import { genericExcelParser } from "./generic-excel";
import { genericPdfParser } from "./generic-pdf";

export type { ParsedLineItem } from "./types";

const REGISTRY: Record<string, Parser> = {
  generic: genericExcelParser,
  generic_excel: genericExcelParser,
  generic_pdf: genericPdfParser,
  excel_a: genericExcelParser,
  pdf_b: genericPdfParser,
};

export async function parseBolla(systemType: string, buffer: ArrayBuffer, filename: string): Promise<ParsedLineItem[]> {
  const isExcel = /\.(xlsx?|csv)$/i.test(filename);
  const isPdf = /\.pdf$/i.test(filename);
  const parser =
    REGISTRY[systemType] ?? (isExcel ? genericExcelParser : isPdf ? genericPdfParser : genericExcelParser);
  return parser(buffer, filename);
}