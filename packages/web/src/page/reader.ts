import type { PageElement, PageModel, PagePassage, PageRole } from '@veloceai/wisp-core';
import { accessibleName, isSensitive } from './names';

export interface ReaderOptions {
  /** Areas the guide must ignore, e.g. ['.admin-panel']. `[data-wisp="off"]` always counts. */
  blockedSelectors?: string[];
  /** URL paths where the guide reads nothing, e.g. ['/admin', '/account/*']. */
  blockedPaths?: string[];
  /** Our own host element, skipped. */
  host?: Element;
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'CANVAS', 'IFRAME', 'OBJECT', 'VIDEO', 'AUDIO']);
const PASSAGE_TAGS = new Set(['P', 'LI', 'DD', 'DT', 'TD', 'TH', 'BLOCKQUOTE', 'FIGCAPTION', 'PRE', 'SUMMARY']);
const MAX_ELEMENTS = 400;
const MAX_TEXT = 20000;

/**
 * Reads the page through the DOM and accessibility info (no screenshots) into a compact model.
 * Results are cached until the page changes.
 */
export class PageReader {
  private refs = new WeakMap<Element, string>();
  private byRef = new Map<string, WeakRef<Element>>();
  private seq = 0;
  private cache: PageModel | null = null;
  private observer: MutationObserver | null = null;

  constructor(
    private doc: Document,
    private opts: ReaderOptions = {},
  ) {
    if (typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver((records) => {
        if (records.some((r) => !this.opts.host?.contains(r.target))) this.cache = null;
      });
      this.observer.observe(doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'disabled', 'aria-label', 'value', 'style', 'class'] });
    }
  }

  destroy(): void {
    this.observer?.disconnect();
  }

  setHost(host: Element): void {
    this.opts.host = host;
    this.cache = null;
  }

  element(ref: string): Element | null {
    const el = this.byRef.get(ref)?.deref() ?? null;
    return el && el.isConnected && !this.isBlocked(el) ? el : null;
  }

  pathBlocked(): boolean {
    const path = this.doc.location?.pathname ?? '/';
    return (this.opts.blockedPaths ?? []).some((p) => (p.endsWith('*') ? path.startsWith(p.slice(0, -1)) : path === p || path.startsWith(p + '/')));
  }

  isBlocked(el: Element): boolean {
    if (el.closest('[data-wisp="off"]')) return true;
    return (this.opts.blockedSelectors ?? []).some((s) => {
      try {
        return el.closest(s) !== null;
      } catch {
        return false;
      }
    });
  }

  read(): PageModel {
    if (this.cache) return this.cache;
    const url = this.doc.location?.href ?? '';
    const title = this.doc.title;
    if (this.pathBlocked()) return (this.cache = { url, title, elements: [], passages: [], blocked: true });

    const elements: PageElement[] = [];
    const passages: PagePassage[] = [];
    let section = '';
    let textBudget = MAX_TEXT;
    const vh = this.doc.defaultView?.innerHeight ?? 800;

    const walk = (el: Element, inPassage = false) => {
      if (SKIP_TAGS.has(el.tagName.toUpperCase()) || el === this.opts.host || this.isBlocked(el) || hidden(el)) return;
      const role = roleOf(el);
      if (role && elements.length < MAX_ELEMENTS) {
        const item = this.describe(el, role, section, vh);
        if (item) {
          elements.push(item);
          if (role === 'heading') section = item.name;
          if (role !== 'heading' && role !== 'img') return;
        }
      }
      let passage = inPassage;
      if (!inPassage && PASSAGE_TAGS.has(el.tagName) && textBudget > 0) {
        const text = squash((el as HTMLElement).innerText ?? el.textContent ?? '');
        if (text.length >= 20) {
          const clipped = text.slice(0, Math.min(800, textBudget));
          passages.push({ section, text: clipped });
          textBudget -= clipped.length;
          passage = true;
        }
      }
      for (const child of el.children) walk(child, passage);
    };
    if (this.doc.body) walk(this.doc.body);
    const description = this.doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? undefined;
    this.cache = { url, title, description, elements, passages };
    return this.cache;
  }

  private describe(el: Element, role: PageRole, section: string, vh: number): PageElement | null {
    const sensitive = isSensitive(el);
    const name = accessibleName(el);
    if (!name && role !== 'textbox' && role !== 'searchbox') return null;
    const item: PageElement = { ref: this.refFor(el), role, name: name || role };
    if (role === 'heading') item.level = Number(el.getAttribute('aria-level') ?? el.tagName.slice(1)) || 2;
    if (section && role !== 'heading') item.section = section;
    if (sensitive) item.sensitive = true;
    const action = el.closest('[data-wisp-action]')?.getAttribute('data-wisp-action');
    if (action) item.action = action;
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') item.disabled = true;
    if (role === 'link') item.href = (el as HTMLAnchorElement).getAttribute('href') ?? undefined;
    if (!sensitive) {
      if (role === 'searchbox' || role === 'combobox') item.value = ((el as HTMLInputElement).value ?? '').slice(0, 60) || undefined;
      if (el instanceof HTMLSelectElement) item.options = [...el.options].slice(0, 20).map((o) => squash(o.text));
      if (role === 'checkbox' || role === 'radio' || role === 'switch')
        item.checked = (el as HTMLInputElement).checked ?? el.getAttribute('aria-checked') === 'true';
    }
    const r = el.getBoundingClientRect();
    item.inView = r.bottom > 0 && r.top < vh && (r.width > 0 || r.height > 0);
    return item;
  }

  private refFor(el: Element): string {
    let ref = this.refs.get(el);
    if (!ref) {
      ref = `e${++this.seq}`;
      this.refs.set(el, ref);
      this.byRef.set(ref, new WeakRef(el));
    }
    return ref;
  }
}

function roleOf(el: Element): PageRole | null {
  const explicit = el.getAttribute('role');
  if (explicit) {
    const map: Record<string, PageRole> = { button: 'button', link: 'link', textbox: 'textbox', searchbox: 'searchbox', combobox: 'combobox', checkbox: 'checkbox', radio: 'radio', switch: 'switch', slider: 'slider', tab: 'tab', menuitem: 'menuitem', heading: 'heading', img: 'img' };
    if (map[explicit]) return map[explicit]!;
  }
  const tag = el.tagName;
  if (/^H[1-6]$/.test(tag)) return 'heading';
  if (tag === 'A' && el.hasAttribute('href')) return 'link';
  if (tag === 'BUTTON' || tag === 'SUMMARY') return 'button';
  if (tag === 'SELECT') return 'combobox';
  if (tag === 'TEXTAREA') return 'textbox';
  if (tag === 'IMG' && el.getAttribute('alt')) return 'img';
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'range') return 'slider';
    if (type === 'search') return 'searchbox';
    if (type === 'hidden') return null;
    return 'textbox';
  }
  if ((el as HTMLElement).isContentEditable && el.getAttribute('contenteditable') !== null) return 'textbox';
  return null;
}

function hidden(el: Element): boolean {
  if ((el as HTMLElement).hidden || el.getAttribute('aria-hidden') === 'true' || el.closest('[inert]')) return true;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return !!style && (style.display === 'none' || style.visibility === 'hidden');
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
