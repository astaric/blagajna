type Child = Node | string | null | undefined | false;

/** Tiny element builder: `h('div', 'class names', child, 'text', ...)`. Falsy children are skipped. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const c of children) if (c) el.append(c);
  return el;
}

export function button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = h('button', cls, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** Product picture: the photo if there is one, otherwise the emoji. */
export function thumb(item: { emoji: string; photo?: string }): HTMLElement {
  const box = h('div', 'thumb');
  if (item.photo) {
    const img = h('img');
    img.src = item.photo;
    img.alt = '';
    box.append(img);
  } else {
    box.textContent = item.emoji;
  }
  return box;
}
