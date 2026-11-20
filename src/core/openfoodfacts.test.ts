import { describe, expect, it, vi } from 'vitest';
import { isBarcode, lookupProduct, parseOffName, parseOffProduct } from './openfoodfacts';

const found = (product: Record<string, unknown>) => ({ status: 1, product });
const respond = (body: unknown, ok = true): typeof fetch =>
  vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch;

describe('openfoodfacts', () => {
  it('accepts only numeric barcodes', () => {
    expect(isBarcode('3017620422003')).toBe(true);
    expect(isBarcode('12345')).toBe(false);
    expect(isBarcode('ABC12345678')).toBe(false);
    expect(isBarcode('')).toBe(false);
  });

  it('prefers the Slovene name, then the general one, then the generic name', () => {
    expect(parseOffName(found({ product_name_sl: ' Lešnikov namaz ', product_name: 'Nutella' }))).toBe('Lešnikov namaz');
    expect(parseOffName(found({ product_name: 'Nutella' }))).toBe('Nutella');
    expect(parseOffName(found({ product_name: '', generic_name: 'Hazelnut spread' }))).toBe('Hazelnut spread');
  });

  it('turns ALL CAPS names into sentence case but leaves mixed case alone', () => {
    expect(parseOffName(found({ product_name: 'DONAT' }))).toBe('Donat');
    expect(parseOffName(found({ product_name: 'MLEKO ALPSKO 3,5%' }))).toBe('Mleko alpsko 3,5%');
    expect(parseOffName(found({ product_name: 'Donat Mg' }))).toBe('Donat Mg');
    expect(parseOffName(found({ product_name: '123' }))).toBe('123');
  });

  it('returns null for unknown products and garbage', () => {
    expect(parseOffName({ status: 0, status_verbose: 'product not found' })).toBeNull();
    expect(parseOffName(found({ product_name: '  ' }))).toBeNull();
    expect(parseOffName(found({}))).toBeNull();
    expect(parseOffName(null)).toBeNull();
    expect(parseOffName('nope')).toBeNull();
  });

  it('shortens very long names', () => {
    const name = parseOffName(found({ product_name: 'x'.repeat(100) }));
    expect(name?.length).toBe(40);
    expect(name?.endsWith('…')).toBe(true);
  });

  it('adds an emoji from the categories when one fits', () => {
    expect(parseOffProduct(found({ product_name: 'DONAT', categories_tags: ['en:beverages', 'en:waters'] })))
      .toEqual({ name: 'Donat', emoji: '💧' });
    expect(parseOffProduct(found({ product_name: 'Nutella', categories_tags: ['en:spreads', 'en:chocolate-spreads'] })))
      .toEqual({ name: 'Nutella', emoji: '🍫' });
    expect(parseOffProduct(found({ product_name: 'X', categories_tags: 'nope' }))).toEqual({ name: 'X', emoji: null });
    expect(parseOffProduct({ status: 0 })).toBeNull();
  });

  it('looks a barcode up with a field filter', async () => {
    const fetchImpl = respond(found({ product_name: 'Nutella' }));
    expect(await lookupProduct('3017620422003', fetchImpl)).toEqual({ name: 'Nutella', emoji: null });
    const url = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain('/api/v2/product/3017620422003.json');
    expect(url).toContain('fields=');
  });

  it('never throws: network errors, bad statuses and non-barcodes give null', async () => {
    const failing = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await lookupProduct('3017620422003', failing)).toBeNull();
    expect(await lookupProduct('3017620422003', respond({}, false))).toBeNull();
    const never = vi.fn();
    expect(await lookupProduct('not a code', never as unknown as typeof fetch)).toBeNull();
    expect(never).not.toHaveBeenCalled();
  });

  it('gives up after the timeout', async () => {
    const hanging = ((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    })) as unknown as typeof fetch;
    expect(await lookupProduct('3017620422003', hanging, 20)).toBeNull();
  });
});
