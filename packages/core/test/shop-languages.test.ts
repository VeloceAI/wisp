import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_WORD_PACKS, Guide, InMemoryStore, ShopAssistant, mergePacks, parseShop, toCatalogQuery, type ShopAdapter } from '../src/index';

const w = mergePacks(BUILT_IN_WORD_PACKS);

describe('search language', () => {
  it('turns local product names into catalogue words', () => {
    expect(toCatalogQuery('pyaaz')).toBe('onion');
    expect(toCatalogQuery('प्याज़')).toBe('onion');
    expect(toCatalogQuery('வெங்காயம்')).toBe('onion');
    expect(toCatalogQuery('hari mirch')).toBe('green chilli');
    expect(toCatalogQuery('amul doodh')).toBe('amul milk');
    expect(toCatalogQuery('kanda', { kanda: 'red onion' })).toBe('red onion');
    expect(toCatalogQuery('lays chips')).toBe('lays chips');
  });
});

describe('more languages', () => {
  it.each([
    ['ta', 'வெங்காயம் காட்டு', { kind: 'find', query: 'வெங்காயம்' }],
    ['te', 'ఉల్లిపాయ చూపించు', { kind: 'find', query: 'ఉల్లిపాయ' }],
    ['bn', 'পেঁয়াজ দেখাও', { kind: 'find', query: 'পেঁয়াজ' }],
    ['mr', 'कांदा दाखवा', { kind: 'find', query: 'कांदा' }],
    ['gu', 'ડુંગળી બતાવો', { kind: 'find', query: 'ડુંગળી' }],
    ['kn', 'ಈರುಳ್ಳಿ ತೋರಿಸಿ', { kind: 'find', query: 'ಈರುಳ್ಳಿ' }],
    ['ml', 'ഉള്ളി കാണിക്കൂ', { kind: 'find', query: 'ഉള്ളി' }],
    ['pa', 'ਪਿਆਜ਼ ਦਿਖਾਓ', { kind: 'find', query: 'ਪਿਆਜ਼' }],
  ])('%s: find', (_lang, text, intent) => {
    expect(parseShop(text, w)).toEqual([intent]);
  });

  it('understands picks, amounts and totals in other languages', () => {
    expect(parseShop('முதல் சேர்', w)).toEqual([{ kind: 'pick', index: 1, qty: undefined }]);
    expect(parseShop('రెండు కిలో టమాటా వేయండి', w)).toEqual([{ kind: 'add', query: 'టమాటా', qty: 2, unit: 'kg', maxPrice: undefined }]);
    expect(parseShop('মোট কত', w)).toEqual([{ kind: 'total' }]);
    expect(parseShop('kitna ho gaya', w)).toEqual([{ kind: 'total' }]);
  });
});

describe('translation fallback', () => {
  const shop = (names: string[]): ShopAdapter => ({
    search: async (q) => names.filter((n) => n.toLowerCase().includes(q.toLowerCase())).map((n, i) => ({ id: `p${i}`, name: n, price: 10 })),
    add: async () => {},
    cart: async () => ({ lines: [] }),
  });

  it('asks the translator only when a search finds nothing, and once per word', async () => {
    const g = new Guide({ welcome: false }, { store: new InMemoryStore(), random: () => 0 });
    const translate = vi.fn(async () => 'coriander');
    g.use(new ShopAssistant(g, shop(['Coriander Leaves']), {}, translate));
    await g.ask('kothamalli dikhao');
    await g.ask('kothamalli dikhao');
    expect(g.getState().messages.at(-1)?.text).toContain('Coriander Leaves');
    expect(translate).toHaveBeenCalledTimes(0);
    await g.ask('korianderish dikhao');
    await g.ask('korianderish dikhao');
    expect(translate).toHaveBeenCalledTimes(1);
  });

  it('opens the cart instead of ordering when the store only lets it do that', async () => {
    const g = new Guide({ welcome: false }, { store: new InMemoryStore(), random: () => 0 });
    const openCart = vi.fn(async () => {});
    g.use(new ShopAssistant(g, { ...shop([]), cart: async () => ({ lines: [{ id: 'a', name: 'Milk', qty: 1, price: 50 }] }), openCart }));
    await g.ask('order kar do');
    expect(openCart).toHaveBeenCalled();
    expect(g.getState().messages.at(-1)?.text).toContain('Place order');
  });
});
