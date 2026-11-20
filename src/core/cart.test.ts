import { describe, expect, it } from 'vitest';
import { addProduct, MAX_QTY, parseCart, removeLine, setQty, totalCents } from './cart';
import type { Product } from './catalog';

const milk: Product = { code: '111', name: 'Mleko', priceCents: 129, emoji: '🥛' };
const bread: Product = { code: '222', name: 'Kruh', priceCents: 250, emoji: '🍞', photo: 'data:image/jpeg;base64,AA' };

describe('cart', () => {
  it('adds new products as lines and merges repeats into the quantity', () => {
    let cart = addProduct([], milk);
    cart = addProduct(cart, bread);
    cart = addProduct(cart, milk);
    expect(cart.map((l) => [l.code, l.qty])).toEqual([['111', 2], ['222', 1]]);
    expect(cart[1]?.photo).toBe(bread.photo);
  });

  it('totals in integer cents', () => {
    const cart = addProduct(addProduct(addProduct([], milk), milk), bread);
    expect(totalCents(cart)).toBe(129 * 2 + 250);
    expect(totalCents([])).toBe(0);
  });

  it('removes a line when the quantity drops to zero', () => {
    const cart = addProduct(addProduct([], milk), bread);
    expect(setQty(cart, '111', 0).map((l) => l.code)).toEqual(['222']);
    expect(removeLine(cart, '222').map((l) => l.code)).toEqual(['111']);
  });

  it('caps the quantity', () => {
    expect(setQty(addProduct([], milk), '111', 500)[0]?.qty).toBe(MAX_QTY);
  });

  it('keeps the receipt price when the catalog changes later', () => {
    const cart = addProduct([], milk);
    milk.priceCents = 999;
    expect(totalCents(cart)).toBe(129);
    milk.priceCents = 129;
  });

  it('round-trips through parseCart and rejects garbage', () => {
    const cart = addProduct(addProduct([], milk), bread);
    expect(parseCart(JSON.parse(JSON.stringify(cart)))).toEqual(cart);
    expect(parseCart({})).toBeNull();
    expect(parseCart([{ code: 'x' }])).toBeNull();
    expect(parseCart([{ ...cart[0], qty: 0 }])).toBeNull();
  });
});
