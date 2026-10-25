/** Phrases for moving around an app by voice. Non-English packs are first drafts for native review. */
export interface NavWordPack {
  lang: string;
  /** Before the place: "go to cart". */
  goBefore: string[];
  /** After the place: "cart pe jao", "கார்ட்டுக்கு போ". */
  goAfter: string[];
  back: string[];
  up: string[];
  down: string[];
  top: string[];
  bottom: string[];
  /** Words for "page" / "screen", dropped from the place name. */
  page: string[];
}

export const NAV_WORDS: NavWordPack[] = [
  {
    lang: 'en',
    goBefore: ['go to the', 'go to', 'take me to the', 'take me to', 'navigate to', 'open the', 'open my', 'open', 'visit', 'switch to', 'show me the', 'bring up'],
    goAfter: ['page please'],
    back: ['go back', 'back please', 'previous page', 'take me back', 'back'],
    up: ['scroll up', 'go up', 'move up'],
    down: ['scroll down', 'go down', 'move down', 'show more'],
    top: ['go to top', 'go to the top', 'back to top', 'top of the page', 'scroll to top'],
    bottom: ['go to bottom', 'go to the bottom', 'bottom of the page', 'scroll to bottom'],
    page: ['page', 'screen', 'section', 'tab'],
  },
  {
    lang: 'hinglish',
    goBefore: [],
    goAfter: ['pe le chalo', 'par le chalo', 'pe jao', 'par jao', 'pe chalo', 'par chalo', 'kholo', 'khol do', 'dikhao page', 'page dikhao', 'page kholo'],
    back: ['peeche jao', 'piche jao', 'wapas jao', 'pichla page', 'peeche chalo'],
    up: ['upar jao', 'upar scroll karo', 'upar karo'],
    down: ['neeche jao', 'niche jao', 'neeche scroll karo', 'niche scroll karo', 'aur dikhao'],
    top: ['sabse upar jao', 'sabse upar'],
    bottom: ['sabse neeche jao', 'sabse neeche'],
    page: ['page', 'wala page', 'screen'],
  },
  {
    lang: 'hi',
    goBefore: [],
    goAfter: ['पर ले चलो', 'पे ले चलो', 'पर जाओ', 'पे जाओ', 'खोलो', 'खोल दो', 'पेज खोलो', 'पेज दिखाओ'],
    back: ['पीछे जाओ', 'वापस जाओ', 'पिछला पेज'],
    up: ['ऊपर जाओ', 'ऊपर स्क्रॉल करो'],
    down: ['नीचे जाओ', 'नीचे स्क्रॉल करो'],
    top: ['सबसे ऊपर जाओ', 'सबसे ऊपर'],
    bottom: ['सबसे नीचे जाओ', 'सबसे नीचे'],
    page: ['पेज', 'पन्ना', 'वाला पेज'],
  },
  { lang: 'ta', goBefore: [], goAfter: ['க்கு போ', 'க்கு போங்க', 'திற', 'திறங்க'], back: ['பின்னால் போ', 'திரும்பி போ'], up: ['மேலே போ'], down: ['கீழே போ'], top: ['மேலே மேலே'], bottom: ['கடைசிக்கு போ'], page: ['பக்கம்'] },
  { lang: 'te', goBefore: [], goAfter: ['కి వెళ్ళు', 'కి తీసుకెళ్ళు', 'తెరువు', 'తెరవండి'], back: ['వెనక్కి వెళ్ళు'], up: ['పైకి వెళ్ళు'], down: ['కిందకి వెళ్ళు'], top: ['పైకి'], bottom: ['చివరికి'], page: ['పేజీ'] },
  { lang: 'bn', goBefore: [], goAfter: ['এ যাও', 'তে যাও', 'খোলো', 'খুলুন'], back: ['পিছনে যাও', 'ফিরে যাও'], up: ['উপরে যাও'], down: ['নিচে যাও'], top: ['একদম উপরে'], bottom: ['একদম নিচে'], page: ['পাতা', 'পেজ'] },
  { lang: 'mr', goBefore: [], goAfter: ['वर जा', 'वर न्या', 'उघडा', 'उघड'], back: ['मागे जा'], up: ['वर जा'], down: ['खाली जा'], top: ['सगळ्यात वर'], bottom: ['सगळ्यात खाली'], page: ['पान', 'पेज'] },
  { lang: 'gu', goBefore: [], goAfter: ['પર જાઓ', 'પર લઈ જાઓ', 'ખોલો'], back: ['પાછા જાઓ'], up: ['ઉપર જાઓ'], down: ['નીચે જાઓ'], top: ['સૌથી ઉપર'], bottom: ['સૌથી નીચે'], page: ['પેજ', 'પાનું'] },
  { lang: 'kn', goBefore: [], goAfter: ['ಗೆ ಹೋಗು', 'ಗೆ ಕರೆದೊಯ್ಯಿ', 'ತೆರೆ', 'ತೆರೆಯಿರಿ'], back: ['ಹಿಂದೆ ಹೋಗು'], up: ['ಮೇಲೆ ಹೋಗು'], down: ['ಕೆಳಗೆ ಹೋಗು'], top: ['ಮೇಲ್ಭಾಗಕ್ಕೆ'], bottom: ['ಕೆಳಭಾಗಕ್ಕೆ'], page: ['ಪುಟ', 'ಪೇಜ್'] },
  { lang: 'ml', goBefore: [], goAfter: ['ലേക്ക് പോകൂ', 'തുറക്കൂ'], back: ['പിന്നോട്ട് പോകൂ'], up: ['മുകളിലേക്ക് പോകൂ'], down: ['താഴേക്ക് പോകൂ'], top: ['ഏറ്റവും മുകളിൽ'], bottom: ['ഏറ്റവും താഴെ'], page: ['പേജ്'] },
  { lang: 'pa', goBefore: [], goAfter: ['ਤੇ ਜਾਓ', 'ਤੇ ਲੈ ਚੱਲੋ', 'ਖੋਲ੍ਹੋ'], back: ['ਪਿੱਛੇ ਜਾਓ', 'ਵਾਪਸ ਜਾਓ'], up: ['ਉੱਪਰ ਜਾਓ'], down: ['ਹੇਠਾਂ ਜਾਓ'], top: ['ਸਭ ਤੋਂ ਉੱਪਰ'], bottom: ['ਸਭ ਤੋਂ ਹੇਠਾਂ'], page: ['ਪੰਨਾ', 'ਪੇਜ'] },
];

