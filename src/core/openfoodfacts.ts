// Product lookup by barcode in Open Food Facts: a short name plus an emoji from the product's categories.
// Free, no API key, CORS-enabled; the data is open (ODbL) and credited in parent mode. Everything here is
// best-effort: any failure just means "no result" and the caller falls back to its defaults.

import { emojiForCategories } from './emoji';

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product/';
const FIELDS = 'product_name,product_name_sl,generic_name,generic_name_sl,categories_tags';
const MAX_NAME = 40;

/** Only real barcodes (EAN/UPC) are worth a request; the scanner can also deliver arbitrary text. */
export function isBarcode(code: string): boolean {
  return /^\d{6,14}$/.test(code);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Picks a short display name from an Open Food Facts response, preferring Slovene. Null when there is none. */
export function parseOffName(json: unknown): string | null {
  if (typeof json !== 'object' || json === null) return null;
  const o = json as { status?: unknown; product?: unknown };
  if (o.status !== 1 || typeof o.product !== 'object' || o.product === null) return null;
  const p = o.product as Record<string, unknown>;
  const name = text(p.product_name_sl) || text(p.product_name) || text(p.generic_name_sl) || text(p.generic_name);
  if (name === '') return null;
  return shorten(sentenceCase(name));
}

export interface OffProduct {
  name: string;
  /** From the product's categories; null when none matches (the caller keeps its default emoji). */
  emoji: string | null;
}

/** Name plus category emoji from an Open Food Facts response, or null when there is no usable name. */
export function parseOffProduct(json: unknown): OffProduct | null {
  const name = parseOffName(json);
  if (name === null) return null;
  const tags = (json as { product: { categories_tags?: unknown } }).product.categories_tags;
  return { name, emoji: Array.isArray(tags) ? emojiForCategories(tags) : null };
}

/** Packaging data is often ALL CAPS ("DONAT"); show "Donat". Mixed-case names are left alone. */
function sentenceCase(name: string): string {
  if (name !== name.toUpperCase() || name === name.toLowerCase()) return name;
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function shorten(name: string): string {
  return name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1).trimEnd()}…` : name;
}

/** Looks a barcode up; resolves to a product or null (unknown code, offline, timeout, bad response). Never rejects. */
export async function lookupProduct(code: string, fetchImpl: typeof fetch = fetch, timeoutMs = 4000): Promise<OffProduct | null> {
  if (!isBarcode(code)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${ENDPOINT}${code}.json?fields=${FIELDS}`, { signal: controller.signal });
    if (!res.ok) return null;
    return parseOffProduct(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
