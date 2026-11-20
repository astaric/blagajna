import { t } from '../i18n';
import { appendAmountKey, centsToAmountText, changeFor, formatEur, parsePrice } from '../core/money';
import { button, h } from './dom';

export interface PayProps {
  totalCents: number;
  onBack(): void;
  /** Called with the change to hand back (>= 0). */
  onConfirm(changeCents: number): void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'];
const BILLS = [5, 10, 20, 50, 100];

export function renderPay(p: PayProps): HTMLElement {
  let buffer = '';
  const root = h('main', 'pay');

  const render = (): void => {
    const given = parsePrice(buffer.endsWith(',') ? buffer.slice(0, -1) : buffer) ?? 0;
    const diff = changeFor(p.totalCents, given);
    const enough = diff >= 0;

    const confirm = button(t('confirm'), 'big primary', () => p.onConfirm(diff));
    confirm.disabled = !enough;

    const keys = h('div', 'numpad', ...KEYS.map((k) => {
      const b = button(k === 'back' ? '⌫' : k, 'key', () => { buffer = appendAmountKey(buffer, k); render(); });
      if (k === 'back') b.setAttribute('aria-label', t('clearAmount'));
      return b;
    }));
    const bills = h('div', 'bills', ...BILLS.map((b) =>
      button(`${b} €`, 'bill', () => { buffer = centsToAmountText(given + b * 100); render(); })));
    const quick = h('div', 'quick',
      button(t('exact'), 'chip', () => { buffer = centsToAmountText(p.totalCents); render(); }),
      button(t('clearAmount'), 'chip', () => { buffer = ''; render(); }),
    );

    const info = h('section', 'pay-info',
      h('div', 'pay-row', h('span', '', t('toPay')), h('strong', '', formatEur(p.totalCents))),
      h('div', 'pay-row', h('span', '', t('received')), h('strong', 'given', buffer === '' ? formatEur(0) : `${buffer} €`)),
      h('div', `pay-row result ${enough ? 'ok' : 'short'}`,
        h('span', '', enough ? t('change') : t('missing')), h('strong', '', formatEur(Math.abs(diff)))),
      h('div', 'pay-actions', button(t('back'), 'big ghost', p.onBack), confirm),
    );
    root.replaceChildren(info, h('section', 'pay-input', bills, quick, keys));
  };

  render();
  return root;
}
