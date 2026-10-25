// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Guide, InMemoryStore, ShopAssistant, type Product, type ShopAdapter } from '../src/index';
import { TalkLoop, type Talker } from '../src/talk';

const CATALOG: Product[] = [
  { id: 'on1', name: 'Onion', unit: '1 kg', price: 40 },
  { id: 'on2', name: 'Red Onion', unit: '500 g', price: 25 },
];

function shop() {
  const cart = new Map<string, number>();
  const s: ShopAdapter = {
    search: async (q) => CATALOG.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())),
    add: async (id, qty) => void cart.set(id, (cart.get(id) ?? 0) + qty),
    cart: async () => ({ lines: [...cart].map(([id, qty]) => ({ id, qty, name: CATALOG.find((c) => c.id === id)!.name, price: CATALOG.find((c) => c.id === id)!.price })) }),
  };
  return { s, cart };
}

/** Plays back a script of what the visitor "says", and records what the guide speaks. */
function scriptedVoice(lines: string[], guide: Guide) {
  const spoken: string[] = [];
  guide.onCue((c) => c.type === 'speak' && spoken.push(c.text));
  const talker: Talker = {
    listen: async () => lines.shift() ?? '',
    stopListening: () => {},
    idle: async () => {},
    stop: () => {},
  };
  return { talker, spoken };
}

describe('talk mode', () => {
  it('holds a spoken shopping conversation until the visitor says done', async () => {
    const g = new Guide({ welcome: false }, { store: new InMemoryStore(), random: () => 0 });
    const { s, cart } = shop();
    g.use(new ShopAssistant(g, s));
    const { talker, spoken } = scriptedVoice(['give me onion', 'put first one in cart', 'bas'], g);
    const loop = new TalkLoop(g, talker);
    await loop.start();
    expect(cart.get('on1')).toBe(1);
    expect(spoken[0]).toContain('I found 2');
    expect(spoken[1]).toContain('Added 1 × Onion');
    expect(loop.active).toBe(false);
    expect(g.getState().voice).toBe(true);
  });

  it('stops after two silences', async () => {
    const g = new Guide({ welcome: false }, { store: new InMemoryStore() });
    const { talker } = scriptedVoice([], g);
    const loop = new TalkLoop(g, talker);
    await loop.start();
    expect(loop.active).toBe(false);
    expect(g.getState().messages).toHaveLength(0);
  });
});
