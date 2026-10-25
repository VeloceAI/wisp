import type { Lang } from '../brain/lang';
import type { Lines } from '../brain/lines';
import { bestSnippet } from '../chat/faq-chat';
import { SearchIndex } from '../chat/search';
import { terms } from '../chat/text';
import { INTERACTIVE_ROLES, type PageElement, type PageModel, type PageRole } from './model';

const ROLE_WORDS: Record<string, PageRole[]> = {
  button: ['button'], btn: ['button'], बटन: ['button'],
  link: ['link'], लिंक: ['link'],
  box: ['textbox', 'searchbox'], field: ['textbox', 'searchbox'], input: ['textbox', 'searchbox'], bar: ['searchbox', 'textbox'],
  dropdown: ['combobox'], select: ['combobox'], menu: ['combobox', 'menuitem'],
  checkbox: ['checkbox'], tick: ['checkbox'], toggle: ['switch', 'checkbox'],
  tab: ['tab'], heading: ['heading'], section: ['heading'], part: ['heading'],
  image: ['img'], photo: ['img'], picture: ['img'],
};

const ROLE_LABELS: Record<string, Partial<Record<PageRole, string>>> = {
  en: { button: 'button', link: 'link', textbox: 'text box', searchbox: 'search box', combobox: 'dropdown', checkbox: 'checkbox', heading: 'section', img: 'image' },
  hi: { button: 'बटन', link: 'लिंक', textbox: 'टेक्स्ट बॉक्स', searchbox: 'सर्च बॉक्स', combobox: 'ड्रॉपडाउन', checkbox: 'चेकबॉक्स', heading: 'हिस्सा', img: 'तस्वीर' },
};

export function roleLabel(role: PageRole, lang: Lang): string {
  return ROLE_LABELS[lang]?.[role] ?? ROLE_LABELS.en![role] ?? role;
}

export function describeElement(el: PageElement, lang: Lang): string {
  return `“${el.name}” (${roleLabel(el.role, lang)})`;
}

/** Ranks page elements against a description like "search box" or "add to cart in Pricing". */
export function findElements(model: PageModel, query: string, limit = 3): PageElement[] {
  const words = terms(query);
  const roles = new Set(words.flatMap((w) => ROLE_WORDS[w] ?? []));
  const wanted = words.filter((w) => !ROLE_WORDS[w]);
  if (!wanted.length && !roles.size) return [];
  const scored = model.elements
    .filter((el) => !el.disabled || INTERACTIVE_ROLES.has(el.role))
    .map((el) => {
      const own = terms(`${el.name} ${el.action ?? ''}`);
      const ctx = terms(el.section ?? '');
      let hits = 0;
      for (const w of wanted) {
        if (own.includes(w)) hits += 1;
        else if (own.some((o) => w.length >= 4 && (o.startsWith(w) || w.startsWith(o)) && o.length >= 3)) hits += 0.7;
        else if (ctx.includes(w)) hits += 0.4;
      }
      const coverage = wanted.length ? hits / wanted.length : 1;
      const roleFit = roles.size ? (roles.has(el.role) ? 0.5 : -0.3) : 0;
      return { el, score: coverage + roleFit + (el.inView ? 0.05 : 0) };
    })
    .filter((s) => s.score >= 0.6);
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.el);
}

/** "What's on this page?" without AI: title, sections, and the main things you can do. */
export function explainPage(model: PageModel, lang: Lang, lines: Lines): string {
  if (model.blocked) return lines.pick('page.blocked', lang);
  const sections = unique(mainSections(model).map((e) => e.name)).slice(0, 5);
  const actions = unique(
    model.elements
      .filter((e) => ['button', 'searchbox', 'combobox'].includes(e.role) && !e.sensitive && e.name.length <= 40)
      .map((e) => e.name),
  ).slice(0, 5);
  const parts = [lines.pick('page.summary', lang, { title: model.title || model.url })];
  if (sections.length) parts.push(lines.pick('page.sections', lang, { list: sections.join(', ') }));
  if (actions.length) parts.push(lines.pick('page.actions', lang, { list: actions.join(', ') }));
  return parts.join(' ');
}

/** The page's top-level sections: h2s when there are any, otherwise h3s. */
export function mainSections(model: PageModel): PageElement[] {
  const headings = model.elements.filter((e) => e.role === 'heading' && (e.level ?? 2) > 1);
  const top = Math.min(...headings.map((h) => h.level ?? 2));
  return headings.filter((h) => (h.level ?? 2) === top);
}

/** Page text as facts for the AI, best matches first. */
export function pageFacts(model: PageModel, question: string, limit = 4): { title: string; text: string }[] {
  if (model.blocked || !model.passages.length) return [];
  const index = new SearchIndex(model.passages.map((p, i) => ({ id: String(i), title: p.section, body: p.text })));
  return index.search(question, limit).map((h) => {
    const p = model.passages[Number(h.id)]!;
    return { title: p.section || model.title, text: p.text.slice(0, 1000) };
  });
}

/** Answers from the page text alone, or null when nothing on the page fits well enough. */
export function answerFromPage(model: PageModel, question: string): string | null {
  if (model.blocked) return null;
  const index = new SearchIndex(model.passages.map((p, i) => ({ id: String(i), title: p.section, body: p.text })));
  const top = index.search(question, 1)[0];
  if (!top || top.coverage < 0.5) return null;
  return bestSnippet(model.passages[Number(top.id)]!.text, question);
}

const unique = (list: string[]) => [...new Set(list.map((s) => s.trim()).filter(Boolean))];
