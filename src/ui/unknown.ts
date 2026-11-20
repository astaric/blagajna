import { t } from '../i18n';
import { button, h } from './dom';
import { holdButton } from './hold';
import { photoInput } from './photo';

/**
 * Shown when a scanned code is not in the catalog. Besides the hold-to-add button there is a plain camera button:
 * it only starts the add flow (the product form opens with the photo and still needs a name and a price).
 */
export function renderUnknown(
  code: string,
  onAdd: (photo?: string) => void,
  onClose: () => void,
): HTMLElement {
  const camera = photoInput(true, (photo) => onAdd(photo));
  return h('div', 'overlay',
    h('div', 'modal unknown',
      h('div', 'unknown-icon', '🤔'),
      h('h2', '', t('unknownTitle')),
      h('p', '', t('unknownHint')),
      h('div', 'code', t('unknownCode', { code })),
      button(t('takePhoto'), 'big primary', () => camera.click()),
      h('div', 'modal-actions', button(t('close'), 'big ghost', onClose), holdButton(t('holdToAdd'), 'big primary', () => onAdd())),
      camera,
    ));
}
