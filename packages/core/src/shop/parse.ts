import type { ShopWordPack } from './types';

export type ShopIntent =
  | { kind: 'find'; query: string; maxPrice?: number; sort?: 'cheapest' | 'costliest' }
  | { kind: 'add'; query: string; qty?: number; unit?: string; maxPrice?: number; sort?: 'cheapest' | 'costliest' }
  | { kind: 'pick'; index: number | 'cheapest' | 'costliest'; qty?: number }
  | { kind: 'setQty'; qty?: number; delta?: number; query?: string }
  | { kind: 'remove'; query: string }
  | { kind: 'cart' }
  | { kind: 'total' }
  | { kind: 'checkout' }
  | { kind: 'done' }
  | { kind: 'yes' }
  | { kind: 'no' };

const DEVANAGARI_DIGITS = '०१२३४५६७८९';
const MORE_TOKEN = ' __more__ ';

function normalize(text: string): string {
  return ` ${text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)))
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/[“”"'‘’!?।.,;:()]/g, (m) => (m === ',' || m === ';' ? ' , ' : m === '.' ? '.' : ' '))
    .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/(\d)([a-zऀ-ॿ]+)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

const has = (c: string, phrase: string) => c.includes(` ${phrase} `);
const firstHit = (c: string, list: string[]) => list.find((p) => has(c, p));
const strip = (c: string, phrase: string) => c.replace(` ${phrase} `, ' ');
const words = (c: string) => c.trim().split(' ').filter(Boolean);

function takePrice(c: string, w: ShopWordPack): { c: string; maxPrice?: number } {
  for (const u of w.under) {
    const after = new RegExp(` ${escape(u)} (?:₹|rs|rupees|inr)? ?(\\d+(?:\\.\\d+)?)(?: (?:rs|rupees|rupaye|₹|रुपये))? `);
    const before = new RegExp(` (?:₹|rs)? ?(\\d+(?:\\.\\d+)?) (?:rs |rupees |rupaye |₹ |रुपये )?${escape(u)} `);
    const m = c.match(after) ?? c.match(before);
    if (m) return { c: c.replace(m[0], ' '), maxPrice: Number(m[1]) };
  }
  return { c };
}

function takeQty(c: string, w: ShopWordPack): { c: string; qty?: number; unit?: string } {
  const toks = words(c);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    const n = /^\d+(\.\d+)?$/.test(t) ? Number(t) : w.numbers[t];
    if (n === undefined) continue;
    const unit = toks[i + 1] !== undefined ? w.units[toks[i + 1]!] : undefined;
    toks.splice(i, unit ? 2 : 1);
    return { c: ` ${toks.join(' ')} `, qty: n, unit };
  }
  return { c };
}

function cleanQuery(c: string, w: ShopWordPack): string {
  let q = c;
  for (const f of w.fillers) while (has(q, f)) q = strip(q, f);
  return q.replace(/ , /g, ' ').replace(/\s+/g, ' ').trim();
}

function removeAll(c: string, list: string[]): string {
  let out = c;
  for (const p of list) while (has(out, p)) out = strip(out, p);
  return out;
}

function clauseIntent(raw: string, w: ShopWordPack): ShopIntent | 'none' {
  let c = raw;
  const n = words(c).length;
  if (firstHit(c, w.done) && n <= 4) return { kind: 'done' };
  if (firstHit(c, w.checkout)) return { kind: 'checkout' };
  if (firstHit(c, w.cart)) return { kind: 'cart' };
  if (firstHit(c, w.total)) return { kind: 'total' };

  const rem = firstHit(c, w.remove);
  if (rem) return { kind: 'remove', query: cleanQuery(removeAll(strip(c, rem), [...w.add]), w) };

  if (has(c, '__more__')) return { kind: 'setQty', delta: 1, query: cleanQuery(removeAll(strip(c, '__more__'), w.add), w) || undefined };

  const cheap = firstHit(c, w.cheapest);
  const dear = firstHit(c, w.costliest);
  const ord = Object.keys(w.ordinals).sort((a, b) => b.length - a.length).find((o) => has(c, o));
  if (cheap || dear) {
    // "sabse sasta chips dikhao" is a sorted search; "sabse sasta wala daalo" picks from the last results.
    const body = strip(c, (cheap ?? dear)!);
    const verbAdd = firstHit(body, w.add);
    const verbFind = verbAdd ? undefined : firstHit(body, w.find);
    const rest = takeQty(removeAll(removeAll(body, w.add), w.find), w);
    const query = cleanQuery(rest.c, w);
    const sort = cheap ? 'cheapest' : 'costliest';
    if (query && verbFind) return { kind: 'find', query, sort };
    if (query) return { kind: 'add', query, qty: rest.qty, unit: rest.unit, sort };
  }
  if (cheap || dear || ord) {
    const rest = takeQty(removeAll(strip(c, (cheap ?? dear ?? ord)!), w.add), w);
    return { kind: 'pick', index: cheap ? 'cheapest' : dear ? 'costliest' : w.ordinals[ord!]!, qty: rest.qty };
  }

  const price = takePrice(c, w);
  c = price.c;
  // Verb phrases go before numbers are read, so the "do" in "daal do" isn't taken as "two".
  const add = firstHit(c, w.add);
  const find = add ? undefined : firstHit(c, w.find);
  const set = add || find ? undefined : firstHit(c, w.setTo);
  const body = add ? removeAll(c, w.add) : find ? removeAll(c, w.find) : set ? strip(c, set) : c;
  const qty = takeQty(body, w);
  if (set && qty.qty !== undefined && !cleanQuery(removeAll(qty.c, ['it', 'that']), w)) return { kind: 'setQty', qty: qty.qty };
  if (add) return { kind: 'add', query: cleanQuery(qty.c, w), qty: qty.qty, unit: qty.unit, maxPrice: price.maxPrice };
  if (find) return { kind: 'find', query: cleanQuery(qty.c, w), maxPrice: price.maxPrice };

  if (n <= 3 && firstHit(raw, w.no)) return { kind: 'no' };
  if (n <= 3 && firstHit(raw, w.yes)) return { kind: 'yes' };
  return 'none';
}

/**
 * Turns a spoken or typed shopping request into intents. Lists like
 * "onion, tomato aur 2 litre milk daal do" become one add per item.
 */
export function parseShop(text: string, w: ShopWordPack): ShopIntent[] {
  let c = normalize(text);
  for (const m of w.more) c = c.split(` ${m} `).join(MORE_TOKEN);
  const clauses = c
    .split(/ , | and then | then | and | aur | और | phir | fir | फिर | & /)
    .map((s) => ` ${s.trim()} `)
    .filter((s) => s.trim());
  const parsed = clauses.map((cl) => ({ cl, intent: clauseIntent(cl, w) }));
  const verb = parsed.find((p) => p.intent !== 'none' && ['add', 'find', 'remove'].includes(p.intent.kind))?.intent as
    | Extract<ShopIntent, { kind: 'add' | 'find' | 'remove' }>
    | undefined;
  const out: ShopIntent[] = [];
  for (const { cl, intent } of parsed) {
    if (intent !== 'none') {
      if ((intent.kind === 'add' || intent.kind === 'find') && !intent.query && verb && verb !== intent) continue;
      out.push(intent);
      continue;
    }
    if (!verb) return [];
    const qty = takeQty(cl, w);
    const query = cleanQuery(qty.c, w);
    if (!query) continue;
    if (verb.kind === 'add') out.push({ kind: 'add', query, qty: qty.qty, unit: qty.unit });
    else if (verb.kind === 'find') out.push({ kind: 'find', query });
    else out.push({ kind: 'remove', query });
  }
  return out;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
