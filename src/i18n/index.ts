import { sl, type Key } from './sl';

/** Looks up a UI string; `{name}` placeholders are filled from `params`. Call it when rendering, not at module load. */
export function t(key: Key, params?: Record<string, string | number>): string {
  let text: string = sl[key];
  if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
  return text;
}

export type { Key };
