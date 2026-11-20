import { t } from '../i18n';
import { button, h } from './dom';
import { holdButton } from './hold';
import { photoInput } from './photo';

export interface UnknownView {
  el: HTMLElement;
  /** Shows a name suggested by the barcode lookup (arrives a moment after the screen opens). */
  suggest(name: string): void;
}

/**
 * Shown when a scanned code is not in the catalog. Besides the hold-to-add button there is a plain camera button:
 * it only starts the add flow (the product form opens with the photo and still needs a name and a price).
 */
export function renderUnknown(
  code: string,
  onAdd: (photo?: string) => void,
  onClose: () => void,
): UnknownView {
  const camera = photoInput(true, (photo) => onAdd(photo));
  const suggestion = h('div', 'suggestion');
  suggestion.hidden = true;
  const el = h('div', 'overlay',
    h('div', 'modal unknown',
      h('div', 'unknown-icon', '🤔'),
      h('h2', '', t('unknownTitle')),
      h('p', '', t('unknownHint')),
      h('div', 'code', t('unknownCode', { code })),
      suggestion,
      button(t('takePhoto'), 'big primary', () => camera.click()),
      h('div', 'modal-actions', button(t('close'), 'big ghost', onClose), holdButton(t('holdToAdd'), 'big primary', () => onAdd())),
      camera,
    ));
  return {
    el,
    suggest(name) {
      suggestion.replaceChildren(h('strong', '', t('unknownFound', { name })), h('small', '', t('unknownSource')));
      suggestion.hidden = false;
    },
  };
}
