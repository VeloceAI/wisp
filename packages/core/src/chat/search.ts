import { terms } from './text';

export interface SearchDoc {
  id: string;
  /** Short, high-weight text such as FAQ questions or a page title. */
  title: string;
  body: string;
  keywords?: string[];
}

export interface SearchHit {
  id: string;
  score: number;
  /** Share of the query's terms found in the doc, 0..1. */
  coverage: number;
}

interface Indexed {
  id: string;
  tf: Map<string, number>;
  len: number;
}

const K1 = 1.2;
const B = 0.75;
const TITLE_WEIGHT = 3;

/** Small BM25 index; plenty for a site's FAQ, docs and page text. */
export class SearchIndex {
  private docs: Indexed[] = [];
  private df = new Map<string, number>();
  private avgLen = 1;

  constructor(docs: SearchDoc[] = []) {
    for (const d of docs) this.add(d);
  }

  get size(): number {
    return this.docs.length;
  }

  add(doc: SearchDoc): void {
    const tf = new Map<string, number>();
    const bump = (t: string, w: number) => tf.set(t, (tf.get(t) ?? 0) + w);
    for (const t of terms(doc.title)) bump(t, TITLE_WEIGHT);
    for (const t of terms((doc.keywords ?? []).join(' '))) bump(t, TITLE_WEIGHT);
    for (const t of terms(doc.body)) bump(t, 1);
    for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    let len = 0;
    for (const v of tf.values()) len += v;
    this.docs.push({ id: doc.id, tf, len });
    this.avgLen = this.docs.reduce((s, d) => s + d.len, 0) / this.docs.length || 1;
  }

  search(query: string, limit = 5): SearchHit[] {
    const q = [...new Set(terms(query))];
    if (!q.length) return [];
    const N = this.docs.length;
    const hits: SearchHit[] = [];
    for (const d of this.docs) {
      let score = 0;
      let matched = 0;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        matched++;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += (idf * f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / this.avgLen));
      }
      if (matched) hits.push({ id: d.id, score, coverage: matched / q.length });
    }
    return hits.sort((a, b) => b.score - a.score || b.coverage - a.coverage).slice(0, limit);
  }
}
