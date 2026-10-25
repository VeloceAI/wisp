import type { ChatAnswer } from '../chat/faq-chat';
import { parsePageIntent } from '../page/intents';
import type { PageModel } from '../page/model';
import { answerFromPage, describeElement, explainPage, findElements, mainSections } from '../page/understand';
import type { Guide } from './guide';

export interface PageSource {
  read(): PageModel;
}

/** Page questions answered without AI: explain the page, or find and point at something. */
export function answerPageQuestion(g: Guide, page: PageSource, question: string): ChatAnswer | null {
  const intent = parsePageIntent(question);
  if (!intent) return null;
  const lang = g.getState().lang;
  const model = page.read();
  if (intent.type === 'explain') {
    const sections = mainSections(model).slice(0, 4);
    return {
      text: explainPage(model, lang, g.lines),
      buttons: sections.map((s) => ({ label: s.name, value: `point:${s.ref}` })),
      matched: true,
      source: 'page',
    };
  }
  const hits = findElements(model, intent.query);
  const first = hits[0];
  if (!first) return null;
  g.pointAt(`ref:${first.ref}`);
  return {
    text: g.line('page.found', { thing: describeElement(first, lang) }),
    buttons: hits.slice(1).map((h) => ({ label: describeElement(h, lang), value: `point:${h.ref}` })),
    matched: true,
    source: 'page',
  };
}

export function pageFallback(page: PageSource, question: string): ChatAnswer | null {
  const text = answerFromPage(page.read(), question);
  return text ? { text, buttons: [], matched: true, source: 'page' } : null;
}
