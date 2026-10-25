import type { ShopWordPack } from './types';
import { INDIC_WORD_PACKS } from './words-indic';

const units = (map: Record<string, string[]>) => Object.fromEntries(Object.entries(map).flatMap(([u, words]) => words.map((w) => [w, u])));

export const EN_WORDS: ShopWordPack = {
  lang: 'en',
  find: ['give me', 'show me', 'show', 'search for', 'search', 'find me', 'find', 'look for', 'i want to see', 'do you have', 'get me some', 'any'],
  add: ['add', 'put', 'i want', 'i need', 'get me', 'buy', 'order me', 'throw in', 'include'],
  remove: ['remove', 'delete', 'take out', 'drop', "don't want", 'cancel the'],
  cart: ["what's in my cart", 'what is in my cart', 'show my cart', 'show cart', 'my cart', 'open cart', 'basket'],
  total: ['total', 'how much', 'bill', 'what do i owe'],
  checkout: ['checkout', 'check out', 'place order', 'place the order', 'order now', 'place my order', 'buy now', 'pay now'],
  more: ['one more', 'another', 'add one more', 'plus one'],
  setTo: ['make it', 'change it to', 'change to', 'set it to', 'make that'],
  done: ["that's all", 'that is all', 'done', 'stop', 'nothing else', "that's it", 'bye', 'no more'],
  yes: ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'go ahead', 'do it', 'please do', 'correct', 'right'],
  no: ['no', 'nope', "don't", 'not that', 'cancel', 'never mind'],
  cheapest: ['cheapest', 'cheaper one', 'lowest price', 'least expensive', 'budget one'],
  costliest: ['costliest', 'most expensive', 'premium one', 'best one'],
  fillers: ['please', 'some', 'the', 'a', 'an', 'me', 'my', 'for me', 'in my cart', 'in the cart', 'to my cart', 'to the cart', 'to cart', 'into the cart', 'into my cart', 'in cart', 'one', 'ones', 'it', 'of', 'item', 'items', 'thing', 'pack of', 'can you', 'could you', 'also'],
  ordinals: { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5, last: -1, 'top one': 1, 'next one': 2 },
  numbers: { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5, dozen: 12, couple: 2 },
  units: units({ kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'], g: ['g', 'gm', 'gms', 'gram', 'grams'], l: ['l', 'litre', 'litres', 'liter', 'liters', 'ltr'], ml: ['ml'], pack: ['pack', 'packs', 'packet', 'packets', 'box', 'boxes', 'bottle', 'bottles'], pc: ['piece', 'pieces', 'pc', 'pcs'], dozen: ['dozen'] }),
  under: ['under', 'below', 'less than', 'within', 'up to', 'upto', 'cheaper than', 'max'],
  and: ['and then', 'then', 'and', '&'],
};

export const HINGLISH_WORDS: ShopWordPack = {
  lang: 'hinglish',
  find: ['dikhao', 'dikha do', 'dikhana', 'dhundo', 'dhoondo', 'dhundh do', 'search karo', 'batao', 'hai kya', 'milega kya'],
  add: ['daal do', 'daalo', 'dalo', 'daal', 'dal do', 'add karo', 'add kar do', 'add kardo', 'chahiye', 'de do', 'dedo', 'lena hai', 'le lo', 'mangwa do', 'bhejo'],
  remove: ['hata do', 'hatao', 'nikalo', 'nikal do', 'remove karo', 'nahi chahiye', 'mat dalo'],
  cart: ['cart mein kya hai', 'cart me kya hai', 'cart dikhao', 'mera cart', 'cart batao', 'jhola'],
  total: ['total kitna', 'kitna hua', 'kitna ho gaya', 'kitne ka hua', 'bill kitna', 'total batao', 'kitna bana'],
  checkout: ['order kar do', 'order karo', 'order kardo', 'order place karo', 'checkout karo', 'mangwa lo', 'kharid lo'],
  more: ['ek aur', 'aur ek', 'ek aur daalo', 'ek extra'],
  setTo: ['kar do', 'kardo', 'karo', 'banao', 'kar de'],
  done: ['bas', 'bas itna hi', 'ho gaya', 'itna hi', 'aur kuch nahi', 'theek hai bas', 'band karo'],
  yes: ['haan', 'han', 'ha', 'haan ji', 'ji', 'theek hai', 'thik hai', 'kar do', 'chalega', 'sahi hai'],
  no: ['nahi', 'nahin', 'na', 'mat karo', 'rehne do', 'cancel karo'],
  cheapest: ['sabse sasta', 'sasta wala', 'saste wala', 'kam daam wala'],
  costliest: ['sabse mehenga', 'mehenga wala', 'best wala'],
  fillers: ['mujhe', 'mere liye', 'please', 'zara', 'thoda', 'kuch', 'cart mein', 'cart me', 'cart main', 'basket mein', 'wala', 'wali', 'wale', 'bhi', 'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'me', 'yeh', 'woh', 'vo', 'ye'],
  ordinals: { pehla: 1, pehle: 1, pehli: 1, pahla: 1, pahle: 1, doosra: 2, dusra: 2, doosre: 2, dusre: 2, doosri: 2, dusri: 2, teesra: 3, tisra: 3, teesre: 3, teesri: 3, chautha: 4, chauthe: 4, aakhri: -1, akhri: -1, last: -1 },
  numbers: { ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10, aadha: 0.5, adha: 0.5, dhai: 2.5, dedh: 1.5 },
  units: units({ kg: ['kilo', 'kg', 'kila'], g: ['gram', 'gm'], l: ['litre', 'liter', 'leetar'], pack: ['packet', 'pack', 'paket', 'dabba', 'bottle'], pc: ['piece', 'nag'], dozen: ['darjan', 'dozen'] }),
  under: ['ke andar', 'se kam', 'tak', 'ke neeche', 'ke niche', 'ke under'],
  and: ['aur', 'phir', 'fir'],
};

export const HI_WORDS: ShopWordPack = {
  lang: 'hi',
  find: ['दिखाओ', 'दिखा दो', 'दिखाइए', 'ढूंढो', 'ढूँढो', 'खोजो', 'बताओ', 'है क्या', 'मिलेगा क्या'],
  add: ['डाल दो', 'डालो', 'जोड़ दो', 'जोड़ो', 'चाहिए', 'दे दो', 'ले लो', 'मंगवा दो', 'ऐड करो'],
  remove: ['हटा दो', 'हटाओ', 'निकालो', 'निकाल दो', 'नहीं चाहिए'],
  cart: ['कार्ट में क्या है', 'कार्ट दिखाओ', 'मेरा कार्ट', 'थैला'],
  total: ['कुल कितना', 'कितना हुआ', 'कितना हो गया', 'बिल कितना', 'टोटल'],
  checkout: ['ऑर्डर कर दो', 'ऑर्डर करो', 'आर्डर कर दो', 'मंगवा लो', 'खरीद लो'],
  more: ['एक और', 'और एक'],
  setTo: ['कर दो', 'करो', 'कर दीजिए'],
  done: ['बस', 'बस इतना ही', 'हो गया', 'इतना ही', 'और कुछ नहीं'],
  yes: ['हाँ', 'हां', 'जी', 'ठीक है', 'जी हाँ', 'कर दो', 'चलेगा'],
  no: ['नहीं', 'ना', 'मत करो', 'रहने दो'],
  cheapest: ['सबसे सस्ता', 'सस्ता वाला', 'सस्ते वाला'],
  costliest: ['सबसे महंगा', 'महंगा वाला'],
  fillers: ['मुझे', 'मेरे लिए', 'कृपया', 'ज़रा', 'थोड़ा', 'कुछ', 'कार्ट में', 'वाला', 'वाली', 'वाले', 'भी', 'का', 'की', 'के', 'को', 'से', 'में', 'यह', 'वह'],
  ordinals: { पहला: 1, पहले: 1, पहली: 1, दूसरा: 2, दूसरे: 2, दूसरी: 2, तीसरा: 3, तीसरे: 3, तीसरी: 3, चौथा: 4, आखिरी: -1, आख़िरी: -1 },
  numbers: { एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10, आधा: 0.5, डेढ़: 1.5, ढाई: 2.5, दर्जन: 12 },
  units: units({ kg: ['किलो', 'केजी'], g: ['ग्राम'], l: ['लीटर'], pack: ['पैकेट', 'डिब्बा', 'बोतल'], pc: ['पीस', 'नग'], dozen: ['दर्जन'] }),
  under: ['के अंदर', 'से कम', 'तक', 'के नीचे'],
  and: ['और', 'फिर'],
};

/** English, Hinglish and Hindi, plus first drafts for Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam and Punjabi. */
export const BUILT_IN_WORD_PACKS: Partial<ShopWordPack>[] = [EN_WORDS, HINGLISH_WORDS, HI_WORDS, ...INDIC_WORD_PACKS];

/** All packs merged into one, so mixed speech ("do kilo onion daal do") still works. */
export function mergePacks(packs: Partial<ShopWordPack>[]): ShopWordPack {
  const out: ShopWordPack = { ...EN_WORDS, lang: 'any', ordinals: {}, numbers: {}, units: {} };
  const listKeys = ['find', 'add', 'remove', 'cart', 'total', 'checkout', 'more', 'setTo', 'done', 'yes', 'no', 'cheapest', 'costliest', 'fillers', 'under', 'and'] as const;
  for (const k of listKeys) out[k] = [];
  out.and = [];
  for (const p of packs) {
    for (const k of listKeys) out[k]!.push(...(p[k] ?? []).map((w) => w.toLowerCase()));
    Object.assign(out.ordinals, p.ordinals);
    Object.assign(out.numbers, p.numbers);
    Object.assign(out.units, p.units);
  }
  // Longest phrases first so "add one more" wins over "add".
  for (const k of listKeys) out[k] = [...new Set(out[k])].sort((a, b) => b.length - a.length);
  return out;
}
