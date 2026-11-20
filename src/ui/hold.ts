import { button } from './dom';

export const HOLD_MS = 800;

/**
 * A button that only fires after being pressed and held for HOLD_MS, so kids can't trigger it by accident.
 * A fill bar (CSS var --p, 0-100%) shows the progress. There is deliberately no plain click behavior.
 */
export function holdButton(label: string, cls: string, onHold: () => void): HTMLButtonElement {
  const btn = button(label, `hold ${cls}`, () => { /* a tap does nothing */ });
  let start = 0;
  let raf = 0;
  let active = false;

  const cancel = (): void => {
    active = false;
    cancelAnimationFrame(raf);
    btn.classList.remove('holding');
    btn.style.removeProperty('--p');
  };
  const tick = (): void => {
    const t = Math.min(1, (performance.now() - start) / HOLD_MS);
    btn.style.setProperty('--p', `${t * 100}%`);
    if (t >= 1) { cancel(); onHold(); return; }
    raf = requestAnimationFrame(tick);
  };

  btn.addEventListener('pointerdown', () => {
    if (active) return;
    active = true;
    start = performance.now();
    btn.classList.add('holding');
    raf = requestAnimationFrame(tick);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(type, cancel);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  return btn;
}
