import { beforeEach, describe, expect, it } from 'vitest';
import { BUILT_IN_WORD_PACKS, Guide, InMemoryStore, ShopAssistant, mergePacks, parseShop, type Product, type ShopAdapter } from '../src/index';

const w = mergePacks(BUILT_IN_WORD_PACKS);
const p = (text: string) => parseShop(text, w);

describe('parseShop', () => {
  it('reads the Blinkit-style example', () => {
    expect(p('give me onion')).toEqual([{ kind: 'find', query: 'onion' }]);
    expect(p('put first one in cart')).toEqual([{ kind: 'pick', index: 1, qty: 1 }]);
    expect(p('add the second one')).toEqual([{ kind: 'pick', index: 2, qty: 1 }]);
  });

  it('understands Hinglish and Hindi', () => {
    expect(p('pyaaz dikhao')).toEqual([{ kind: 'find', query: 'pyaaz' }]);
    expect(p('pehla wala daal do')).toEqual([{ kind: 'pick', index: 1, qty: undefined }]);
    expect(p('2 kilo tamatar daal do')).toEqual([{ kind: 'add', query: 'tamatar', qty: 2, unit: 'kg', maxPrice: undefined }]);
    expect(p('दो किलो प्याज़ डाल दो')).toEqual([{ kind: 'add', query: 'प्याज़', qty: 2, unit: 'kg', maxPrice: undefined }]);
    expect(p('sabse sasta wala daalo')).toEqual([{ kind: 'pick', index: 'cheapest', qty: undefined }]);
    expect(p('total kitna hua')).toEqual([{ kind: 'total' }]);
    expect(p('order kar do')).toEqual([{ kind: 'checkout' }]);
    expect(p('bas')).toEqual([{ kind: 'done' }]);
    expect(p('haan')).toEqual([{ kind: 'yes' }]);
  });

  it('splits shopping lists and shares the verb', () => {
    expect(p('onion, tomato aur 2 litre milk daal do')).toEqual([
      { kind: 'add', query: 'onion', qty: undefined, unit: undefined },
      { kind: 'add', query: 'tomato', qty: undefined, unit: undefined },
      { kind: 'add', query: 'milk', qty: 2, unit: 'l', maxPrice: undefined },
    ]);
  });

  it('treats an amount with no verb as an order', () => {
    expect(p('2 kilo tomato and milk please')).toEqual([
      { kind: 'add', query: 'tomato', qty: 2, unit: 'kg' },
      { kind: 'add', query: 'milk', qty: undefined, unit: undefined },
    ]);
  });

  it('reads quantities, changes and removals', () => {
    expect(p('make it 4')).toEqual([{ kind: 'setQty', qty: 4 }]);
    expect(p('one more')).toEqual([{ kind: 'setQty', delta: 1, query: undefined }]);
    expect(p('ek aur')).toEqual([{ kind: 'setQty', delta: 1, query: undefined }]);
    expect(p('remove tomato')).toEqual([{ kind: 'remove', query: 'tomato' }]);
    expect(p('tamatar hata do')).toEqual([{ kind: 'remove', query: 'tamatar' }]);
    expect(p("what's in my cart?")).toEqual([{ kind: 'cart' }]);
  });

  it('tells a sorted search from a pick', () => {
    expect(p('sabse sasta chips dikhao')).toEqual([{ kind: 'find', query: 'chips', sort: 'cheapest' }]);
    expect(p('show me the cheapest milk')).toEqual([{ kind: 'find', query: 'milk', sort: 'cheapest' }]);
    expect(p('sabse sasta wala daalo')).toEqual([{ kind: 'pick', index: 'cheapest', qty: undefined }]);
  });

  it('reads price limits', () => {
    expect(p('show milk under 60 rupees')).toEqual([{ kind: 'find', query: 'milk', maxPrice: 60 }]);
    expect(p('chocolate 100 se kam dikhao')).toEqual([{ kind: 'find', query: 'chocolate', maxPrice: 100 }]);
  });

  it('leaves normal questions alone', () => {
    expect(p('how long does delivery take')).toEqual([]);
    expect(p('what is your return policy')).toEqual([]);
  });

  it('accepts a word pack for any other language', () => {
    const ta = mergePacks([...BUILT_IN_WORD_PACKS, { lang: 'ta', find: ['காட்டு'], add: ['சேர்'], ordinals: { முதல்: 1 } }]);
    expect(parseShop('வெங்காயம் காட்டு', ta)).toEqual([{ kind: 'find', query: 'வெங்காயம்' }]);
    expect(parseShop('முதல் சேர்', ta)).toEqual([{ kind: 'pick', index: 1, qty: undefined }]);
  });
});

