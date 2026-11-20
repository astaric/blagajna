import { readJson, writeJson } from './storage';

export interface Product {
  code: string;
  name: string;
  priceCents: number;
  /** Shown when there is no photo. */
  emoji: string;
  /** Small JPEG data URL, optional. */
  photo?: string;
}

export const CATALOG_KEY = 'catalog';
export const DEFAULT_EMOJI = '🛒';

/** Returns a clean Product or null when the value isn't a valid one. */
export function parseProduct(raw: unknown): Product | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.code !== 'string' || o.code.trim() === '') return null;
  if (typeof o.name !== 'string' || o.name.trim() === '') return null;
  if (!Number.isInteger(o.priceCents) || (o.priceCents as number) < 0) return null;
  const emoji = typeof o.emoji === 'string' && o.emoji.trim() !== '' ? o.emoji.trim() : DEFAULT_EMOJI;
  const photo = typeof o.photo === 'string' && o.photo.startsWith('data:image/') ? o.photo : undefined;
  return {
    code: o.code.trim(), name: o.name.trim(), priceCents: o.priceCents as number, emoji,
    ...(photo ? { photo } : {}),
  };
}

/** Parses a list of products; null if it isn't an array or any entry is invalid. Later duplicates win. */
export function parseCatalog(raw: unknown): Product[] | null {
  if (!Array.isArray(raw)) return null;
  const byCode = new Map<string, Product>();
  for (const r of raw) {
    const p = parseProduct(r);
    if (!p) return null;
    byCode.set(p.code, p);
  }
  return [...byCode.values()];
}

/** Backup text -> products; accepts a bare array or `{ products: [...] }`. */
export function parseBackup(text: string): Product[] | null {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) raw = (raw as { products?: unknown }).products;
  return parseCatalog(raw);
}

export function serializeBackup(products: readonly Product[]): string {
  return JSON.stringify({ products }, null, 2);
}

export function upsert(products: readonly Product[], product: Product): Product[] {
  const i = products.findIndex((p) => p.code === product.code);
  if (i < 0) return [...products, product];
  return products.map((p, j) => (j === i ? product : p));
}

export function removeProduct(products: readonly Product[], code: string): Product[] {
  return products.filter((p) => p.code !== code);
}

export function findByCode(products: readonly Product[], code: string): Product | undefined {
  return products.find((p) => p.code === code);
}

/** Replaces entries with the same code, keeps the rest. */
export function mergeProducts(products: readonly Product[], incoming: readonly Product[]): Product[] {
  return incoming.reduce<Product[]>((acc, p) => upsert(acc, p), [...products]);
}

export function loadCatalog(): Product[] {
  return parseCatalog(readJson(CATALOG_KEY)) ?? [];
}

export function saveCatalog(products: readonly Product[]): void {
  writeJson(CATALOG_KEY, products);
}
