import type { Button } from '../brain/config';
import type { Guide } from '../brain/guide';
import { localize, type Localized } from '../brain/lang';
import type { CommandHandler } from '../brain/types';
import { terms } from '../chat/text';
import type { PageElement } from '../page/model';
import { findElements } from '../page/understand';
import { NAV_WORDS, parseNav, type NavWordPack } from './words';

export interface SitePage {
  /** What people call it, in any languages: "Delivery", { hi: "डिलीवरी" }, "shipping info". */
  name: Localized | Localized[];
  url: string;
  keywords?: string[];
}

/** The platform part: web clicks links and changes the URL; native apps call their router. */
export interface NavDriver {
  goTo(url: string): void;
  click(ref: string): void;
  scrollTo(ref: string): void;
  scroll(to: 'up' | 'down' | 'top' | 'bottom'): void;
  back(): void;
}

const STRONG = /^ ?(go to|take me to|navigate to)\b/i;
const GO_DELAY_MS = 700;

/** "Go to delivery", "cart pe jao", "peeche jao", "scroll down", in any language with a word pack. */
export class NavHandler implements CommandHandler {
  private packs: Partial<NavWordPack>[];

  constructor(
    private g: Guide,
    private driver: NavDriver,
    private pages: SitePage[] = [],
    extraWords: Partial<NavWordPack>[] = [],
  ) {
    this.packs = [...NAV_WORDS, ...extraWords];
  }

  async handle(text: string): Promise<boolean> {
    const intent = parseNav(text, this.packs);
    if (!intent) return false;
    const g = this.g;
    if (intent.kind === 'back') {
      g.reply({ text: g.line('nav.back'), buttons: [], matched: true, source: 'nav' });
      g.timer('nav', GO_DELAY_MS, () => this.driver.back());
      return true;
    }
    if (intent.kind === 'scroll') {
      this.driver.scroll(intent.to);
      g.feel('happy', 900);
      return true;
    }
    const lang = g.getState().lang;
    const page = this.matchPage(intent.place);
    const el = this.matchElement(intent.place, page?.url);
    if (el?.role === 'heading') {
      g.reply({ text: g.line('nav.section', { place: el.name }), buttons: [], matched: true, source: 'nav', mood: 'excited' });
      this.driver.scrollTo(el.ref);
      g.pointAt(`ref:${el.ref}`);
      return true;
    }
    if (el || page) {
      const name = el?.name ?? localize(first(page!.name), lang);
      g.reply({ text: g.line('nav.going', { place: name }), buttons: [], matched: true, source: 'nav', mood: 'excited' });
      if (el) g.pointAt(`ref:${el.ref}`);
      g.timer('nav', GO_DELAY_MS, () => (el ? this.driver.click(el.ref) : this.driver.goTo(page!.url)));
      g.track({ kind: 'event', name: 'nav:go' });
      return true;
    }
    if (!STRONG.test(text) && !this.isSuffixForm(text)) return false;
    const buttons: Button[] = this.pages.slice(0, 5).map((p) => ({ label: localize(first(p.name), lang), value: `nav:${p.url}` }));
    g.reply({ text: g.line('nav.notFound', { place: intent.place }), buttons, matched: false, source: 'nav' });
    return true;
  }

  button(value: string): boolean {
    if (!value.startsWith('nav:')) return false;
    this.driver.goTo(value.slice(4));
    return true;
  }

  private isSuffixForm(text: string): boolean {
    const t = text.toLowerCase().trim();
    return this.packs.some((p) => (p.goAfter ?? []).some((w) => t.endsWith(w.toLowerCase())));
  }

  private matchPage(place: string): SitePage | undefined {
    const want = terms(place);
    if (!want.length) return undefined;
    let best: SitePage | undefined;
    let bestScore = 0;
    for (const p of this.pages) {
      const names = (Array.isArray(p.name) ? p.name : [p.name]).flatMap((n) => (typeof n === 'string' ? [n] : Object.values(n)));
      const have = terms([...names, ...(p.keywords ?? [])].join(' '));
      const score = want.filter((w) => have.some((h) => h === w || (w.length >= 4 && h.startsWith(w)))).length / want.length;
      if (score > bestScore) [best, bestScore] = [p, score];
    }
    return bestScore >= 0.5 ? best : undefined;
  }

  /** A link, tab or menu item on screen with that name; a heading if it's a section of this page. */
  private matchElement(place: string, pageUrl?: string): PageElement | undefined {
    if (!this.g.page) return undefined;
    const model = this.g.page.read();
    const hits = findElements(model, place, 8);
    const byUrl = pageUrl ? model.elements.find((e) => e.role === 'link' && e.href && sameTarget(e.href, pageUrl)) : undefined;
    return byUrl ?? hits.find((e) => ['link', 'tab', 'menuitem'].includes(e.role)) ?? hits.find((e) => e.role === 'heading') ?? hits.find((e) => e.role === 'button' && /cart|basket|bag|menu|account|orders?/i.test(e.name));
  }
}

const first = (v: Localized | Localized[]) => (Array.isArray(v) ? v[0]! : v);

function sameTarget(href: string, url: string): boolean {
  const strip = (u: string) => u.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') || '/';
  return strip(href) === strip(url);
}
