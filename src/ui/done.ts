import { t } from '../i18n';
import { formatEur } from '../core/money';
import { button, h } from './dom';

export function renderDone(changeCents: number, onNext: () => void): HTMLElement {
  return h('main', 'done',
    h('div', 'done-icon', '🎉'),
    h('h2', '', t('thanks')),
    changeCents > 0 && h('div', 'done-change', h('span', '', t('change')), h('strong', '', formatEur(changeCents))),
    button(t('newCustomer'), 'big primary', onNext),
  );
}
