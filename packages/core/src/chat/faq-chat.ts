import type { Button, ContentDoc, FaqEntry } from '../brain/config';
import { localize, type Lang } from '../brain/lang';
import type { Lines } from '../brain/lines';
import { SearchIndex } from './search';
import { splitSentences, terms } from './text';

export interface ChatAnswer {
  text: string;
  buttons: Button[];
  matched: boolean;
  source?: string;
}

export interface Answerer {
  answer(question: string, lang: Lang): Promise<ChatAnswer>;
}

// Small FAQs make BM25 scores tiny, so confidence is judged by how much of the question matched.
const MIN_COVERAGE = 0.5;

/** Answers from the site's own FAQ and content with keyword matching. No AI, no network. */
export class FaqChat implements Answerer {
  private index = new SearchIndex();
  private faq = new Map<string, FaqEntry>();
  private content = new Map<string, ContentDoc>();
  private order: string[] = [];

  constructor(
    faq: FaqEntry[],
    content: ContentDoc[],
    private lines: Lines,
  ) {
    faq.forEach((f, i) => {
      const id = `faq:${f.id ?? i}`;
      this.faq.set(id, f);
      this.order.push(id);
      const qs = (Array.isArray(f.q) ? f.q : [f.q]).flatMap((q) => (typeof q === 'string' ? [q] : Object.values(q)));
      const answers = typeof f.a === 'string' ? [f.a] : Object.values(f.a);
      this.index.add({ id, title: qs.join(' '), body: answers.join(' '), keywords: f.keywords });
    });
    content.forEach((c, i) => {
      const id = `doc:${c.id ?? i}`;
      this.content.set(id, c);
      this.index.add({ id, title: c.title, body: c.text });
    });
  }

  /** Best-matching FAQ entries and content for a question, as plain facts for an AI prompt. */
  retrieve(question: string, lang: Lang, limit = 5): { title: string; text: string; url?: string }[] {
    return this.index.search(question, limit).flatMap((h) => {
      const f = this.faq.get(h.id);
      if (f) return [{ title: this.question(h.id, lang), text: localize(f.a, lang), url: f.link?.href }];
      const doc = this.content.get(h.id);
      return doc ? [{ title: doc.title, text: doc.text.slice(0, 1200), url: doc.url }] : [];
    });
  }

  question(id: string, lang: Lang): string {
    const f = this.faq.get(id);
    if (!f) return '';
    const q = Array.isArray(f.q) ? f.q[0] : f.q;
    return localize(q, lang);
  }

  suggestions(lang: Lang, count = 3, exclude: string[] = []): Button[] {
    return [...this.extra(lang), ...this.order
      .filter((id) => !exclude.includes(id))
      .slice(0, count)
      .map((id) => ({ label: this.question(id, lang), value: id }))];
  }

  /** Tap-to-run buttons for the site's declared actions (set by the guide). */
  extra: (lang: Lang) => Button[] = () => [];

  faqAnswer(id: string, lang: Lang): ChatAnswer | null {
    const f = this.faq.get(id);
    if (!f) return null;
    const buttons: Button[] = [];
    if (f.link) buttons.push({ label: localize(f.link.label, lang) || this.lines.pick('chat.readMore', lang), value: `link:${f.link.href}` });
    return { text: localize(f.a, lang), buttons, matched: true, source: id };
  }

  async answer(question: string, lang: Lang): Promise<ChatAnswer> {
    const hits = this.index.search(question, 4);
    const top = hits[0];
    const confident = top && top.coverage >= MIN_COVERAGE;
    if (!top || !confident) {
      return { text: this.lines.pick('chat.unknown', lang), buttons: this.suggestions(lang), matched: false };
    }
    const related = hits
      .slice(1)
      .filter((h) => h.id.startsWith('faq:') && h.coverage >= 0.34)
      .slice(0, 2)
      .map((h) => ({ label: this.question(h.id, lang), value: h.id }));

    const faq = this.faqAnswer(top.id, lang);
    if (faq) return { ...faq, buttons: [...faq.buttons, ...related] };

    const doc = this.content.get(top.id)!;
    const buttons: Button[] = doc.url ? [{ label: this.lines.pick('chat.readMore', lang), value: `link:${doc.url}` }] : [];
    return { text: bestSnippet(doc.text, question), buttons: [...buttons, ...related], matched: true, source: top.id };
  }
}

export function bestSnippet(text: string, question: string, maxSentences = 2): string {
  const q = new Set(terms(question));
  const sentences = splitSentences(text);
  let best = 0;
  let bestScore = -1;
  sentences.forEach((s, i) => {
    const score = terms(s).filter((t) => q.has(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return sentences.slice(best, best + maxSentences).join(' ');
}
