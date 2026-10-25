import { mount, type Product, type ShopAdapter } from '@veloceai/wisp-web';

interface Item extends Product {
  emoji: string;
  tags: string;
}

const CATALOG: Item[] = [
  { id: 'onion-1kg', name: 'Onion', unit: '1 kg', price: 39, emoji: '🧅', tags: 'onion pyaz' },
  { id: 'onion-red-500', name: 'Red Onion', unit: '500 g', price: 24, emoji: '🧅', tags: 'onion red' },
  { id: 'onion-organic', name: 'Organic Onion', unit: '1 kg', price: 62, emoji: '🧅', tags: 'onion organic', inStock: false },
  { id: 'tomato-500', name: 'Tomato', unit: '500 g', price: 22, emoji: '🍅', tags: 'tomato' },
  { id: 'tomato-1kg', name: 'Tomato', unit: '1 kg', price: 41, emoji: '🍅', tags: 'tomato' },
  { id: 'potato-1kg', name: 'Potato', unit: '1 kg', price: 34, emoji: '🥔', tags: 'potato' },
  { id: 'milk-taaza', name: 'Amul Taaza Milk', unit: '1 L', price: 56, emoji: '🥛', tags: 'milk amul' },
  { id: 'milk-gold', name: 'Amul Gold Milk', unit: '500 ml', price: 34, emoji: '🥛', tags: 'milk amul gold' },
  { id: 'bread', name: 'Whole Wheat Bread', unit: '400 g', price: 45, emoji: '🍞', tags: 'bread' },
  { id: 'eggs-6', name: 'Farm Eggs', unit: '6 pc', price: 54, emoji: '🥚', tags: 'egg eggs anda' },
  { id: 'banana', name: 'Banana Robusta', unit: '6 pc', price: 42, emoji: '🍌', tags: 'banana kela' },
  { id: 'chips-classic', name: 'Classic Salted Chips', unit: '52 g', price: 20, emoji: '🥔', tags: 'chips' },
  { id: 'chips-masala', name: 'Masala Chips', unit: '90 g', price: 35, emoji: '🌶️', tags: 'chips masala' },
  { id: 'chips-party', name: 'Party Pack Chips', unit: '200 g', price: 99, emoji: '🎉', tags: 'chips party' },
  { id: 'paneer', name: 'Fresh Paneer', unit: '200 g', price: 90, emoji: '🧀', tags: 'paneer' },
  { id: 'atta', name: 'Whole Wheat Atta', unit: '5 kg', price: 245, emoji: '🌾', tags: 'atta flour' },
  { id: 'rice', name: 'Basmati Rice', unit: '1 kg', price: 129, emoji: '🍚', tags: 'rice chawal' },
  { id: 'maggi', name: 'Instant Noodles', unit: '4 pack', price: 56, emoji: '🍜', tags: 'noodles maggi' },
];

const cart = new Map<string, number>();
const grid = document.getElementById('grid')!;
const title = document.getElementById('results-title')!;
const money = (n: number) => `₹${n}`;
const byId = (id: string) => CATALOG.find((c) => c.id === id)!;

function renderGrid(items: Item[], heading = 'Popular') {
  title.textContent = heading;
  grid.replaceChildren(
    ...items.map((p) => {
      const card = document.createElement('article');
      card.className = p.inStock === false ? 'card oos' : 'card';
      card.innerHTML = `<div class="emoji"></div><div class="name"></div><div class="unit"></div><div class="row"><b></b><button type="button">ADD</button></div>`;
      card.querySelector('.emoji')!.textContent = p.emoji;
      card.querySelector('.name')!.textContent = p.name;
      card.querySelector('.unit')!.textContent = p.inStock === false ? `${p.unit} · out of stock` : p.unit!;
      card.querySelector('b')!.textContent = money(p.price!);
      const add = card.querySelector('button')!;
      add.disabled = p.inStock === false;
      add.addEventListener('click', () => shop.add(p.id, 1));
      return card;
    }),
  );
}

