import { t } from '../i18n';
import { DEFAULT_EMOJI, type Product } from '../core/catalog';
import { centsToAmountText, parsePrice } from '../core/money';
import { button, h, thumb } from './dom';
import { downscalePhoto } from './photo';

export interface FormProps {
  /** Starting values; `editing` locks the code field (the code identifies the product). */
  initial: Partial<Product>;
  editing: boolean;
  onSave(product: Product): void;
  onCancel(): void;
}

const SUGGESTED_EMOJI = ['🍎', '🍌', '🥛', '🍞', '🧀', '🍫', '🥕', '🍝', '🧃', '🍪', '🥚', '🍅', '🍦', '🧴'];

function field(label: string, input: HTMLElement): HTMLElement {
  return h('label', 'field', h('span', '', label), input);
}

export function renderProductForm(p: FormProps): HTMLElement {
  let photo = p.initial.photo;

  const code = h('input');
  code.value = p.initial.code ?? '';
  code.readOnly = p.editing;
  code.autocomplete = 'off';
  const name = h('input');
  name.value = p.initial.name ?? '';
  name.autocomplete = 'off';
  const price = h('input');
  price.inputMode = 'decimal';
  price.value = p.initial.priceCents === undefined ? '' : centsToAmountText(p.initial.priceCents);
  const emoji = h('input', 'emoji-input');
  emoji.value = p.initial.emoji ?? DEFAULT_EMOJI;
  emoji.maxLength = 8;

  // A scanner can fill the code field: its Enter should move on instead of submitting.
  code.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); name.focus(); } });
  for (const [input, next] of [[name, price], [price, null]] as const) {
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (next) next.focus(); else save();
    });
  }

  const error = h('div', 'form-error');
  const preview = h('div', 'photo-preview');
  const renderPreview = (): void => { preview.replaceChildren(thumb({ emoji: emoji.value || DEFAULT_EMOJI, photo })); };
  renderPreview();
  emoji.addEventListener('input', renderPreview);

  const file = h('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.hidden = true;
  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (!f) return;
    downscalePhoto(f).then((url) => { photo = url; renderPreview(); }).catch(() => { /* keep the old picture */ });
  });

  const chips = h('div', 'chips', ...SUGGESTED_EMOJI.map((e) =>
    button(e, 'chip emoji', () => { emoji.value = e; renderPreview(); })));

  const fail = (key: 'errCode' | 'errName' | 'errPrice'): void => { error.textContent = t(key); };

  function save(): void {
    const c = code.value.trim();
    const n = name.value.trim();
    const cents = parsePrice(price.value);
    if (c === '') return fail('errCode');
    if (n === '') return fail('errName');
    if (cents === null) return fail('errPrice');
    p.onSave({ code: c, name: n, priceCents: cents, emoji: emoji.value.trim() || DEFAULT_EMOJI, ...(photo ? { photo } : {}) });
  }

  const photoRow = h('div', 'photo-row', preview,
    button(t('choosePhoto'), 'chip', () => file.click()),
    button(t('removePhoto'), 'chip', () => { photo = undefined; renderPreview(); }),
    file);

  const root = h('div', 'overlay',
    h('div', 'modal form',
      h('h2', '', p.editing ? t('formTitleEdit') : t('formTitleNew')),
      field(t('fieldCode'), code),
      field(t('fieldName'), name),
      field(t('fieldPrice'), price),
      field(t('fieldEmoji'), emoji),
      chips,
      photoRow,
      error,
      h('div', 'modal-actions', button(t('cancel'), 'big ghost', p.onCancel), button(t('save'), 'big primary', save)),
    ));
  // Focus the first empty field (a scanner can then type the code straight in).
  queueMicrotask(() => { (code.value === '' ? code : name).focus(); });
  return root;
}
