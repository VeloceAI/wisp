import type { Cart, CartLine, Product, ShopAdapter } from '@veloceai/wisp-core';
import { submit, typeInto } from '../actions/driver';
import { findCards, findCartButton, findSearchBox, readCard, readCartTotal, type Card } from './cards';

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves once the page has stopped changing for `quietMs`, or after `maxMs`. */
export function settle(doc: Document, quietMs = 450, maxMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    let timer = setTimeout(done, quietMs);
    const cap = setTimeout(done, maxMs);
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(done, quietMs);
    });
    mo.observe(doc.body, { subtree: true, childList: true, characterData: true });
    function done() {
      mo.disconnect();
      clearTimeout(timer);
      clearTimeout(cap);
      resolve();
    }
  });
}

/**
 * Shops on any store's own page, no integration needed: types into its search box, reads the
 * product cards it shows, and taps their Add / + buttons. It never places an order; "order kar do"
 * opens the cart for the visitor.
 */
export class ScreenShop implements ShopAdapter {
  private cards = new Map<string, Card>();
  private seq = 0;
  private ledger = new Map<string, CartLine>();

  constructor(
    private doc: Document,
    private host: () => Element | undefined,
    private onTouch: (target: string) => void = () => {},
  ) {}

  /** The card element for a `card:<id>` target, so the guide can highlight it. */
  element(id: string): Element | null {
    return this.cards.get(id)?.el ?? null;
  }

  async search(query: string, opts?: { maxPrice?: number }): Promise<Product[]> {
    const box = findSearchBox(this.doc, this.host());
    if (box) {
      await typeInto(box, query);
      submit(box);
      await settle(this.doc);
    }
    const words = query.toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/(es|s)$/, ''));
    const products = this.readCards().filter(
      (p) => (box || words.every((w) => p.name.toLowerCase().includes(w))) && (opts?.maxPrice === undefined || p.price === undefined || p.price <= opts.maxPrice),
    );
    if (products[0]) this.onTouch(`card:${products[0].id}`);
    return products;
  }

  async add(id: string, qty: number): Promise<void> {
    const card = this.fresh(id);
    if (!card?.add && !card?.plus) throw new Error('no add button');
    this.onTouch(`card:${id}`);
    for (let i = 0; i < qty; i++) {
      const now = this.fresh(id);
      // After the first tap many shops swap "Add" for a − 1 + stepper.
      const button = i === 0 ? (now?.add ?? now?.plus) : (now?.plus ?? now?.add);
      if (!button) break;
      button.click();
      await tick(180);
    }
    const line = this.ledger.get(id);
    this.ledger.set(id, { id, name: card!.product.name, price: card!.product.price, unit: card!.product.unit, qty: (line?.qty ?? 0) + qty });
    await settle(this.doc, 250, 2000);
  }

  async setQty(id: string, qty: number): Promise<void> {
    const have = this.ledger.get(id)?.qty ?? 0;
    if (qty > have) return this.add(id, qty - have);
    const card = this.fresh(id);
    if (!card?.minus) throw new Error('no minus button');
    this.onTouch(`card:${id}`);
    for (let i = 0; i < have - qty; i++) {
      this.fresh(id)?.minus?.click();
      await tick(180);
    }
    if (qty <= 0) this.ledger.delete(id);
    else this.ledger.set(id, { ...this.ledger.get(id)!, qty });
  }

  async remove(id: string): Promise<void> {
    return this.setQty(id, 0);
  }

  async cart(): Promise<Cart> {
    return { lines: [...this.ledger.values()], total: readCartTotal(this.doc, this.host()) };
  }

  async openCart(): Promise<void> {
    findCartButton(this.doc, this.host())?.click();
  }

  private readCards(): Product[] {
    this.cards.clear();
    return findCards(this.doc, this.host()).map((c) => {
      const id = `c${++this.seq}`;
      this.cards.set(id, c);
      return { id, ...c.product };
    });
  }

  /** The card again, with fresh buttons; found by name if the page re-rendered it. */
  private fresh(id: string): Card | undefined {
    const known = this.cards.get(id);
    if (!known) return undefined;
    if (known.el.isConnected) return readCard(known.el);
    const again = findCards(this.doc, this.host()).find((c) => c.product.name === known.product.name && c.product.unit === known.product.unit);
    if (again) this.cards.set(id, again);
    return again;
  }
}
