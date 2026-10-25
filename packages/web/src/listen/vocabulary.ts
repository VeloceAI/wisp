import { baseVocabulary, localize, type Guide, type GuideConfig, type Vocabulary } from '@veloceai/wisp-core';

let base: Vocabulary | null = null;

/** Words this page and product use, so a misheard "card" becomes "cart" and "milc" becomes "milk". */
export function vocabulary(guide: Guide, config: GuideConfig): Vocabulary {
  base ??= baseVocabulary();
  const extra: string[] = [];
  for (const e of guide.page?.read().elements ?? []) if (!e.sensitive) extra.push(e.name);
  for (const p of config.pages ?? []) for (const n of Array.isArray(p.name) ? p.name : [p.name]) extra.push(localize(n, 'en'));
  extra.push(...Object.keys(config.shop?.synonyms ?? {}), ...Object.values(config.shop?.synonyms ?? {}));
  const words = extra.join(' ').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4);
  return { known: base.known, targets: [...base.targets, ...words] };
}
