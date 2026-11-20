import type { Product } from './catalog';

/** A receipt line keeps a snapshot of the product so editing the catalog mid-sale doesn't change it. */
export interface Line {
  code: string;
  name: string;
  priceCents: number;
  emoji: string;
  photo?: string;
  qty: number;
}

export type Cart = readonly Line[];

export const MAX_QTY = 99;

export function addProduct(cart: Cart, product: Product): Cart {
  const existing = cart.find((l) => l.code === product.code);
  if (existing) return setQty(cart, product.code, existing.qty + 1);
  const line: Line = {
    code: product.code, name: product.name, priceCents: product.priceCents, emoji: product.emoji, qty: 1,
    ...(product.photo ? { photo: product.photo } : {}),
  };
  return [...cart, line];
}

/** Quantity 0 (or less) removes the line; quantities are capped at MAX_QTY. */
export function setQty(cart: Cart, code: string, qty: number): Cart {
  if (qty <= 0) return removeLine(cart, code);
  return cart.map((l) => (l.code === code ? { ...l, qty: Math.min(qty, MAX_QTY) } : l));
}

export function removeLine(cart: Cart, code: string): Cart {
  return cart.filter((l) => l.code !== code);
}

export function lineTotalCents(line: Line): number {
  return line.priceCents * line.qty;
}

export function totalCents(cart: Cart): number {
  return cart.reduce((sum, l) => sum + lineTotalCents(l), 0);
}

/** Shape check for a cart read back from storage. Returns null when anything is off. */
export function parseCart(raw: unknown): Cart | null {
  if (!Array.isArray(raw)) return null;
  const lines: Line[] = [];
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) return null;
    const o = r as Record<string, unknown>;
    if (typeof o.code !== 'string' || typeof o.name !== 'string' || typeof o.emoji !== 'string') return null;
    if (!Number.isInteger(o.priceCents) || (o.priceCents as number) < 0) return null;
    if (!Number.isInteger(o.qty) || (o.qty as number) < 1 || (o.qty as number) > MAX_QTY) return null;
    lines.push({
      code: o.code, name: o.name, emoji: o.emoji, priceCents: o.priceCents as number, qty: o.qty as number,
      ...(typeof o.photo === 'string' ? { photo: o.photo } : {}),
    });
  }
  return lines;
}