function renderCart() {
  const lines = document.getElementById('cart-lines')!;
  lines.replaceChildren(
    ...[...cart].map(([id, qty]) => {
      const p = byId(id);
      const li = document.createElement('li');
      li.textContent = `${qty} × ${p.name} (${p.unit})`;
      const price = document.createElement('b');
      price.textContent = money(p.price! * qty);
      li.append(price);
      return li;
    }),
  );
  const total = [...cart].reduce((s, [id, qty]) => s + byId(id).price! * qty, 0);
  document.getElementById('cart-total')!.textContent = money(total);
  document.getElementById('cart-sum')!.textContent = money(total);
  (document.getElementById('checkout') as HTMLButtonElement).disabled = cart.size === 0;
}

const shop: ShopAdapter = {
  async search(query, opts) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/(es|s)$/, ''));
    const hits = CATALOG.filter((p) => words.every((w) => `${p.name} ${p.tags}`.toLowerCase().includes(w)) && (opts?.maxPrice === undefined || p.price! <= opts.maxPrice));
    renderGrid(hits, `Results for “${query}”`);
    return hits;
  },
  async add(id, qty) {
    cart.set(id, (cart.get(id) ?? 0) + qty);
    renderCart();
  },
  async setQty(id, qty) {
    cart.set(id, qty);
    renderCart();
  },
  async remove(id) {
    cart.delete(id);
    renderCart();
  },
  async cart() {
    return { lines: [...cart].map(([id, qty]) => ({ id, qty, name: byId(id).name, price: byId(id).price, unit: byId(id).unit })) };
  },
  async checkout() {
    cart.clear();
    renderCart();
    renderGrid(CATALOG);
    title.textContent = 'Order placed! Arriving in 10 minutes 🛵';
  },
};

document.getElementById('checkout')!.addEventListener('click', () => shop.checkout!());
document.getElementById('cart-btn')!.addEventListener('click', () => document.getElementById('cart')!.scrollIntoView({ behavior: 'smooth' }));
// The store's own search box. In screen mode Wisp types here, like a person would.
document.getElementById('site-search')!.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = String(new FormData(e.target as HTMLFormElement).get('q') ?? '').trim();
  void shop.search(q);
});
// ?mode=screen leaves the store unconnected, so Wisp works only through the page.
const screenMode = new URLSearchParams(location.search).get('mode') === 'screen';
document.getElementById('mode-note')!.textContent = screenMode
  ? 'Screen mode: Wisp is using the page’s own search box and buttons.'
  : 'Connected mode (try ?mode=screen to see Wisp work without any integration).';
renderGrid(CATALOG);
renderCart();

const wisp = mount(
  {
    siteId: 'grocery-demo',
    siteName: 'QuickBasket',
    character: 'sprout',
    welcome: true,
    // The demo's own Wisp server: free open-source speech to text, so the mic works in every browser.
    ai: { endpoint: '/wisp' },
    voice: { mode: 'browser', talk: true },
    pages: [
      { name: ['Fashion shop', 'dresses', 'Petal and Thread', { hinglish: 'kapde wala page' }], url: '/' },
      { name: ['All moods', 'moods'], url: '/moods.html' },
    ],
    shop: {
      currency: '₹',
      synonyms: {
        pyaaz: 'onion', pyaz: 'onion', kanda: 'onion', vengayam: 'onion', प्याज़: 'onion', प्याज: 'onion',
        tamatar: 'tomato', टमाटर: 'tomato', aloo: 'potato', आलू: 'potato',
        doodh: 'milk', दूध: 'milk', anda: 'egg', ande: 'egg', अंडे: 'egg', kela: 'banana', केला: 'banana',
        chawal: 'rice', चावल: 'rice', double: 'bread', roti: 'bread',
      },
    },
    lines: {
      'welcome.hello': {
        en: 'Hi, I’m Sprout! Tap me and then 🎤 to shop by voice.',
        hi: 'नमस्ते, मैं स्प्राउट हूँ! मुझे टैप करें, फिर 🎤 दबाकर बोलकर खरीदें।',
        hinglish: 'Hi, main Sprout hoon! Mujhe tap karo, phir 🎤 dabake bolkar shopping karo.',
      },
    },
  },
  screenMode ? {} : { shop },
);
(window as unknown as { wisp: typeof wisp }).wisp = wisp;
