export interface Product {
  id: string;
  name: string;
  price?: number;
  /** e.g. "1 kg", "500 g", "1 L". */
  unit?: string;
  brand?: string;
  inStock?: boolean;
}

export interface CartLine {
  id: string;
  name: string;
  qty: number;
  price?: number;
  unit?: string;
}

export interface Cart {
  lines: CartLine[];
  total?: number;
}

/**
 * What a store lets Wisp do. Results come back as data, so "the first one" means an exact product.
 * Checkout is never called on voice alone: the visitor taps Confirm.
 */
export interface ShopAdapter {
  search(query: string, opts?: { maxPrice?: number }): Promise<Product[]>;
  add(productId: string, qty: number): Promise<void>;
  setQty?(productId: string, qty: number): Promise<void>;
  remove?(productId: string): Promise<void>;
  cart(): Promise<Cart>;
  checkout?(): Promise<void>;
}

export interface ShopConfig {
  currency?: string;
  /** Local names mapped to catalogue words: { "pyaaz": "onion", "kanda": "onion" }. */
  synonyms?: Record<string, string>;
  /** Extra word packs for languages Wisp doesn't ship (see docs/voice-word-pack-template.json). */
  words?: Partial<ShopWordPack>[];
  /** How many search results to read out. */
  readOut?: number;
}

export interface ShopWordPack {
  lang: string;
  find: string[];
  add: string[];
  remove: string[];
  cart: string[];
  total: string[];
  checkout: string[];
  more: string[];
  setTo: string[];
  done: string[];
  yes: string[];
  no: string[];
  cheapest: string[];
  costliest: string[];
  /** Words to drop from a product query: "please", "me", "in my cart"… */
  fillers: string[];
  ordinals: Record<string, number>;
  numbers: Record<string, number>;
  /** Spoken unit → short unit ("kilo" → "kg"). */
  units: Record<string, string>;
  /** Words that mean "below this price". */
  under: string[];
}
