import type { Guide } from '../brain/guide';
import type { Button } from '../brain/config';
import type { Mood } from '../character/moods';
import type { CommandHandler } from '../brain/types';
import { terms } from '../chat/text';
import { parseShop, type ShopIntent } from './parse';
import type { Cart, Product, ShopAdapter, ShopConfig } from './types';
import { BUILT_IN_WORD_PACKS, mergePacks } from './words';

type Reply = { text: string; buttons?: Button[]; mood?: Mood };
type Pending = { kind: 'substitute'; product: Product; qty: number } | { kind: 'checkout' } | null;

/**
 * Voice and chat shopping: "give me onion", "put the first one in cart", "2 kilo tomato aur milk daal do",
 * "what's my total", "order kar do". Ordering always waits for a tap on Confirm.
 */
export class ShopAssistant implements CommandHandler {
  private words;
  private results: Product[] = [];
  private lastAdded: Product | null = null;
  private pending: Pending = null;
  /** While a list is being added, items collect here for one combined reply. */
  private batch: string[] | null = null;

  constructor(
    private g: Guide,
    private shop: ShopAdapter,
    private config: ShopConfig = {},
  ) {
    this.words = mergePacks([...BUILT_IN_WORD_PACKS, ...(config.words ?? [])]);
  }

  async handle(text: string): Promise<boolean> {
    const intents = parseShop(text, this.words);
    if (!intents.length) return false;
    const lines: string[] = [];
    let buttons: Button[] = [];
    let mood: Mood | undefined;
    this.batch = intents.filter((i) => i.kind === 'add').length > 1 ? [] : null;
    try {
      for (const intent of intents) {
        const out = await this.run(intent);
        if (out) {
          lines.push(out.text);
          if (out.buttons) buttons = out.buttons;
          mood = out.mood ?? mood;
        }
      }
      if (this.batch?.length) {
        const cart = await this.shop.cart();
        lines.push(this.g.line('shop.addedMany', { list: this.batch.join(', '), total: this.money(totalOf(cart)) }));
        mood = 'happy';
      }
    } catch {
      lines.push(this.g.line('shop.failed'));
    } finally {
      this.batch = null;
    }
    const said = lines.filter(Boolean);
    if (said.length) this.g.reply({ text: said.join(' '), buttons, matched: true, source: 'shop', mood });
    return true;
  }

  button(value: string): boolean {
    if (!value.startsWith('shop:')) return false;
    const [, what, arg] = value.split(':');
    if (what === 'pick') void this.say({ kind: 'pick', index: Number(arg) + 1 });
    else if (what === 'checkout') void this.placeOrder();
    else if (what === 'cancel') {
      this.pending = null;
      this.g.reply({ text: this.g.line('shop.cancelled'), buttons: [], matched: true, source: 'shop' });
    }
    return true;
  }

  private async say(intent: ShopIntent): Promise<void> {
    const out: Reply | null = await this.run(intent).catch(() => ({ text: this.g.line('shop.failed') }));
    if (out) this.g.reply({ text: out.text, buttons: out.buttons ?? [], matched: true, source: 'shop', mood: out.mood });
  }

  private async run(intent: ShopIntent): Promise<Reply | null> {
    const g = this.g;
    switch (intent.kind) {
      case 'find':
        return this.find(intent.query, intent.maxPrice, intent.sort);
      case 'add': {
        if (!intent.query) return this.pick(1, intent.qty);
        const found = sortBy(await this.search(intent.query, intent.maxPrice), intent.sort);
        if (!found.length) return this.notFound(intent.query);
        this.results = found;
        const fit = intent.unit ? packFor(found, intent.qty ?? 1, intent.unit) : null;
        const best = fit?.product ?? found.find((p) => p.inStock !== false) ?? found[0]!;
        return this.addProduct(best, Math.max(1, Math.round(fit?.packs ?? intent.qty ?? 1)));
      }
      case 'pick':
        return this.pick(intent.index, intent.qty);
      case 'setQty':
        return this.setQty(intent);
      case 'remove':
        return this.remove(intent.query);
      case 'cart':
        return this.describeCart();
      case 'total': {
        const cart = await this.shop.cart();
        if (!cart.lines.length) return { text: g.line('shop.cartEmpty') };
        return { text: g.line('shop.total', { total: this.money(totalOf(cart)), count: countOf(cart) }) };
      }
      case 'checkout':
        return this.checkout();
      case 'yes':
        return this.yes();
      case 'no':
        if (!this.pending) return null;
        this.pending = null;
        return { text: g.line('shop.cancelled') };
      case 'done':
        this.pending = null;
        return { text: g.line('shop.bye') };
    }
  }

