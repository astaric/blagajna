import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachScanner, MAX_GAP_MS, ScanBuffer } from './scanner';

function type(buf: ScanBuffer, keys: string[], start = 0, gap = 10) {
  return keys.map((k, i) => buf.push(k, start + i * gap));
}

describe('ScanBuffer', () => {
  it('returns the code when Enter ends a fast burst', () => {
    const buf = new ScanBuffer();
    const results = type(buf, [...'3830001234567', 'Enter']);
    expect(results.at(-1)?.scan).toBe('3830001234567');
    expect(results.every((r) => r.consumed)).toBe(true);
  });

  it('accepts Tab as the terminator', () => {
    const buf = new ScanBuffer();
    expect(type(buf, [...'12345678', 'Tab']).at(-1)?.scan).toBe('12345678');
  });

  it('ignores a too-short buffer and lets Enter through', () => {
    const buf = new ScanBuffer();
    const last = type(buf, ['1', '2', 'Enter']).at(-1);
    expect(last?.scan).toBeUndefined();
    expect(last?.consumed).toBe(false);
  });

  it('discards stale characters after a long pause', () => {
    const buf = new ScanBuffer();
    buf.push('9', 0);
    buf.push('9', 10);
    const results = type(buf, [...'12345678', 'Enter'], 10 + MAX_GAP_MS + 1);
    expect(results.at(-1)?.scan).toBe('12345678');
  });

  it('ignores modifier and navigation keys without clearing the buffer', () => {
    const buf = new ScanBuffer();
    const results = type(buf, ['1', '2', 'Shift', '3', '4', 'Enter']);
    expect(results[2]?.consumed).toBe(false);
    expect(results.at(-1)?.scan).toBe('1234');
  });

  it('starts clean after a scan', () => {
    const buf = new ScanBuffer();
    type(buf, [...'11112222', 'Enter']);
    expect(type(buf, [...'33334444', 'Enter'], 1000).at(-1)?.scan).toBe('33334444');
  });
});

describe('attachScanner', () => {
  let detach = (): void => {};
  afterEach(() => { detach(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

  const press = (key: string, target: EventTarget = document.body): KeyboardEvent => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    target.dispatchEvent(e);
    return e;
  };

  it('reports a scan and prevents the Enter default', () => {
    const onScan = vi.fn();
    detach = attachScanner(onScan, () => true);
    for (const k of '12345678') press(k);
    const enter = press('Enter');
    expect(onScan).toHaveBeenCalledWith('12345678');
    expect(enter.defaultPrevented).toBe(true);
  });

  it('ignores keys typed into a text field', () => {
    const onScan = vi.fn();
    const input = document.createElement('input');
    document.body.append(input);
    detach = attachScanner(onScan, () => true);
    for (const k of '12345678') press(k, input);
    press('Enter', input);
    expect(onScan).not.toHaveBeenCalled();
  });

  it('ignores keys while disabled', () => {
    const onScan = vi.fn();
    detach = attachScanner(onScan, () => false);
    for (const k of '12345678') press(k);
    press('Enter');
    expect(onScan).not.toHaveBeenCalled();
  });
});
