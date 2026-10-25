// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { InMemoryStore, mount, type WispInstance } from '../src/index';
import { findCards, findSearchBox, readCartTotal } from '../src/shop/cards';

const CATALOG = [
  { name: 'Onion', unit: '1 kg', price: 39 },
  { name: 'Red Onion', unit: '500 g', price: 24 },
  { name: 'Tomato', unit: '1 kg', price: 41 },
];

/** A tiny store page with its own search box, cards with ADD buttons, and a cart total. */
function storePage() {
  document.body.innerHTML = `
    <header><form id="s" role="search"><input type="search" placeholder="Search products"></form>
    <button id="cart-btn">Cart · <span id="total">₹0</span></button></header>
    <main id="grid"></main>`;
  const added: string[] = [];
  let total = 0;
  const render = (q: string) => {
    const grid = document.getElementById('grid')!;
    grid.innerHTML = '';
    for (const p of CATALOG.filter((c) => c.name.toLowerCase().includes(q))) {
      const card = document.createElement('div');
      card.innerHTML = `<div>🧅</div><div class="n">${p.name}</div><div>${p.unit}</div><b>₹${p.price}</b><button>ADD</button>`;
      card.querySelector('button')!.addEventListener('click', () => {
        added.push(p.name);
        total += p.price;
        document.getElementById('total')!.textContent = `₹${total}`;
      });
      grid.append(card);
    }
  };
  document.getElementById('s')!.addEventListener('submit', (e) => {
    e.preventDefault();
    render((document.querySelector('#s input') as HTMLInputElement).value.toLowerCase());
  });
  render('');
  return { added };
}

let wisp: WispInstance | null = null;
afterEach(() => {
  wisp?.destroy();
  wisp = null;
});

describe('reading a shop page', () => {
  it('finds product cards, the search box and the cart total', () => {
    storePage();
    const cards = findCards(document);
    expect(cards.map((c) => c.product)).toEqual([
      { name: 'Onion', unit: '1 kg', price: 39, inStock: true },
      { name: 'Red Onion', unit: '500 g', price: 24, inStock: true },
      { name: 'Tomato', unit: '1 kg', price: 41, inStock: true },
    ]);
    expect(findSearchBox(document)?.placeholder).toBe('Search products');
    expect(readCartTotal(document)).toBe(0);
  });
});

describe('screen mode', () => {
  it('shops through the page with no integration: types the search, reads cards, taps Add', async () => {
    const page = storePage();
    wisp = mount({ welcome: false, shop: {} }, { store: new InMemoryStore() });
    await wisp.guide.ask('pyaaz dikhao');
    expect((document.querySelector('#s input') as HTMLInputElement).value).toBe('onion');
    expect(wisp.guide.getState().messages.at(-1)?.text).toMatch(/1: Onion 1 kg, ₹39\. 2: Red Onion 500 g, ₹24/);
    await wisp.guide.ask('doosra wala daal do');
    expect(page.added).toEqual(['Red Onion']);
    await wisp.guide.ask('2 kilo tamatar daal do');
    expect(page.added).toEqual(['Red Onion', 'Tomato', 'Tomato']);
    await wisp.guide.ask('total kitna hua');
    expect(wisp.guide.getState().messages.at(-1)?.text).toContain('₹106');
  }, 20000);
});