  private async search(query: string, maxPrice?: number): Promise<Product[]> {
    const syn = this.config.synonyms ?? {};
    const q = query
      .split(/\s+/)
      .map((w) => syn[w] ?? syn[w.toLowerCase()] ?? w)
      .join(' ');
    const found = await this.shop.search(q, maxPrice !== undefined ? { maxPrice } : undefined);
    return maxPrice !== undefined ? found.filter((p) => p.price === undefined || p.price <= maxPrice) : found;
  }

  private async find(query: string, maxPrice?: number, sort?: 'cheapest' | 'costliest'): Promise<Reply> {
    const found = sortBy(await this.search(query, maxPrice), sort);
    if (!found.length) return this.notFound(query);
    this.results = found;
    const n = Math.min(this.config.readOut ?? 3, found.length);
    const list = found
      .slice(0, n)
      .map((p, i) => this.g.line('shop.option', { n: i + 1, name: p.name, unit: p.unit ? ` ${p.unit}` : '', price: this.money(p.price) }))
      .join('. ');
    const buttons = found.slice(0, n).map((p, i) => ({ label: `${i + 1}. ${p.name}${p.unit ? ` ${p.unit}` : ''}`, value: `shop:pick:${i}` }));
    return { text: this.g.line('shop.found', { count: found.length, list }), buttons, mood: 'excited' };
  }

  private async pick(index: number | 'cheapest' | 'costliest', qty?: number): Promise<Reply> {
    if (!this.results.length) return { text: this.g.line('shop.pickFirst') };
    let product: Product | undefined;
    if (index === 'cheapest' || index === 'costliest') {
      const priced = this.results.filter((p) => p.price !== undefined);
      product = priced.sort((a, b) => (index === 'cheapest' ? a.price! - b.price! : b.price! - a.price!))[0] ?? this.results[0];
    } else product = index === -1 ? this.results.at(-1) : this.results[index - 1];
    if (!product) return { text: this.g.line('shop.noSuchOption', { count: this.results.length }) };
    return this.addProduct(product, Math.max(1, Math.round(qty ?? 1)));
  }

  private async addProduct(product: Product, qty: number): Promise<Reply> {
    if (product.inStock === false) {
      const alt = this.results.find((p) => p.id !== product.id && p.inStock !== false);
      if (!alt) return { text: this.g.line('shop.notFound', { query: product.name }) };
      this.pending = { kind: 'substitute', product: alt, qty };
      return { text: this.g.line('shop.outOfStock', { name: product.name, alt: alt.name, price: this.money(alt.price) }) };
    }
    await this.shop.add(product.id, qty);
    this.lastAdded = product;
    this.g.track({ kind: 'event', name: 'shop:add' });
    if (this.batch) {
      this.batch.push(`${qty} × ${product.name}`);
      return { text: '' };
    }
    const cart = await this.shop.cart();
    return { text: this.g.line('shop.added', { qty, name: product.name, total: this.money(totalOf(cart)) }), mood: 'happy' };
  }

  private async setQty(intent: Extract<ShopIntent, { kind: 'setQty' }>): Promise<Reply> {
    const cart = await this.shop.cart();
    const line = intent.query ? this.cartMatch(cart, intent.query) : cart.lines.find((l) => l.id === this.lastAdded?.id) ?? cart.lines.at(-1);
    if (!line) return { text: this.g.line('shop.cartEmpty') };
    const qty = Math.max(1, Math.round(intent.qty ?? line.qty + (intent.delta ?? 1)));
    if (this.shop.setQty) await this.shop.setQty(line.id, qty);
    else await this.shop.add(line.id, qty - line.qty);
    const after = await this.shop.cart();
    return { text: this.g.line('shop.qty', { name: line.name, qty, total: this.money(totalOf(after)) }) };
  }

  private async remove(query: string): Promise<Reply> {
    const cart = await this.shop.cart();
    const line = query ? this.cartMatch(cart, query) : cart.lines.find((l) => l.id === this.lastAdded?.id);
    if (!line || !this.shop.remove) return { text: this.g.line('shop.notInCart', { query: query || '…' }) };
    await this.shop.remove(line.id);
    const after = await this.shop.cart();
    return { text: this.g.line('shop.removed', { name: line.name, total: this.money(totalOf(after)) }) };
  }

