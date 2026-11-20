// All money is integer cents; never floats.

const eur = new Intl.NumberFormat('sl-SI', { style: 'currency', currency: 'EUR' });

export function formatEur(cents: number): string {
  return eur.format(cents / 100);
}

/** "1,29" / "1.29" / "2" / "€ 3,5" -> cents; null when it is not a valid non-negative price. */
export function parsePrice(text: string): number | null {
  const s = text.replace(/[€\s]/g, '');
  const m = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const decimals = (m[2] ?? '').padEnd(2, '0');
  return Number(m[1]) * 100 + Number(decimals);
}

/** Change to hand back; negative when the customer still owes money. */
export function changeFor(totalCents: number, givenCents: number): number {
  return givenCents - totalCents;
}

const MAX_AMOUNT_CHARS = 8;

/**
 * Applies a number-pad key to the typed amount ("12,5"). Keys: 0-9, ',' and 'back'.
 * Keeps at most 2 decimals and one comma; a leading comma becomes "0,".
 */
export function appendAmountKey(buffer: string, key: string): string {
  if (key === 'back') return buffer.slice(0, -1);
  if (buffer.length >= MAX_AMOUNT_CHARS) return buffer;
  if (key === ',') {
    if (buffer.includes(',')) return buffer;
    return (buffer === '' ? '0' : buffer) + ',';
  }
  if (!/^\d$/.test(key)) return buffer;
  const comma = buffer.indexOf(',');
  if (comma >= 0 && buffer.length - comma > 2) return buffer;
  if (buffer === '0') return key; // no leading zeros
  return buffer + key;
}

/** Cents -> text for the number pad ("1250" -> "12,5", "1200" -> "12"). Inverse of parsePrice for typed amounts. */
export function centsToAmountText(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  if (frac === 0) return String(whole);
  return `${whole},${String(frac).padStart(2, '0').replace(/0$/, '')}`;
}
