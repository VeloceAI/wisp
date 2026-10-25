import type { Button } from '@veloceai/wisp-core';

type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | ((e: Event) => void)> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false) el.setAttribute(k, v);
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

export function buttonRow(buttons: Button[], onPick: (value: string) => void): HTMLElement | null {
  if (!buttons.length) return null;
  return h(
    'div',
    { class: 'buttons' },
    ...buttons.map((b) => h('button', { type: 'button', class: b.primary ? 'btn primary' : 'btn', onclick: () => onPick(b.value) }, b.label)),
  );
}
