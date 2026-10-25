import {
  FINAL_WORDS,
  findElements,
  terms,
  type ActionDriver,
  type ActionStep,
  type PageElement,
  type SiteActionDecl,
  type SiteActionHandler,
} from '@veloceai/wisp-core';
import type { PageReader } from '../page/reader';

const ROLES_FOR: Partial<Record<ActionStep['kind'], string[]>> = {
  type: ['searchbox', 'textbox'],
  select: ['combobox'],
};

/** Drives the real page: finds elements, decides what is "final", and clicks/types like a person would. */
export class DomDriver implements ActionDriver {
  readonly handlers = new Map<string, SiteActionHandler>();

  constructor(
    private reader: PageReader,
    private declared: () => SiteActionDecl[],
    private go: (href: string) => void = (href) => window.location.assign(href),
  ) {}

  read() {
    return this.reader.read();
  }

  locate(step: ActionStep): PageElement | null {
    if (!('target' in step) || !step.target) return null;
    const model = this.reader.read();
    if (/^e\d+$/.test(step.target)) return model.elements.find((e) => e.ref === step.target) ?? null;
    const roles = ROLES_FOR[step.kind];
    const hits = findElements(model, step.target, 10);
    return (roles ? hits.find((h) => roles.includes(h.role)) : hits.find((h) => h.role !== 'heading')) ?? null;
  }

  isFinal(step: ActionStep, el: PageElement | null): boolean {
    if (step.kind === 'tool') return this.declared().find((a) => a.name === step.name)?.final === true;
    if (step.kind === 'navigate') return !sameOrigin(step.url);
    const node = el ? this.reader.element(el.ref) : null;
    if (step.kind === 'click' && el) {
      if (FINAL_WORDS.test(`${el.name} ${el.action ?? ''}`)) return true;
      return isRealSubmit(node);
    }
    if ((step.kind === 'type' && step.submit) || step.kind === 'press') return !!node && !isSearchForm(node.closest('form'));
    return false;
  }

  async perform(step: ActionStep, el: PageElement | null): Promise<void> {
    const node = el ? (this.reader.element(el.ref) as HTMLElement | null) : null;
    if (el && !node) throw new Error('element gone');
    switch (step.kind) {
      case 'click':
        node!.focus?.();
        node!.click();
        return;
      case 'type':
        await typeInto(node as HTMLInputElement, step.text);
        if (step.submit) submit(node!);
        return;
      case 'select':
        return choose(node!, step.option);
      case 'scroll':
        if (node) node.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        else if (step.direction === 'top' || step.direction === 'bottom') window.scrollTo({ top: step.direction === 'top' ? 0 : document.body.scrollHeight, behavior: 'smooth' });
        else window.scrollBy({ top: (step.direction === 'up' ? -0.8 : 0.8) * window.innerHeight, behavior: 'smooth' });
        return;
      case 'press':
        return pressKey(node ?? (document.activeElement as HTMLElement) ?? document.body, step.key);
      case 'navigate':
        if (sameOrigin(step.url)) this.go(step.url);
        else window.open(step.url, '_blank', 'noopener');
        return;
      case 'tool': {
        const handler = this.handlers.get(step.name);
        if (handler) await handler(step.args ?? {});
        else window.dispatchEvent(new CustomEvent('wisp:run', { detail: { name: step.name, args: step.args ?? {} } }));
        return;
      }
    }
  }
}

export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  // Frameworks like React track the value setter, so set it through the prototype.
  const proto = Object.getPrototypeOf(el) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function typeInto(el: HTMLInputElement, text: string) {
  el.focus();
  const chunks = Math.min(6, Math.max(1, Math.ceil(text.length / 4)));
  for (let i = 1; i <= chunks; i++) {
    setNativeValue(el, text.slice(0, Math.ceil((text.length * i) / chunks)));
    await new Promise((r) => setTimeout(r, 40));
  }
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function choose(el: HTMLElement, option: string) {
  if (!(el instanceof HTMLSelectElement)) {
    el.click();
    return;
  }
  const want = terms(option);
  let best = el.options[0];
  let bestScore = -1;
  for (const o of el.options) {
    const have = terms(o.text);
    const score = want.filter((w) => have.includes(w)).length - (o.text.length / 1000);
    if (score > bestScore) [best, bestScore] = [o, score];
  }
  if (!best || bestScore <= 0) throw new Error('no matching option');
  setNativeValue(el, best.value);
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function submit(el: HTMLElement) {
  const form = el.closest('form');
  if (form) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  else pressKey(el, 'Enter');
}

function pressKey(el: HTMLElement, key: string) {
  for (const type of ['keydown', 'keypress', 'keyup']) el.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

function isSearchForm(form: HTMLFormElement | null): boolean {
  if (!form) return true;
  return form.getAttribute('role') === 'search' || !!form.querySelector('input[type="search"]') || /search/i.test(`${form.id} ${form.className} ${form.getAttribute('action') ?? ''}`);
}

function isRealSubmit(node: Element | null): boolean {
  if (!node) return false;
  const type = (node.getAttribute('type') ?? (node.tagName === 'BUTTON' ? 'submit' : '')).toLowerCase();
  const form = node.closest('form');
  return type === 'submit' && !!form && !isSearchForm(form);
}

function sameOrigin(url: string): boolean {
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
}
