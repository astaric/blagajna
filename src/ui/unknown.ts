import { t } from '../i18n';
import { button, h } from './dom';
import { holdButton } from './hold';

export function renderUnknown(code: string, onAdd: () => void, onClose: () => void): HTMLElement {
  return h('div', 'overlay',
    h('div', 'modal unknown',
      h('div', 'unknown-icon', '🤔'),
      h('h2', '', t('unknownTitle')),
      h('p', '', t('unknownHint')),
      h('div', 'code', t('unknownCode', { code })),
      h('div', 'modal-actions', button(t('close'), 'big ghost', onClose), holdButton(t('holdToAdd'), 'big primary', onAdd)),
    ));
}
