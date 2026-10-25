// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { InMemoryStore, Lines, explainPage, findElements, mount, parsePageIntent, type WispInstance } from '../src/index';
import { PageReader } from '../src/page/reader';

const page = `
  <header><nav><a href="/">Home</a><a href="/cart" aria-label="Cart">🛒</a></nav></header>
  <main>
    <h1>Petal &amp; Thread</h1>
    <form role="search"><input type="search" placeholder="Search dresses"><button>Search</button></form>
    <h2>Shop</h2>
    <label>Sort by <select><option>Popular</option><option>Price: low to high</option></select></label>
    <ul><li>Red cotton dress, soft and light <button data-wisp-action="add-to-cart">Add to cart</button></li></ul>
    <h2>Delivery</h2>
    <p>We ship to every pin code in India. Delivery takes 3 to 5 days in metros.</p>
    <h2>Account</h2>
    <label for="pw">Password</label><input id="pw" type="password" value="hunter2">
    <input name="card_number" placeholder="Card" value="4111111111111111">
    <input data-wisp-label="Your city" value="Pune">
    <div class="admin"><button>Delete everything</button></div>
    <div data-wisp="off"><p>Secret staff note that should never be read by anyone.</p></div>
    <button hidden>Ghost</button>
  </main>`;

let wisp: WispInstance | null = null;
afterEach(() => {
  wisp?.destroy();
  wisp = null;
  document.body.innerHTML = '';
});

describe('PageReader', () => {
  const read = (opts = {}) => {
    document.body.innerHTML = page;
    document.title = 'Petal & Thread';
    return new PageReader(document, opts).read();
  };

  it('reads headings, buttons, links and form fields with their names', () => {
    const m = read();
    const names = m.elements.map((e) => `${e.role}:${e.name}`);
    expect(names).toEqual(expect.arrayContaining(['link:Cart', 'heading:Shop', 'searchbox:Search dresses', 'button:Search', 'combobox:Sort by', 'button:Add to cart', 'textbox:Your city']));
    expect(m.elements.find((e) => e.name === 'Add to cart')).toMatchObject({ section: 'Shop', action: 'add-to-cart' });
    expect(m.elements.find((e) => e.role === 'combobox')?.options).toEqual(['Popular', 'Price: low to high']);
  });

  it('marks passwords and card fields private and never reads their values', () => {
    const m = read();
    const pw = m.elements.find((e) => e.name === 'Password')!;
    const card = m.elements.find((e) => e.name === 'Card')!;
    expect(pw.sensitive && card.sensitive).toBe(true);
    expect(JSON.stringify(m)).not.toContain('hunter2');
    expect(JSON.stringify(m)).not.toContain('4111');
    expect(m.elements.find((e) => e.name === 'Your city')?.value).toBeUndefined();
  });

  it('skips hidden things and blocked areas', () => {
    const m = read({ blockedSelectors: ['.admin'] });
    const all = JSON.stringify(m);
    expect(all).not.toContain('Ghost');
    expect(all).not.toContain('Delete everything');
    expect(all).not.toContain('Secret staff note');
  });

  it('reads nothing on blocked paths', () => {
    const m = read({ blockedPaths: ['/'] });
    expect(m.blocked).toBe(true);
    expect(m.elements).toHaveLength(0);
  });

  it('keeps page text by section and re-reads after changes', async () => {
    document.body.innerHTML = page;
    const reader = new PageReader(document);
    expect(reader.read().passages.find((p) => p.section === 'Delivery')?.text).toContain('3 to 5 days');
    document.querySelector('main')!.insertAdjacentHTML('beforeend', '<h2>Offers</h2>');
    await new Promise((r) => setTimeout(r, 0));
    expect(reader.read().elements.some((e) => e.name === 'Offers')).toBe(true);
  });

  it('keeps the same ref for the same element', () => {
    document.body.innerHTML = page;
    const reader = new PageReader(document);
    const a = reader.read().elements.find((e) => e.name === 'Search')!.ref;
    document.body.append(document.createElement('p'));
    reader.setHost(document.body.lastElementChild!);
    expect(reader.read().elements.find((e) => e.name === 'Search')!.ref).toBe(a);
    expect(reader.element(a)?.textContent).toBe('Search');
  });
});

describe('understanding', () => {
  const model = () => {
    document.body.innerHTML = page;
    document.title = 'Petal & Thread';
    return new PageReader(document).read();
  };

  it('finds things by description', () => {
    expect(findElements(model(), 'search box')[0]?.name).toBe('Search dresses');
    expect(findElements(model(), 'cart')[0]?.name).toMatch(/cart/i);
    expect(findElements(model(), 'sort')[0]?.role).toBe('combobox');
    expect(findElements(model(), 'rocket launcher')).toHaveLength(0);
  });

  it('explains the page without AI', () => {
    const text = explainPage(model(), 'en', new Lines());
    expect(text).toContain('Petal & Thread');
    expect(text).toContain('Shop, Delivery, Account');
  });

  it('understands page questions in English and Hinglish', () => {
    expect(parsePageIntent("what's on this page?")).toEqual({ type: 'explain' });
    expect(parsePageIntent('yeh page kya hai')).toEqual({ type: 'explain' });
    expect(parsePageIntent('where is the sort menu?')).toEqual({ type: 'find', query: 'sort menu' });
    expect(parsePageIntent('cart kahan hai')).toEqual({ type: 'find', query: 'cart' });
    expect(parsePageIntent('how long is delivery')).toBeNull();
  });

  it('points at what the visitor asks for through chat', async () => {
    document.body.innerHTML = page;
    wisp = mount({ welcome: false }, { store: new InMemoryStore() });
    await wisp.guide.ask('where is the sort dropdown?');
    const s = wisp.guide.getState();
    expect(s.highlight).toMatch(/^ref:e\d+$/);
    expect(s.messages.at(-1)?.text).toContain('Sort by');
    await wisp.guide.ask('how long does delivery take in metros?');
    expect(wisp.guide.getState().messages.at(-1)?.text).toContain('3 to 5 days');
  });
});
