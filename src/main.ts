import './style.css';
import { addProduct, parseCart, setQty, syncLooks, totalCents, type Cart } from './core/cart';
import {
  DEFAULT_EMOJI, DEFAULT_PRICE_CENTS, findByCode, loadCatalog, mergeProducts, removeProduct, saveCatalog, upsert, type Product,
} from './core/catalog';
import { isBarcode, lookupProduct, type OffProduct } from './core/openfoodfacts';
import { attachScanner } from './core/scanner';
import { play, unlockAudio } from './core/sfx';
import { readJson, writeJson } from './core/storage';
import { renderDone } from './ui/done';
import { renderPay } from './ui/pay';
import { renderParent, type ParentView } from './ui/parent';
import { renderProductForm } from './ui/productForm';
import { renderSale } from './ui/sale';
import { renderUnknown } from './ui/unknown';

const CART_KEY = 'cart';
/** How long a scan waits for the name lookup before showing the "unknown" screen. */
const LOOKUP_TIMEOUT_MS = 3000;

type Screen = { kind: 'sale' } | { kind: 'pay' } | { kind: 'done'; changeCents: number };
interface Overlay { el: HTMLElement; /** 'unknown' overlays stay open for the next scan; everything else blocks scanning. */ kind: 'unknown' | 'modal' }

let catalog: Product[] = loadCatalog();
let cart: Cart = parseCart(readJson(CART_KEY)) ?? [];
let screen: Screen = { kind: 'sale' };
let flashCode: string | null = null;
let parentView: ParentView | null = null;
const overlays: Overlay[] = [];

const screenEl = document.createElement('div');
screenEl.className = 'screen';
const overlayEl = document.createElement('div');
overlayEl.className = 'overlays';
document.querySelector<HTMLElement>('#app')!.append(screenEl, overlayEl);

function setCart(next: Cart): void {
  cart = next;
  writeJson(CART_KEY, cart);
}

function setCatalog(next: Product[]): void {
  catalog = next;
  saveCatalog(catalog);
  parentView?.refresh();
  // A retaken photo should show on the running receipt too (name and price stay as scanned).
  const synced = syncLooks(cart, catalog);
  if (synced !== cart) { setCart(synced); renderScreen(); }
}

function renderScreen(): void {
  switch (screen.kind) {
    case 'sale':
      screenEl.replaceChildren(renderSale({
        cart, flashCode,
        onQty: (code, qty) => { flashCode = null; setCart(setQty(cart, code, qty)); renderScreen(); },
        onPay: () => { screen = { kind: 'pay' }; renderScreen(); },
        onClear: () => { flashCode = null; setCart([]); renderScreen(); },
        onParent: openParent,
      }));
      flashCode = null;
      break;
    case 'pay':
      screenEl.replaceChildren(renderPay({
        totalCents: totalCents(cart),
        onBack: () => { screen = { kind: 'sale' }; renderScreen(); },
        onConfirm: (changeCents) => { play('paid'); setCart([]); screen = { kind: 'done', changeCents }; renderScreen(); },
      }));
      break;
    case 'done':
      screenEl.replaceChildren(renderDone(screen.changeCents, () => { screen = { kind: 'sale' }; renderScreen(); }));
      break;
  }
}

function pushOverlay(el: HTMLElement, kind: Overlay['kind']): Overlay {
  const o = { el, kind };
  overlays.push(o);
  overlayEl.append(el);
  return o;
}

function popOverlay(o: Overlay): void {
  const i = overlays.indexOf(o);
  if (i >= 0) overlays.splice(i, 1);
  o.el.remove();
}

function closeUnknown(): void {
  for (const o of overlays.filter((x) => x.kind === 'unknown')) popOverlay(o);
}

function openForm(initial: Partial<Product>, editing: boolean, onSaved?: (p: Product) => void): void {
  let o: Overlay | null = null;
  const close = (): void => { if (o) popOverlay(o); };
  o = pushOverlay(renderProductForm({
    initial, editing,
    onSave: (product) => { setCatalog(upsert(catalog, product)); close(); onSaved?.(product); },
    onCancel: close,
  }), 'modal');
}

function openParent(): void {
  if (overlays.some((o) => o.kind === 'modal')) return;
  let o: Overlay | null = null;
  const view = renderParent({
    getProducts: () => catalog,
    onAdd: () => openForm({}, false),
    onEdit: (product) => openForm(product, true),
    onDelete: (code) => setCatalog(removeProduct(catalog, code)),
    onDeleteAll: () => setCatalog([]),
    onImport: (products) => setCatalog(mergeProducts(catalog, products)),
    onClose: () => { if (o) popOverlay(o); parentView = null; },
  });
  o = pushOverlay(view.el, 'modal');
  parentView = view;
}

/** The "I don't know this one" screen: stays open for the next scan; a parent can add the product from here. */
function showUnknown(code: string): void {
  play('unknown');
  let o: Overlay | null = null;
  const close = (): void => { if (o) popOverlay(o); };
  o = pushOverlay(renderUnknown(
    code,
    (photo) => {
      close();
      openForm({ code, ...(photo ? { photo } : {}) }, false, (saved) => {
        flashCode = saved.code;
        setCart(addProduct(cart, saved));
        renderScreen();
      });
    },
    close,
  ), 'unknown');
}

/** A barcode Open Food Facts knows becomes a product (default price) and goes straight onto the receipt. */
function autoAdd(code: string, found: OffProduct): void {
  let product = findByCode(catalog, code);
  if (!product) {
    product = { code, name: found.name, priceCents: DEFAULT_PRICE_CENTS, emoji: found.emoji ?? DEFAULT_EMOJI };
    setCatalog(upsert(catalog, product));
  }
  play('scan');
  flashCode = product.code;
  setCart(addProduct(cart, product));
  renderScreen();
}

function onScan(code: string): void {
  const product = findByCode(catalog, code);
  closeUnknown();
  if (product) {
    play('scan');
    flashCode = product.code;
    setCart(addProduct(cart, product));
    renderScreen();
    return;
  }
  if (!isBarcode(code)) { showUnknown(code); return; }
  // Best effort and quick: if Open Food Facts knows the code it is added by itself; otherwise (not found, offline,
  // timeout) the usual "unknown" screen appears. A result that arrives after the sale screen is gone is dropped.
  void lookupProduct(code, fetch, LOOKUP_TIMEOUT_MS).then((found) => {
    if (screen.kind !== 'sale') return;
    if (found) { autoAdd(code, found); return; }
    if (overlays.every((o) => o.kind === 'unknown')) { closeUnknown(); showUnknown(code); }
  });
}

attachScanner(onScan, () => screen.kind === 'sale' && overlays.every((o) => o.kind === 'unknown'));
// iOS only starts audio from a tap.
document.addEventListener('pointerdown', unlockAudio, { once: true });

renderScreen();

// Dev helper: window.__scan('1234567890123') behaves like a scanner without needing one.
(window as unknown as { __scan: (code: string) => void }).__scan = onScan;