  private async describeCart(): Promise<Reply> {
    const cart = await this.shop.cart();
    if (!cart.lines.length) return { text: this.g.line('shop.cartEmpty') };
    const list = cart.lines.map((l) => `${l.qty} × ${l.name}`).join(', ');
    return { text: this.g.line('shop.cart', { list, total: this.money(totalOf(cart)) }) };
  }

  private async checkout(): Promise<Reply> {
    const cart = await this.shop.cart();
    if (!cart.lines.length) return { text: this.g.line('shop.cartEmpty') };
    if (!this.shop.checkout) return { text: this.g.line('shop.failed') };
    this.pending = { kind: 'checkout' };
    return {
      mood: 'worried',
      text: this.g.line('shop.confirm', { count: countOf(cart), total: this.money(totalOf(cart)) }),
      buttons: [
        { label: this.g.t('confirmOrder'), value: 'shop:checkout', primary: true },
        { label: this.g.t('cancel'), value: 'shop:cancel' },
      ],
    };
  }

  private async yes(): Promise<Reply | null> {
    const p = this.pending;
    if (!p) return null;
    if (p.kind === 'checkout') return { text: this.g.line('shop.tapToConfirm') };
    this.pending = null;
    return this.addProduct(p.product, p.qty);
  }

  /** Only a tap on the Confirm button reaches here; voice "yes" never places an order. */
  private async placeOrder() {
    if (this.pending?.kind !== 'checkout' || !this.shop.checkout) return;
    this.pending = null;
    try {
      await this.shop.checkout();
      this.g.track({ kind: 'conversion', name: 'voice-order' });
      this.g.reply({ text: this.g.line('shop.ordered'), buttons: [], matched: true, source: 'shop', mood: 'celebrate' });
    } catch {
      this.g.reply({ text: this.g.line('shop.failed'), buttons: [], matched: false, source: 'shop' });
    }
  }

  private notFound(query: string): Reply {
    this.g.track({ kind: 'event', name: `shop:not-found:${query.slice(0, 40)}` });
    return { text: this.g.line('shop.notFound', { query }), mood: 'confused' };
  }

  private cartMatch(cart: Cart, query: string) {
    const syn = this.config.synonyms ?? {};
    const want = terms(query.split(/\s+/).map((w) => syn[w] ?? w).join(' '));
    let best: Cart['lines'][number] | undefined;
    let bestScore = 0;
    for (const l of cart.lines) {
      const have = terms(l.name);
      const score = want.filter((w) => have.some((h) => h === w || h.startsWith(w) || w.startsWith(h))).length;
      if (score > bestScore) [best, bestScore] = [l, score];
    }
    return best;
  }

  private money(v: number | undefined): string {
    return v === undefined ? '' : `${this.config.currency ?? '₹'}${Number.isInteger(v) ? v : v.toFixed(2)}`;
  }
}

function totalOf(cart: Cart): number {
  return cart.total ?? cart.lines.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0);
}

function countOf(cart: Cart): number {
  return cart.lines.reduce((s, l) => s + l.qty, 0);
}

function sortBy(list: Product[], sort?: 'cheapest' | 'costliest'): Product[] {
  if (!sort) return list;
  const priced = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  return sort === 'cheapest' ? priced : priced.reverse();
}

const BASE: Record<string, [string, number]> = { kg: ['g', 1000], g: ['g', 1], l: ['ml', 1000], ml: ['ml', 1], pc: ['pc', 1], dozen: ['pc', 12], pack: ['pack', 1] };

function amount(qty: number, unit: string): [string, number] | null {
  const b = BASE[unit.toLowerCase()];
  return b ? [b[0], qty * b[1]] : null;
}

/**
 * "2 kilo tomato" → two 1 kg packs (or four 500 g packs if that's all there is).
 * Picks the biggest in-stock pack that divides the amount evenly.
 */
function packFor(found: Product[], qty: number, unit: string): { product: Product; packs: number } | null {
  const want = amount(qty, unit);
  if (!want) return null;
  let best: { product: Product; packs: number; size: number } | null = null;
  for (const p of found) {
    if (p.inStock === false || !p.unit) continue;
    const m = p.unit.toLowerCase().replace(/\s+/g, '').match(/^([\d.]+)([a-z]+)$/);
    const have = m ? amount(Number(m[1]), m[2]!) : null;
    if (!have || have[0] !== want[0]) continue;
    const packs = want[1] / have[1];
    if (Math.abs(packs - Math.round(packs)) > 1e-6 || packs < 1) continue;
    if (!best || have[1] > best.size) best = { product: p, packs: Math.round(packs), size: have[1] };
  }
  return best;
}
