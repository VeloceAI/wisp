import { BUILT_IN_WORD_PACKS } from '../shop/words';
import { NAV_WORDS } from '../nav/words';
import { catalogWords } from '../shop/catalog-words';

const COMMON =
  'the a an and or but to of in on at for with from by is are was were be been am i me my you your we our it its this that these those what which who how when where why can could would should will shall do does did have has had not no yes please want need give get show find put take make go come see look tell more less some any all one two three four five six seven eight nine ten first second third last next new old big small good best cheap cheapest price total cart page here there now then also just only very much many again back up down top bottom'.split(' ');

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

const SOUND: Record<string, string> = { b: '1', f: '1', p: '1', v: '1', c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2', d: '3', t: '3', l: '4', m: '5', n: '5', r: '6' };

/** Soundex-style key without the first letter, so "onion", "anian" and "aniam" all match. Latin words only. */
function soundKey(w: string): string {
  if (!/^[a-z]{3,}$/.test(w)) return '';
  let key = '';
  let last = SOUND[w[0]!] ?? '';
  for (const ch of w.slice(1)) {
    const code = SOUND[ch] ?? '';
    if (code && code !== last) key += code;
    if (!'hw'.includes(ch)) last = code;
  }
  return `${'aeiou'.includes(w[0]!) ? 'V' : w[0]}${key.slice(0, 3)}`;
}

const commonPrefix = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i;
};

const splitWords = (phrases: Iterable<string>) => [...phrases].flatMap((p) => p.toLowerCase().split(/\s+/)).filter((w) => w.length > 1);

export interface Vocabulary {
  /** Words that are never changed (grammar, shopping and navigation words, numbers). */
  known: string[];
  /** Words a misheard word may be snapped to (products, pages, places). */
  targets: string[];
}

/** The built-in vocabulary; add names from the page and the store before correcting. */
export function baseVocabulary(): Vocabulary {
  const known = new Set<string>(COMMON);
  for (const p of [...BUILT_IN_WORD_PACKS, ...NAV_WORDS]) {
    for (const v of Object.values(p)) {
      if (Array.isArray(v)) splitWords(v.filter((x): x is string => typeof x === 'string')).forEach((w) => known.add(w));
      else if (v && typeof v === 'object') splitWords(Object.keys(v)).forEach((w) => known.add(w));
    }
  }
  const targets = new Set(splitWords([...catalogWords(), 'cart basket total orders checkout delivery account search returns help']));
  return { known: [...known], targets: [...targets] };
}

/**
 * Snaps slightly misheard product and page words to known ones ("card" → "cart", "anian" → "onion").
 * Ordinary words are left alone, so "first" or "three" are never "corrected".
 */
export function correctTranscript(text: string, vocab: Vocabulary): string {
  const known = new Set(vocab.known.map((v) => v.toLowerCase()));
  const targets = [...new Set(vocab.targets.map((v) => v.toLowerCase()).filter((v) => v.length >= 4))];
  const targetSet = new Set(targets);
  return text
    .split(/(\s+)/)
    .map((token) => {
      const m = token.match(/^([\p{P}]*)([\p{L}\p{N}]+)([\p{P}]*)$/u);
      if (!m) return token;
      const [, pre, word, post] = m as unknown as [string, string, string, string];
      const w = word.toLowerCase();
      if (known.has(w) || targetSet.has(w) || w.length < 3 || /\d/.test(w)) return token;
      const limit = w.length <= 4 ? 1 : 2;
      const sound = soundKey(w);
      let best: string | null = null;
      let bestScore = Infinity;
      for (const v of targets) {
        const sameSound = !!sound && sound === soundKey(v);
        if (!sameSound && v[0] !== w[0] && !(w.length > 4 && v.slice(1, 3) === w.slice(1, 3))) continue;
        const d = distance(w, v);
        // Words that sound alike may be one edit further apart ("aniam" → "onion").
        if (d > limit + (sameSound ? 1 : 0)) continue;
        // Lower is better: edits, minus a bonus for sounding alike; ties go to the same length, then the same start.
        const score = d - (sameSound ? 1.5 : 0) + Math.abs(v.length - w.length) * 0.1 - commonPrefix(w, v) * 0.01;
        if (score < bestScore) [best, bestScore] = [v, score];
      }
      return best ? `${pre}${best}${post}` : token;
    })
    .join('');
}
