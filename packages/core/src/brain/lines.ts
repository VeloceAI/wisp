import { fill, type Lang, type Localized } from './lang';

export type LineSet = Partial<Record<Lang, string[]>>;
export type LineBank = Record<string, LineSet>;

/** Prewritten lines. Every id has en, hi and hinglish so the guide works with no AI at all. */
export const DEFAULT_LINES: LineBank = {
  'welcome.first': {
    en: ["Hi, I'm {name}! Want a quick tour?", "Hello! I'm {name}. Shall I show you around?"],
    hi: ['नमस्ते, मैं {name} हूँ! क्या आप एक छोटा टूर लेना चाहेंगे?'],
    hinglish: ['Hi, main {name} hoon! Ek chhota sa tour karein?'],
  },
  'welcome.hello': {
    en: ["Hi, I'm {name}! Tap me any time you need help.", "Hello! I'm {name}. Tap me if you have a question."],
    hi: ['नमस्ते, मैं {name} हूँ! मदद चाहिए तो मुझे टैप करें।'],
    hinglish: ['Hi, main {name} hoon! Help chahiye toh mujhe tap karo.'],
  },
  'welcome.back': {
    en: ['Welcome back!', 'Good to see you again!', 'Hey, you’re back!'],
    hi: ['फिर से स्वागत है!', 'आपको फिर देखकर अच्छा लगा!'],
    hinglish: ['Welcome back!', 'Aap wapas aa gaye, badhiya!'],
  },
  'welcome.resume': {
    en: ['Want to finish the tour?'],
    hi: ['क्या टूर पूरा करें?'],
    hinglish: ['Tour poora karein?'],
  },
  giggle: {
    en: ['Hehe, that tickles!', 'Hee hee!', 'Oh! Hi there!'],
    hi: ['हीहीही, गुदगुदी होती है!', 'अरे! नमस्ते!'],
    hinglish: ['Hehe, gudgudi hoti hai!', 'Arre! Hi!'],
  },
  'giggle.many': {
    en: ['Okay okay, I’m awake!', 'Stop it, you’re making me blush!'],
    hi: ['बस बस, मैं जाग गया!', 'अरे बस, शर्मा गया मैं!'],
    hinglish: ['Bas bas, main jaag gaya!', 'Arre bas, sharma gaya main!'],
  },
  wake: {
    en: ['Oh! I’m up, I’m up.', 'Mm? Oh, hi again!'],
    hi: ['अरे! मैं जाग गया।', 'हम्म? अरे, फिर से नमस्ते!'],
    hinglish: ['Arre! Main jaag gaya.', 'Hmm? Oh, hi again!'],
  },
  success: {
    en: ['Yay, it worked!', 'Done! Nicely done.', 'All set!'],
    hi: ['वाह, हो गया!', 'बढ़िया, काम हो गया!'],
    hinglish: ['Yay, ho gaya!', 'Badhiya, kaam ho gaya!'],
  },
  'error.generic': {
    en: ['Hmm, something went wrong. Please try again in a moment.'],
    hi: ['कुछ गड़बड़ हो गई। कृपया थोड़ी देर में फिर से कोशिश करें।'],
    hinglish: ['Kuch gadbad ho gayi. Thodi der mein phir try karein.'],
  },
  'loading.slow': {
    en: ['Still working on it…', 'Almost there, hang on…'],
    hi: ['अभी काम चल रहा है…', 'बस थोड़ा और…'],
    hinglish: ['Abhi kaam chal raha hai…', 'Bas thoda aur…'],
  },
  'leave.nudge': {
    en: ['Before you go — can I help you find something?'],
    hi: ['जाने से पहले — क्या मैं कुछ ढूँढने में मदद करूँ?'],
    hinglish: ['Jaane se pehle — kuch dhoondhne mein help karoon?'],
  },
  'tour.done': {
    en: ['That’s the tour! Tap me any time you need help.'],
    hi: ['टूर पूरा हुआ! जब भी मदद चाहिए, मुझे टैप करें।'],
    hinglish: ['Tour khatam! Jab bhi help chahiye, mujhe tap karna.'],
  },
  'chat.hello': {
    en: ['Ask me anything about this site, or tap a question below.'],
    hi: ['इस साइट के बारे में कुछ भी पूछें, या नीचे कोई सवाल चुनें।'],
    hinglish: ['Is site ke baare mein kuch bhi poocho, ya neeche koi sawaal tap karo.'],
  },
  'chat.unknown': {
    en: ['I’m not sure about that one yet. Maybe one of these helps?'],
    hi: ['इसके बारे में मुझे पक्का नहीं पता। शायद इनमें से कुछ काम आए?'],
    hinglish: ['Iske baare mein pakka nahi pata. Shayad inme se kuch kaam aaye?'],
  },
  'chat.readMore': { en: ['Read more'], hi: ['और पढ़ें'], hinglish: ['Aur padho'] },
};

