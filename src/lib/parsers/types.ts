export interface ParsedLineItem {
  item_description: string;
  manufacturer_code?: string;
  technical_spec?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
export type Parser = (buffer: ArrayBuffer, filename: string) => ParsedLineItem[] | Promise<ParsedLineItem[]>;