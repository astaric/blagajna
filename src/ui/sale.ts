import { t } from '../i18n';
import { lineTotalCents, totalCents, type Cart } from '../core/cart';
import { formatEur } from '../core/money';
import { button, h, thumb } from './dom';
import { holdButton } from './hold';

export interface SaleProps {
  cart: Cart;
  /** Line that was just scanned: highlighted and scrolled into view. */
  flashCode: string | null;
  onQty(code: string, qty: number): void;
  onPay(): void;
  onClear(): void;
  onParent(): void;
}

export function renderSale(p: SaleProps): HTMLElement {
  const total = totalCents(p.cart);

  const header = h('header', 'receipt-head', h('h1', '', 'Blagajna'), holdButton('⚙', 'gear', p.onParent));
  header.querySelector('.gear')?.setAttribute('aria-label', t('parent'));

  let flashed: HTMLElement | null = null;
  const body = p.cart.length === 0
    ? h('div', 'empty', h('div', 'empty-icon', '📦'), h('div', 'empty-title', t('scanPrompt')), h('div', 'empty-hint', t('scanHint')))
    : h('ul', 'lines', ...p.cart.map((line) => {
        const li = h('li', 'line');
        if (line.code === p.flashCode) { li.classList.add('flash'); flashed = li; }
        const minus = button('−', 'step', () => p.onQty(line.code, line.qty - 1));
        minus.setAttribute('aria-label', t('lessOne'));
        const plus = button('+', 'step', () => p.onQty(line.code, line.qty + 1));
        plus.setAttribute('aria-label', t('moreOne'));
        const remove = button('✕', 'step remove', () => p.onQty(line.code, 0));
        remove.setAttribute('aria-label', t('removeLine'));
        li.append(
          thumb(line),
          h('div', 'line-name', h('div', 'name', line.name), h('div', 'unit', formatEur(line.priceCents))),
          h('div', 'stepper', minus, h('span', 'qty', String(line.qty)), plus),
          h('div', 'line-total', formatEur(lineTotalCents(line))),
          remove,
        );
        return li;
      }));

  const summary = h('aside', 'summary',
    h('div', 'total-label', t('total')),
    h('div', 'total', formatEur(total)),
    button(t('pay'), 'big primary', p.onPay),
    button(t('clear'), 'big ghost', p.onClear),
    h('div', 'build', __BUILD_COMMIT__),
  );
  if (p.cart.length === 0) summary.querySelectorAll<HTMLButtonElement>('.big').forEach((b) => { b.disabled = true; });

  const root = h('main', 'sale', h('section', 'receipt', header, body), summary);
  const target = flashed as HTMLElement | null;
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest' }));
  return root;
}
