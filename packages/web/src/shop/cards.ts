import type { Product } from '@veloceai/wisp-core';

export interface Card {
  el: Element;
  add: HTMLElement | null;
  plus: HTMLElement | null;
  minus: HTMLElement | null;
  product: Omit<Product, 'id'>;
}

const ADD_RE = /^(\+?\s*add(\s+to\s+(cart|bag|basket))?|buy(\s+now)?|\+)$/i;
const PLUS_RE = /^(\+|increase|add one|increment)$/i;
const MINUS_RE = /^(−|-|–|decrease|remove one|decrement)$/i;
const OOS_RE = /out of stock|sold out|unavailable|notify me|currently unavailable/i;
const PRICE_RE = /(₹|rs\.?|inr|\$|€|£)\s?([\d,]+(?:\.\d{1,2})?)/i;
const UNIT_RE = /\b(\d+(?:\.\d+)?)\s?(kg|g|gm|gms|ml|l|ltr|litre|liter|pc|pcs|pack|pieces?)\b/i;

const label = (el: Element) => (el.getAttribute('aria-label') || el.textContent || (el as HTMLInputElement).value || '').replace(/\s+/g, ' ').trim();
const isButton = (el: Element) => el.matches('button, [role="button"], input[type="button"], input[type="submit"], a[href]');

function hidden(el: Element): boolean {
  if (el.closest('[hidden], [aria-hidden="true"], [data-wisp="off"]')) return true;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return !!style && (style.display === 'none' || style.visibility === 'hidden');
}

/**
 * Finds product cards on any shop page, in reading order: a card is the smallest box around one
 * "Add" button that also shows a price and a name. `data-wisp-product` marks cards explicitly when a site wants to.
 */
export function findCards(root: Document | Element, skip?: Element): Card[] {
  const marked = [...root.querySelectorAll('[data-wisp-product]')];
  const containers = marked.length ? marked : guessContainers(root, skip);
  return containers.filter((c) => !hidden(c) && !(skip && skip.contains(c))).map(readCard);
}

function guessContainers(root: Document | Element, skip?: Element): Element[] {
  const buttons = [...root.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')].filter(
    (b) => (ADD_RE.test(label(b)) || b.closest('[data-wisp-action~="add"]')) && !(skip && skip.contains(b)) && !hidden(b),
  );
  const out: Element[] = [];
  for (const b of buttons) {
    // The card is the smallest box around the Add button that shows both a price and a name.
    let card: Element | null = null;
    for (let el = b.parentElement; el && el !== root && el.tagName !== 'BODY'; el = el.parentElement) {
      const adds = [...el.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')].filter((x) => ADD_RE.test(label(x)));
      if (adds.length > 1) break;
      if (PRICE_RE.test(el.textContent ?? '') && readCard(el).product.name) {
        card = el;
        break;
      }
    }
    if (card && !out.includes(card)) out.push(card);
  }
  return out;
}

export function readCard(el: Element): Card {
  const buttons = [...el.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')] as HTMLElement[];
  const add = buttons.find((b) => ADD_RE.test(label(b)) || b.closest('[data-wisp-action~="add"]')) ?? null;
  const plus = buttons.find((b) => PLUS_RE.test(label(b)) && b !== add) ?? null;
  const minus = buttons.find((b) => MINUS_RE.test(label(b))) ?? null;
  const lines = textPieces(el);
  const text = lines.join(' ');
  const explicitName = el.getAttribute('data-wisp-name') ?? el.querySelector('[itemprop="name"], h1, h2, h3, h4, h5, h6')?.textContent;
  const name = (explicitName ?? lines.find((l) => !PRICE_RE.test(l) && !UNIT_RE.test(l) && !ADD_RE.test(l) && !OOS_RE.test(l) && /\p{L}{2,}/u.test(l)) ?? '').replace(/\s+/g, ' ').trim();
  const priceText = el.getAttribute('data-wisp-price') ?? text;
  const price = priceText.match(PRICE_RE);
  const unit = text.match(UNIT_RE);
  const outOfStock = OOS_RE.test(text) || (add !== null && ((add as HTMLButtonElement).disabled || add.getAttribute('aria-disabled') === 'true'));
  return {
    el,
    add,
    plus,
    minus,
    product: {
      name,
      price: price ? Number(price[2]!.replace(/,/g, '')) : undefined,
      unit: unit ? `${unit[1]} ${unit[2]!.toLowerCase()}` : undefined,
      inStock: !outOfStock,
    },
  };
}

/** Each separate piece of text inside the element, in order; buttons are skipped. */
function textPieces(el: Element): string[] {
  const out: string[] = [];
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement?.closest('button, [role="button"], script, style')) continue;
    const t = n.textContent?.replace(/\s+/g, ' ').trim();
    if (t) out.push(t);
  }
  return out;
}

/** The search box: a search field, else a text box whose label mentions search. */
export function findSearchBox(doc: Document, skip?: Element): HTMLInputElement | null {
  const candidates = [...doc.querySelectorAll('input[type="search"], [role="search"] input, input[type="text"], input:not([type])')] as HTMLInputElement[];
  const visible = candidates.filter((i) => !hidden(i) && !(skip && skip.contains(i)));
  return (
    visible.find((i) => i.type === 'search') ??
    visible.find((i) => i.closest('[role="search"]')) ??
    visible.find((i) => /search|find|khoj|dhund|खोज/i.test(`${i.name} ${i.id} ${i.placeholder} ${i.getAttribute('aria-label') ?? ''}`)) ??
    null
  );
}

/** The cart link or button, for "open my cart". */
export function findCartButton(doc: Document, skip?: Element): HTMLElement | null {
  return (
    ([...doc.querySelectorAll('a[href], button, [role="button"]')] as HTMLElement[]).find(
      (b) => isButton(b) && !hidden(b) && !(skip && skip.contains(b)) && /\b(cart|basket|bag)\b|🛒/i.test(label(b)),
    ) ?? null
  );
}

/** A visible cart total such as "Cart · ₹177", when the page shows one. */
export function readCartTotal(doc: Document, skip?: Element): number | undefined {
  for (const el of doc.querySelectorAll('[data-wisp-cart-total], button, a, [class*="cart" i], [id*="cart" i], [class*="total" i]')) {
    if (skip?.contains(el) || hidden(el)) continue;
    const t = el.getAttribute('data-wisp-cart-total') ?? el.textContent ?? '';
    const m = /\b(cart|total|basket)\b/i.test(t) || el.hasAttribute('data-wisp-cart-total') ? t.match(PRICE_RE) : null;
    if (m) return Number(m[2]!.replace(/,/g, ''));
  }
  return undefined;
}
