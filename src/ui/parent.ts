import { t } from '../i18n';
import { parseBackup, serializeBackup, type Product } from '../core/catalog';
import { formatEur } from '../core/money';
import { button, h, thumb } from './dom';
import { holdButton } from './hold';

export interface ParentProps {
  getProducts(): readonly Product[];
  onAdd(): void;
  onEdit(product: Product): void;
  onDelete(code: string): void;
  onDeleteAll(): void;
  /** Merge imported products into the catalog. */
  onImport(products: Product[]): void;
  onClose(): void;
}

export interface ParentView {
  el: HTMLElement;
  /** Re-reads the catalog and redraws the list (the form closing, imports, deletes). */
  refresh(): void;
}

export function renderParent(p: ParentProps): ParentView {
  let query = '';

  const search = h('input', 'search');
  search.type = 'search';
  search.placeholder = t('search');
  search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); renderList(); });

  const list = h('div', 'product-list');
  const renderList = (): void => {
    const all = p.getProducts();
    const shown = all.filter((x) => query === '' || x.name.toLowerCase().includes(query) || x.code.includes(query));
    if (all.length === 0) { list.replaceChildren(h('p', 'muted', t('noProducts'))); return; }
    list.replaceChildren(...shown.map((x) => h('div', 'product-row',
      thumb(x),
      h('div', 'product-main', h('div', 'name', x.name), h('div', 'unit', x.code)),
      h('div', 'line-total', formatEur(x.priceCents)),
      button(t('edit'), 'chip', () => p.onEdit(x)),
      holdButton(t('holdToDelete'), 'chip danger', () => p.onDelete(x.code)),
    )));
  };

  // Backup: plain text works everywhere (copy to Notes/Messages), a file works on a computer.
  const text = h('textarea', 'backup-text');
  text.rows = 5;
  const status = h('div', 'status');
  const file = h('input');
  file.type = 'file';
  file.accept = 'application/json,.json';
  file.hidden = true;
  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (f) void f.text().then((s) => { text.value = s; });
  });
  const refreshBackup = (): void => { text.value = serializeBackup(p.getProducts()); };

  const backup = h('section', 'backup',
    h('h3', '', t('backup')),
    h('p', 'muted', t('backupHint')),
    text,
    h('div', 'row',
      button(t('copy'), 'chip', () => {
        text.select();
        void navigator.clipboard?.writeText(text.value).then(() => { status.textContent = t('copied'); }).catch(() => { /* selected text can be copied by hand */ });
      }),
      button(t('download'), 'chip', () => {
        const a = h('a');
        a.href = URL.createObjectURL(new Blob([text.value], { type: 'application/json' }));
        a.download = 'blagajna-izdelki.json';
        a.click();
        URL.revokeObjectURL(a.href);
      }),
      button(t('loadFile'), 'chip', () => file.click()),
      button(t('importText'), 'chip primary', () => {
        const products = parseBackup(text.value);
        if (!products) { status.textContent = t('importBad'); return; }
        p.onImport(products);
        status.textContent = t('importOk', { n: products.length });
      }),
      file),
    status,
  );

  const el = h('div', 'overlay',
    h('div', 'modal parent',
      h('header', 'parent-head', h('h2', '', t('parentTitle')),
        h('div', 'row', button(t('addProduct'), 'chip primary', p.onAdd), button(t('close'), 'chip', p.onClose))),
      search, list, backup,
      h('p', 'muted credit', t('namesCredit')),
      h('div', 'row end', holdButton(t('holdToDeleteAll'), 'chip danger', p.onDeleteAll)),
    ));

  const refresh = (): void => { renderList(); refreshBackup(); };
  refresh();
  return { el, refresh };
}
