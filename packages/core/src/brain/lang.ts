/** Built-in lines ship in en, hi and hinglish; owners may add any language code (ta, bn, es…). */
export type Lang = 'en' | 'hi' | 'hinglish' | (string & {});
export const BUILT_IN_LANGS = ['en', 'hi', 'hinglish'] as const;
export type Localized = string | Partial<Record<Lang, string>>;

export function localize(text: Localized | undefined, lang: Lang): string {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  return text[lang] ?? text.en ?? Object.values(text).find((v) => v !== undefined) ?? '';
}

export function fill(text: string, vars: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

const HINGLISH_MARKERS = new Set(
  'hai hain kya kaise kaisa mujhe mera meri mere karna karo karu karun nahi nahin kahan kahaan kab kyun kyu chahiye hoga hogi raha rahi rahe wala wali bhai yaar kuch aap tum batao bata dikhao dikha ka ki ke ko mein toh bhi accha acha theek thik haan matlab kidhar kitna kitne kitni sakta sakti sakte lena dena milega milta'.split(' '),
);

/** Scripts that identify a language on their own. Devanagari is treated as Hindi. */
const SCRIPTS: [RegExp, Lang][] = [
  [/[ऀ-ॿ]/g, 'hi'],
  [/[ঀ-৿]/g, 'bn'],
  [/[਀-੿]/g, 'pa'],
  [/[઀-૿]/g, 'gu'],
  [/[஀-௿]/g, 'ta'],
  [/[ఀ-౿]/g, 'te'],
  [/[ಀ-೿]/g, 'kn'],
  [/[ഀ-ൿ]/g, 'ml'],
  [/[؀-ۿ]/g, 'ar'],
  [/[Ѐ-ӿ]/g, 'ru'],
  [/[一-鿿]/g, 'zh'],
  [/[぀-ヿ]/g, 'ja'],
  [/[가-힯]/g, 'ko'],
];

/**
 * Best guess from the text itself. Latin-script languages other than English and
 * Hinglish can't be told apart cheaply, so `fallback` (usually the page language) wins there.
 */
export function detectLang(text: string, fallback: Lang = 'en'): Lang {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (!letters) return fallback;
  for (const [re, lang] of SCRIPTS) {
    if ((text.match(re) ?? []).length / letters.length > 0.3) return lang;
  }
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = words.filter((w) => HINGLISH_MARKERS.has(w)).length;
  if (hits >= 2 || (words.length > 0 && words.length <= 3 && hits >= 1 && hits / words.length >= 0.34)) return 'hinglish';
  return fallback === 'hi' || fallback === 'hinglish' ? 'en' : fallback;
}

/** "hi-IN" → "hi", "pt-BR" → "pt". */
export function langFromLocale(locale: string | undefined): Lang {
  const code = locale?.split(/[-_]/)[0]?.toLowerCase();
  return code && /^[a-z]{2,3}$/.test(code) ? code : 'en';
}
