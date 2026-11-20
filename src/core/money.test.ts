import { describe, expect, it } from 'vitest';
import { appendAmountKey, centsToAmountText, changeFor, formatEur, parsePrice } from './money';

describe('money', () => {
  it('formats cents as euros with a decimal comma', () => {
    expect(formatEur(129).replace(/\s/g, ' ')).toBe('1,29 €');
    expect(formatEur(0).replace(/\s/g, ' ')).toBe('0,00 €');
    expect(formatEur(123456).replace(/\s/g, ' ')).toBe('1234,56 €'); // sl-SI doesn't group 4-digit numbers
  });

  it('parses typed prices', () => {
    expect(parsePrice('1,29')).toBe(129);
    expect(parsePrice('1.29')).toBe(129);
    expect(parsePrice('2')).toBe(200);
    expect(parsePrice('3,5')).toBe(350);
    expect(parsePrice('€ 0,05')).toBe(5);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('1,234')).toBeNull();
    expect(parsePrice('-1')).toBeNull();
  });

  it('computes change, negative when short', () => {
    expect(changeFor(1250, 2000)).toBe(750);
    expect(changeFor(1250, 1000)).toBe(-250);
    expect(changeFor(1250, 1250)).toBe(0);
  });

  it('builds amounts from number-pad keys', () => {
    const type = (keys: string[]) => keys.reduce(appendAmountKey, '');
    expect(type(['1', '2', ',', '5'])).toBe('12,5');
    expect(type([',', '5'])).toBe('0,5');
    expect(type(['1', ',', '2', '3', '4'])).toBe('1,23');
    expect(type(['1', ',', ',', '2'])).toBe('1,2');
    expect(type(['0', '0', '7'])).toBe('7');
    expect(type(['1', '2', 'back'])).toBe('1');
    expect(type(['back'])).toBe('');
    expect(type(['x'])).toBe('');
    expect(type(Array(20).fill('9')).length).toBe(8);
  });

  it('turns cents back into number-pad text', () => {
    expect(centsToAmountText(2500)).toBe('25');
    expect(centsToAmountText(1250)).toBe('12,5');
    expect(centsToAmountText(1205)).toBe('12,05');
    expect(centsToAmountText(0)).toBe('0');
    expect(parsePrice(centsToAmountText(1205))).toBe(1205);
  });
});