const CATALOG: Product[] = [
  { id: 'on1', name: 'Onion', unit: '1 kg', price: 40 },
  { id: 'on2', name: 'Red Onion', unit: '500 g', price: 25 },
  { id: 'on3', name: 'Organic Onion', unit: '1 kg', price: 60, inStock: false },
  { id: 'mk1', name: 'Amul Taaza Milk', unit: '1 l', price: 56 },
  { id: 'tm1', name: 'Tomato', unit: '500 g', price: 20 },
];

function fakeShop() {
  const cart = new Map<string, number>();
  let ordered = false;
  const shop: ShopAdapter = {
    search: async (q) => CATALOG.filter((c) => q.split(' ').every((w) => c.name.toLowerCase().includes(w.toLowerCase().replace(/s$/, '')))),
    add: async (id, qty) => void cart.set(id, (cart.get(id) ?? 0) + qty),
    setQty: async (id, qty) => void cart.set(id, qty),
    remove: async (id) => void cart.delete(id),
    cart: async () => ({ lines: [...cart].map(([id, qty]) => { const c = CATALOG.find((x) => x.id === id)!; return { id, qty, name: c.name, price: c.price }; }) }),
    checkout: async () => void (ordered = true),
  };
  return { shop, cart, ordered: () => ordered };
}

describe('ShopAssistant', () => {
  let g: Guide;
  let f: ReturnType<typeof fakeShop>;
  const last = () => g.getState().messages.at(-1)!;

  beforeEach(() => {
    g = new Guide({ welcome: false }, { store: new InMemoryStore(), random: () => 0 });
    f = fakeShop();
    g.use(new ShopAssistant(g, f.shop, { synonyms: { pyaaz: 'onion', tamatar: 'tomato', doodh: 'milk' } }));
  });

  it('finds, reads options out, and adds the one picked', async () => {
    await g.ask('give me onion');
    expect(last().text).toContain('I found 3');
    expect(last().text).toContain('1: Onion 1 kg, ₹40');
    expect(last().buttons?.map((b) => b.value)).toEqual(['shop:pick:0', 'shop:pick:1', 'shop:pick:2']);
    await g.ask('put first one in cart');
    expect(f.cart.get('on1')).toBe(1);
    expect(last().text).toContain('Added 1 × Onion. Cart total ₹40');
  });

  it('works in Hinglish with local product names and quantities', async () => {
    await g.ask('2 kilo pyaaz daal do');
    expect(f.cart.get('on1')).toBe(2);
    await g.ask('ek aur');
    expect(f.cart.get('on1')).toBe(3);
    await g.ask('doodh aur tamatar daal do');
    expect([f.cart.get('mk1'), f.cart.get('tm1')]).toEqual([1, 1]);
    expect(last().text).toBe('1 × Amul Taaza Milk, 1 × Tomato daal diya. Total ₹196. Aur kuch?');
    await g.ask('tamatar hata do');
    expect(f.cart.has('tm1')).toBe(false);
    await g.ask('total kitna hua');
    expect(last().text).toContain('₹176');
  });

  it('turns an amount into the right pack size', async () => {
    await g.ask('2 kilo onion daal do');
    expect(f.cart.get('on1')).toBe(2);
    await g.ask('1 kg tomato add karo');
    expect(f.cart.get('tm1')).toBe(2);
  });

  it('offers a substitute when the pick is out of stock', async () => {
    await g.ask('show onion');
    await g.ask('third one');
    expect(last().text).toContain('Organic Onion is out of stock');
    await g.ask('yes');
    expect(f.cart.get('on1')).toBe(1);
  });

  it('never places an order on voice alone', async () => {
    await g.ask('add milk');
    await g.ask('place order');
    expect(last().buttons?.[0]?.value).toBe('shop:checkout');
    await g.ask('yes');
    expect(f.ordered()).toBe(false);
    expect(last().text).toContain('tap');
    g.dispatch({ type: 'button', value: 'shop:checkout' });
    await new Promise((r) => setTimeout(r, 0));
    expect(f.ordered()).toBe(true);
    expect(g.getState().mood).toBe('celebrate');
  });

  it('says so when nothing matches, and leaves other questions to the FAQ', async () => {
    await g.ask('give me rocket fuel');
    expect(last().text).toContain('couldn’t find');
    await g.ask('how long is delivery');
    expect(last().text).not.toContain('found');
  });
});