export const UI_STRINGS = {
  tourStart: { en: 'Show me around', hi: 'टूर दिखाओ', hinglish: 'Tour dikhao' },
  notNow: { en: 'Not now', hi: 'अभी नहीं', hinglish: 'Abhi nahi' },
  next: { en: 'Next', hi: 'आगे', hinglish: 'Aage' },
  back: { en: 'Back', hi: 'पीछे', hinglish: 'Peeche' },
  skip: { en: 'Skip', hi: 'छोड़ें', hinglish: 'Skip' },
  done: { en: 'Done', hi: 'हो गया', hinglish: 'Ho gaya' },
  resume: { en: 'Continue', hi: 'जारी रखें', hinglish: 'Continue karo' },
  askMe: { en: 'Ask me', hi: 'मुझसे पूछें', hinglish: 'Mujhse poocho' },
  placeholder: { en: 'Ask me anything…', hi: 'कुछ भी पूछें…', hinglish: 'Kuch bhi poocho…' },
  send: { en: 'Send', hi: 'भेजें', hinglish: 'Bhejo' },
  hide: { en: 'Hide', hi: 'छिपाएँ', hinglish: 'Chhupao' },
  show: { en: 'Show guide', hi: 'गाइड दिखाएँ', hinglish: 'Guide dikhao' },
  close: { en: 'Close', hi: 'बंद करें', hinglish: 'Band karo' },
  helpLots: { en: 'Help me a lot', hi: 'ज़्यादा मदद', hinglish: 'Zyada help' },
  helpTips: { en: 'Just tips', hi: 'बस टिप्स', hinglish: 'Bas tips' },
  language: { en: 'Language', hi: 'भाषा', hinglish: 'Bhasha' },
  settings: { en: 'Settings', hi: 'सेटिंग्स', hinglish: 'Settings' },
  voice: { en: 'Voice', hi: 'आवाज़', hinglish: 'Awaaz' },
  on: { en: 'On', hi: 'चालू', hinglish: 'On' },
  off: { en: 'Off', hi: 'बंद', hinglish: 'Off' },
  speak: { en: 'Speak', hi: 'बोलें', hinglish: 'Bolo' },
  stop: { en: 'Stop', hi: 'रुकें', hinglish: 'Ruko' },
  yes: { en: 'Yes, go ahead', hi: 'हाँ, करें', hinglish: 'Haan, karo' },
  no: { en: 'No', hi: 'नहीं', hinglish: 'Nahi' },
} satisfies Record<string, Record<'en' | 'hi' | 'hinglish', string>>;
export type UiStringKey = keyof typeof UI_STRINGS;
export type UiOverrides = Partial<Record<UiStringKey, Localized>>;

/** Button and label text; owners add other languages through `ui` in their config. */
export function uiText(key: UiStringKey, lang: Lang, overrides: UiOverrides = {}): string {
  const own = overrides[key];
  const fromOwner = own === undefined ? '' : typeof own === 'string' ? own : own[lang] ?? '';
  const builtIn = UI_STRINGS[key] as Record<string, string>;
  return fromOwner || builtIn[lang] || (typeof own === 'object' ? own.en : own) || builtIn.en!;
}

export class Lines {
  private bank: LineBank;
  private last = new Map<string, string>();

  constructor(
    overrides: Record<string, Localized | Localized[]> = {},
    private random: () => number = Math.random,
  ) {
    this.bank = { ...DEFAULT_LINES };
    for (const [id, value] of Object.entries(overrides)) this.bank[id] = toLineSet(value);
  }

  has(id: string): boolean {
    return id in this.bank;
  }

  pick(id: string, lang: Lang, vars?: Record<string, string | number>): string {
    const set = this.bank[id];
    if (!set) return '';
    const options = set[lang]?.length ? set[lang]! : set.en ?? Object.values(set).find((v) => v?.length) ?? [];
    if (!options.length) return '';
    const prev = this.last.get(id);
    const pool = options.length > 1 ? options.filter((o) => o !== prev) : options;
    const choice = pool[Math.floor(this.random() * pool.length)] ?? options[0]!;
    this.last.set(id, choice);
    return fill(choice, vars);
  }
}

export function toLineSet(value: Localized | Localized[]): LineSet {
  const list = Array.isArray(value) ? value : [value];
  const set: LineSet = {};
  for (const item of list) {
    const entries: [Lang, string][] = typeof item === 'string' ? [['en', item]] : (Object.entries(item) as [Lang, string][]);
    for (const [lang, text] of entries) (set[lang] ??= []).push(text);
  }
  return set;
}
