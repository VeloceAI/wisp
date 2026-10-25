import { describe, expect, it } from 'vitest';
import { FaqChat, Lines, detectLang, langFromLocale, uiText } from '../src/index';

const faq = [
  {
    id: 'returns',
    q: ['How do I return an item?', { hi: 'सामान वापस कैसे करें?' }],
    a: { en: 'You can return any item within 7 days from My Orders.', hi: 'आप 7 दिन के अंदर My Orders से सामान वापस कर सकते हैं।', hinglish: '7 din ke andar My Orders se return kar sakte ho.' },
    link: { href: '/returns' },
  },
  { id: 'shipping', q: 'How long does delivery take?', a: 'Delivery takes 3 to 5 days.' },
  { id: 'pay', q: 'Which payment methods do you accept?', a: 'UPI, cards and cash on delivery.' },
];
const content = [{ title: 'About us', url: '/about', text: 'We are a small team in Pune. We started in 2021 to sell handmade dresses.' }];

const chat = () => new FaqChat(faq, content, new Lines({}, () => 0));

describe('language', () => {
  it('detects Hindi, Hinglish, English and other scripts', () => {
    expect(detectLang('सामान वापस कैसे करें')).toBe('hi');
    expect(detectLang('mujhe return kaise karna hai')).toBe('hinglish');
    expect(detectLang('how do I return this')).toBe('en');
    expect(detectLang('இதை எப்படி திருப்பி அனுப்புவது')).toBe('ta');
    expect(detectLang('como devuelvo esto', 'es')).toBe('es');
  });

  it('reads locales', () => {
    expect(langFromLocale('hi-IN')).toBe('hi');
    expect(langFromLocale('pt-BR')).toBe('pt');
    expect(langFromLocale(undefined)).toBe('en');
  });

  it('lets owners add UI text in any language', () => {
    expect(uiText('next', 'ta', { next: { ta: 'அடுத்து' } })).toBe('அடுத்து');
    expect(uiText('next', 'fr')).toBe('Next');
    expect(uiText('next', 'hi')).toBe('आगे');
  });
});

describe('FaqChat', () => {
  it('answers English questions', async () => {
    const a = await chat().answer('how can I return my dress?', 'en');
    expect(a.matched).toBe(true);
    expect(a.text).toContain('7 days');
    expect(a.buttons[0]?.value).toBe('link:/returns');
  });

  it('answers Hinglish with the Hinglish answer', async () => {
    const a = await chat().answer('return kaise karna hai', 'hinglish');
    expect(a.matched).toBe(true);
    expect(a.text).toContain('7 din');
  });

  it('answers Hindi', async () => {
    const a = await chat().answer('सामान वापस कैसे करूँ', 'hi');
    expect(a.matched).toBe(true);
    expect(a.text).toContain('7 दिन');
  });

  it('maps synonyms like cost → price and delivery', async () => {
    const a = await chat().answer('kitne din mein delivery hogi', 'hinglish');
    expect(a.source).toBe('faq:shipping');
  });

  it('answers from content with a snippet', async () => {
    const a = await chat().answer('when did you start', 'en');
    expect(a.source).toBe('doc:0');
    expect(a.text).toContain('2021');
  });

  it('offers tap-to-answer buttons when unsure', async () => {
    const a = await chat().answer('do you sell rockets to mars', 'en');
    expect(a.matched).toBe(false);
    expect(a.buttons.map((b) => b.value)).toEqual(['faq:returns', 'faq:shipping', 'faq:pay']);
  });
});
