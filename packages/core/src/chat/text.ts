const STOP = new Set(
  (
    'a an the is are was were be been am i me my you your we our it its this that these those of to in on at for from by with and or ' +
    'do does did can could would should will shall how what when where why who which there here please tell about any some get ' +
    'hai hain kya kaise kaisa mujhe mera meri mere main mai hum ham aap tum ka ki ke ko se mein me par pe toh to bhi aur ya batao bata ' +
    'hota hoti hote karna karo kar raha rahi rahe tha thi the hoga hogi sakta sakti sakte chahiye wala wali koi kuch ' +
    'है हैं क्या मुझे मेरा मेरी मैं हम आप तुम का की के को से में पर तो भी और या बताओ बताइए करना करें था थी होगा'
  ).split(/\s+/),
);

/** Hindi and Hinglish words mapped to one English key, so FAQ written in English still matches. */
const SYNONYMS: Record<string, string> = {
  kaise: 'how', kese: 'how', कैसे: 'how',
  kab: 'when', कब: 'when',
  kahan: 'where', kahaan: 'where', kidhar: 'where', कहाँ: 'where', कहां: 'where',
  kyun: 'why', kyu: 'why', क्यों: 'why',
  kitna: 'price', kitne: 'price', kitni: 'price', daam: 'price', dam: 'price', keemat: 'price', kimat: 'price', rate: 'price',
  cost: 'price', costs: 'price', pricing: 'price', prices: 'price', कीमत: 'price', दाम: 'price', price: 'price',
  paisa: 'money', paise: 'money', पैसा: 'money', पैसे: 'money',
  wapas: 'return', wapsi: 'return', lautana: 'return', returns: 'return', refund: 'return', refunds: 'return', वापस: 'return', वापसी: 'return', रिफंड: 'return',
  delivery: 'shipping', deliver: 'shipping', ship: 'shipping', shipped: 'shipping', डिलीवरी: 'shipping',
  order: 'order', orders: 'order', ऑर्डर: 'order', ordr: 'order',
  radd: 'cancel', cancellation: 'cancel', रद्द: 'cancel', कैंसल: 'cancel',
  madad: 'help', sahayata: 'help', support: 'help', मदद: 'help', सहायता: 'help',
  khata: 'account', खाता: 'account', अकाउंट: 'account',
  signin: 'login', 'sign-in': 'login', log: 'login', लॉगिन: 'login',
  signup: 'register', 'sign-up': 'register', join: 'register',
  bhugtan: 'payment', pay: 'payment', paying: 'payment', payments: 'payment', भुगतान: 'payment', पेमेंट: 'payment', upi: 'payment',
  khoj: 'search', dhundo: 'search', dhoondo: 'search', dhundhna: 'search', find: 'search', खोज: 'search', खोजें: 'search',
  sasta: 'cheap', saste: 'cheap', सस्ता: 'cheap',
  samay: 'time', time: 'time', samai: 'time', समय: 'time',
  din: 'days', days: 'days', day: 'days', दिन: 'days',
  contact: 'contact', sampark: 'contact', संपर्क: 'contact', phone: 'contact', email: 'contact',
};

function stem(w: string): string {
  if (!/^[a-z]+$/.test(w) || w.length < 5) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing')) return w.slice(0, -3);
  if (w.endsWith('ed')) return w.slice(0, -2);
  if (w.endsWith('es') && /(sh|ch|x|ss)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

export function rawWords(text: string): string[] {
  return normalize(text).match(/[\p{L}\p{M}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? [];
}

/** Content terms for matching: stop words dropped, synonyms folded, English stemmed. */
export function terms(text: string): string[] {
  const out: string[] = [];
  for (const w of rawWords(text)) {
    if (STOP.has(w)) continue;
    const key = SYNONYMS[w] ?? stem(w);
    if (key.length < 2 && !/\d/.test(key)) continue;
    out.push(key);
  }
  return out;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
