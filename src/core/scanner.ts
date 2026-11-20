// A USB barcode scanner acts as a keyboard: it types the code very fast and ends with Enter (sometimes Tab).
// ScanBuffer is the pure part (time is passed in, so it is testable); attachScanner wires it to the document.

export const MIN_CODE_LENGTH = 4;
/** A gap longer than this between keys means the buffered characters were not a scan. */
export const MAX_GAP_MS = 300;

export interface PushResult {
  /** Finished code, when this key was the terminator and the buffer looked like a scan. */
  scan?: string;
  /** True when the key belongs to the scanner and the browser should not act on it (e.g. Enter "clicking" a focused button). */
  consumed: boolean;
}

export class ScanBuffer {
  private buffer = '';
  private last = 0;

  push(key: string, now: number): PushResult {
    if (this.buffer !== '' && now - this.last > MAX_GAP_MS) this.buffer = '';
    this.last = now;

    if (key === 'Enter' || key === 'Tab') {
      const code = this.buffer;
      this.buffer = '';
      if (code.length >= MIN_CODE_LENGTH) return { scan: code, consumed: true };
      return { consumed: false };
    }
    if (key.length === 1) {
      this.buffer += key;
      return { consumed: true };
    }
    return { consumed: false }; // Shift, arrows, ... don't touch the buffer
  }

  reset(): void {
    this.buffer = '';
  }
}

function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

/**
 * Listens for scanner input on the whole document. Keys are ignored (and the buffer cleared) while a text field has
 * focus, so the add-product form can be typed into, or while `isEnabled()` is false. Returns a detach function.
 */
export function attachScanner(onScan: (code: string) => void, isEnabled: () => boolean): () => void {
  const buffer = new ScanBuffer();
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (isTextField(e.target) || !isEnabled()) { buffer.reset(); return; }
    const result = buffer.push(e.key, performance.now());
    if (result.consumed) e.preventDefault();
    if (result.scan) onScan(result.scan);
  };
  // Capture phase so we see the key before a focused button turns Enter into a click.
  document.addEventListener('keydown', onKeyDown, true);
  return () => document.removeEventListener('keydown', onKeyDown, true);
}
