import { mount } from '@veloceai/wisp-web';
import { demoConfig } from './wisp-config';

const products = [
  { name: 'Red cotton dress', price: 1499, color: '#e63946' },
  { name: 'Indigo kurta', price: 1199, color: '#3d5a80' },
  { name: 'Mustard summer dress', price: 2299, color: '#e9c46a' },
  { name: 'Red block-print maxi', price: 1899, color: '#c1121f' },
  { name: 'Mint linen top', price: 899, color: '#90e0c4' },
  { name: 'Rose wrap dress', price: 2599, color: '#f4a3b5' },
];

const grid = document.getElementById('products')!;
const search = document.getElementById('search') as HTMLFormElement;
const sort = document.getElementById('sort') as HTMLSelectElement;
const cartCount = document.getElementById('cart-count')!;
let query = '';
let max = Infinity;
let cart = 0;

function renderProducts() {
  let list = products.filter((p) => p.name.toLowerCase().includes(query) && p.price <= max);
  if (sort.value === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  if (sort.value === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  grid.replaceChildren(
    ...(list.length
      ? list.map((p) => {
          const card = document.createElement('article');
          card.className = 'card';
          card.innerHTML = `<div class="swatch" style="background:${p.color}"></div><h3></h3><div class="price">₹${p.price.toLocaleString('en-IN')}</div><button type="button">Add to cart</button>`;
          card.querySelector('h3')!.textContent = p.name;
          card.querySelector('button')!.addEventListener('click', () => {
            cartCount.textContent = String(++cart);
            window.dispatchEvent(new CustomEvent('wisp:cart-add', { detail: { message: p.name } }));
          });
          return card;
        })
      : [Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Nothing matches. Try another search.' })]),
  );
}

search.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(search);
  query = String(data.get('q') ?? '').trim().toLowerCase();
  const m = Number(data.get('max'));
  max = m > 0 ? m : Infinity;
  renderProducts();
});
sort.addEventListener('change', renderProducts);
renderProducts();

document.getElementById('signup')!.addEventListener('submit', (e) => {
  e.preventDefault();
  window.dispatchEvent(new CustomEvent('wisp:success', { detail: { line: 'Welcome aboard! Your account is ready.' } }));
});

const wisp = mount(demoConfig, { onTrack: (ev) => console.debug('[wisp track]', ev) });
(window as unknown as { wisp: typeof wisp }).wisp = wisp;

const fire = (name: string, detail?: object) => window.dispatchEvent(new CustomEvent(`wisp:${name}`, { detail }));
document.querySelectorAll<HTMLButtonElement>('[data-fire]').forEach((b) =>
  b.addEventListener('click', () => {
    const what = b.dataset.fire!;
    if (what === 'tour') return wisp.startTour();
    if (what === 'reset') {
      localStorage.removeItem('wisp:petal-demo');
      return location.reload();
    }
    if (what === 'error') return fire('error', { code: 'card_declined', message: 'Payment failed: card_declined' });
    if (what === 'success') return fire('success', { line: 'Order placed! It reaches you in 3 to 5 days.' });
    fire(what);
  }),
);