export type NavIntent = { kind: 'go'; place: string } | { kind: 'back' } | { kind: 'scroll'; to: 'up' | 'down' | 'top' | 'bottom' };

const norm = (t: string) => ` ${t.normalize('NFKC').toLowerCase().replace(/[“”"'‘’!?।.,;:]/g, ' ').replace(/\s+/g, ' ').trim()} `;
const longestFirst = (a: string, b: string) => b.length - a.length;

/** "go to delivery", "cart pe jao", "peeche jao", "scroll down" — or null when it isn't about moving around. */
export function parseNav(text: string, packs: Partial<NavWordPack>[] = NAV_WORDS): NavIntent | null {
  const t = norm(text);
  const all = (k: keyof Omit<NavWordPack, 'lang'>) => packs.flatMap((p) => p[k] ?? []).map((w) => w.toLowerCase()).sort(longestFirst);
  const whole = (list: string[]) => list.find((w) => t.trim() === w || t.trim() === `${w} please`);
  const has = (list: string[]) => list.find((w) => t.includes(` ${w} `));
  if (whole(all('top')) || has(all('top'))) return { kind: 'scroll', to: 'top' };
  if (whole(all('bottom')) || has(all('bottom'))) return { kind: 'scroll', to: 'bottom' };
  if (whole(all('back'))) return { kind: 'back' };
  if (whole(all('up'))) return { kind: 'scroll', to: 'up' };
  if (whole(all('down'))) return { kind: 'scroll', to: 'down' };

  const pageWords = all('page');
  const clean = (s: string) => {
    let out = ` ${s.trim()} `;
    for (const w of pageWords) out = out.split(` ${w} `).join(' ');
    return out.replace(/\s+/g, ' ').trim();
  };
  for (const w of all('goBefore')) {
    if (t.startsWith(` ${w} `)) {
      const place = clean(t.slice(w.length + 1));
      if (place) return { kind: 'go', place };
    }
  }
  for (const w of all('goAfter')) {
    const at = t.lastIndexOf(` ${w} `);
    if (at > 0 && at + w.length + 2 >= t.length) {
      const place = clean(t.slice(0, at));
      if (place) return { kind: 'go', place };
    }
    // Scripts that glue the case ending to the word ("கார்ட்டுக்கு போ"): match on the bare suffix too.
    if (/^[^\sa-z]/.test(w) && t.trimEnd().endsWith(w)) {
      const place = clean(t.trimEnd().slice(0, -w.length));
      if (place) return { kind: 'go', place };
    }
  }
  return null;
}
