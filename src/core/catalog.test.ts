import { beforeEach, describe, expect, it } from 'vitest';
import {
  findByCode, loadCatalog, mergeProducts, parseBackup, parseCatalog, parseProduct, removeProduct, saveCatalog,
  serializeBackup, upsert, type Product,
} from './catalog';

const milk: Product = { code: '111', name: 'Mleko', priceCents: 129, emoji: '🥛' };
const bread: Product = { code: '222', name: 'Kruh', priceCents: 250, emoji: '🍞' };

describe('catalog', () => {
  beforeEach(() => localStorage.clear());

  it('validates and cleans a product', () => {
    expect(parseProduct({ code: ' 111 ', name: ' Mleko ', priceCents: 129, emoji: '' })).toEqual({ ...milk, emoji: '🛒' });
    expect(parseProduct({ code: '', name: 'x', priceCents: 1 })).toBeNull();
    expect(parseProduct({ code: '1', name: '', priceCents: 1 })).toBeNull();
    expect(parseProduct({ code: '1', name: 'x', priceCents: 1.5 })).toBeNull();
    expect(parseProduct({ code: '1', name: 'x', priceCents: -1 })).toBeNull();
    expect(parseProduct(null)).toBeNull();
  });

  it('only keeps data-URL photos', () => {
    expect(parseProduct({ ...milk, photo: 'https://evil.example/x.png' })?.photo).toBeUndefined();
    expect(parseProduct({ ...milk, photo: 'data:image/jpeg;base64,AA' })?.photo).toBe('data:image/jpeg;base64,AA');
  });

  it('upserts, removes and finds by code', () => {
    let list = upsert(upsert([], milk), bread);
    list = upsert(list, { ...milk, priceCents: 139 });
    expect(list).toHaveLength(2);
    expect(findByCode(list, '111')?.priceCents).toBe(139);
    expect(removeProduct(list, '111').map((p) => p.code)).toEqual(['222']);
    expect(findByCode(list, '999')).toBeUndefined();
  });

  it('rejects the whole list if any entry is invalid; later duplicates win', () => {
    expect(parseCatalog([milk, { code: '' }])).toBeNull();
    expect(parseCatalog('nope')).toBeNull();
    expect(parseCatalog([milk, { ...milk, name: 'Mleko 2' }])).toEqual([{ ...milk, name: 'Mleko 2' }]);
  });

  it('round-trips a backup and accepts a bare array', () => {
    expect(parseBackup(serializeBackup([milk, bread]))).toEqual([milk, bread]);
    expect(parseBackup(JSON.stringify([milk]))).toEqual([milk]);
    expect(parseBackup('{not json')).toBeNull();
    expect(parseBackup('{"products": 3}')).toBeNull();
  });

  it('merges imports over existing products', () => {
    const merged = mergeProducts([milk, bread], [{ ...bread, priceCents: 300 }, { code: '333', name: 'Sir', priceCents: 400, emoji: '🧀' }]);
    expect(merged.map((p) => [p.code, p.priceCents])).toEqual([['111', 129], ['222', 300], ['333', 400]]);
  });

  it('persists to localStorage and survives corrupt data', () => {
    saveCatalog([milk]);
    expect(loadCatalog()).toEqual([milk]);
    localStorage.setItem('catalog', '{broken');
    expect(loadCatalog()).toEqual([]);
  });
});
