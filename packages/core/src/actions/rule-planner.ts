import { localize } from '../brain/lang';
import { terms } from '../chat/text';
import type { PageModel } from '../page/model';
import { findElements } from '../page/understand';
import type { ActionPlan, ActionStep, SiteActionDecl } from './types';

const SPLIT = /\s*(?:,?\s+and then\s+|,?\s+then\s+|,\s+and\s+|\s+and\s+|\s+aur\s+(?:phir\s+|fir\s+)?|\s+phir\s+|\s+fir\s+|;\s*)/i;
const PRICE_AFTER = /\s*(?:under|below|less than|within|up ?to|upto|max(?:imum)?|cheaper than)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(?:rs\.?|rupees|inr)?/i;
const PRICE_BEFORE = /\s*(?:₹|rs\.?)?\s*([\d,]+)\s*(?:rs\.?|rupees)?\s*(?:ke andar|ke under|se kam|tak|ke neeche|ke niche)/i;

/** Looks like an instruction rather than a question. */
export function looksLikeCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /^(search|look for|sort|click|tap|press|open|go to|take me to|scroll|type|enter|fill|add|select|choose|pick|filter|set)\b/.test(t) ||
    /\b(karo|kardo|kar do|dhundo|dhoondo|khojo|kholo|khol do|dabao|daba do|lagao|jao)\s*[.!]?$/.test(t)
  );
}

/** Turns simple instructions into steps without AI. Returns null when any part isn't understood. */
export function planFromText(text: string, model: PageModel, actions: SiteActionDecl[] = []): ActionPlan | null {
  const clauses = text.trim().replace(/[.!]+$/, '').split(SPLIT).filter(Boolean);
  const steps: ActionStep[] = [];
  for (const clause of clauses) {
    const part = clauseSteps(clause.trim(), model, actions);
    if (!part) return null;
    steps.push(...part);
  }
  return steps.length ? { goal: text.trim(), steps } : null;
}

function clauseSteps(c: string, model: PageModel, actions: SiteActionDecl[]): ActionStep[] | null {
  let m: RegExpMatchArray | null;

  if ((m = c.match(/^(?:search|look)(?:\s+for)?\s+(.+)$/i) ?? c.match(/^(.+?)\s+(?:search|dhundo|dhoondo|khojo|dhundh do)(?:\s+karo|\s+kardo)?$/i))) {
    return searchSteps(m[1]!, model, actions);
  }
  if ((m = c.match(/^sort(?:\s+(?:it|them|results|items))?(?:\s+by)?\s+(.+)$/i) ?? c.match(/^(.+?)\s+(?:se|ke hisaab se|wise)\s+sort\s*(?:karo|kardo|kar do)?$/i))) {
    return [{ kind: 'select', target: 'sort', option: m[1]! }];
  }
  if ((m = c.match(/^add\s+(?:the\s+|a\s+)?(.+?)\s+to\s+(?:my\s+|the\s+)?cart$/i) ?? c.match(/^(.+?)\s+cart\s+(?:mein|me)\s+(?:add|daalo|dalo)\s*(?:karo|kardo)?$/i))) {
    return [{ kind: 'click', target: `add to cart ${m[1]!}` }];
  }
  if ((m = c.match(/^scroll\s+(up|down)$/i))) return [{ kind: 'scroll', direction: m[1]!.toLowerCase() as 'up' | 'down' }];
  if ((m = c.match(/^(?:scroll|go)\s+to\s+(?:the\s+)?(top|bottom)$/i))) return [{ kind: 'scroll', direction: m[1]!.toLowerCase() as 'top' | 'bottom' }];
  if ((m = c.match(/^(upar|neeche|niche)\s*(?:scroll)?\s*(?:karo|jao)?$/i))) return [{ kind: 'scroll', direction: m[1]!.toLowerCase() === 'upar' ? 'up' : 'down' }];
  if ((m = c.match(/^scroll\s+to\s+(?:the\s+)?(.+)$/i))) return [{ kind: 'scroll', target: m[1]! }];
  if ((m = c.match(/^(?:type|enter|write|fill(?:\s+in)?)\s+["“']?(.+?)["”']?\s+(?:in|into|on)\s+(?:the\s+)?(.+)$/i))) {
    return [{ kind: 'type', target: m[2]!, text: m[1]! }];
  }
  if ((m = c.match(/^(?:select|choose|pick|set)\s+["“']?(.+?)["”']?\s+(?:in|from|for)\s+(?:the\s+)?(.+)$/i))) {
    return [{ kind: 'select', target: m[2]!, option: m[1]! }];
  }
  const tool = matchDeclared(c, actions);
  if (tool) return [{ kind: 'tool', name: tool.name }];
  if ((m = c.match(/^(?:click|tap|press|hit|open|choose|select|pick|go to|take me to)\s+(?:on\s+)?(?:the\s+)?(.+)$/i) ?? c.match(/^(.+?)\s+(?:pe|par)\s+(?:click|tap)\s*(?:karo|kardo|kar do)?$/i) ?? c.match(/^(.+?)\s+(?:kholo|khol do|dabao|daba do|pe jao|par jao)$/i))) {
    return findElements(model, m[1]!).length ? [{ kind: 'click', target: m[1]! }] : null;
  }
  return null;
}

function searchSteps(raw: string, model: PageModel, actions: SiteActionDecl[]): ActionStep[] {
  let query = raw;
  let maxPrice: number | undefined;
  const price = query.match(PRICE_AFTER) ?? query.match(PRICE_BEFORE);
  if (price) {
    maxPrice = Number(price[1]!.replace(/,/g, ''));
    query = query.replace(price[0], ' ').replace(/\s+/g, ' ').trim();
  }
  query = query.replace(/^(?:for|me)\s+/i, '').replace(/\s+(?:for me|please)$/i, '');
  const declared = actions.find((a) => /search/i.test(a.name));
  if (declared) {
    const args: Record<string, unknown> = { query };
    if (maxPrice !== undefined) args[Object.keys(declared.params ?? {}).find((k) => /price|max/i.test(k)) ?? 'maxPrice'] = maxPrice;
    return [{ kind: 'tool', name: declared.name, args }];
  }
  const steps: ActionStep[] = [];
  const priceBox = maxPrice !== undefined ? findElements(model, 'max price')[0] : undefined;
  if (priceBox && !priceBox.sensitive) steps.push({ kind: 'type', target: priceBox.ref, text: String(maxPrice) });
  steps.push({ kind: 'type', target: 'search', text: query, submit: true });
  return steps;
}

function matchDeclared(clause: string, actions: SiteActionDecl[]): SiteActionDecl | null {
  const words = new Set(terms(clause));
  if (!words.size) return null;
  let best: SiteActionDecl | null = null;
  let bestScore = 0;
  for (const a of actions) {
    if (Object.values(a.params ?? {}).some((p) => p.required)) continue;
    const own = terms(`${a.name.replace(/[-_]/g, ' ')} ${localize(a.button, 'en')} ${localize(a.description, 'en')}`);
    const nameTerms = terms(a.name.replace(/[-_]/g, ' '));
    const hit = nameTerms.filter((t) => words.has(t)).length / Math.max(1, nameTerms.length);
    const score = hit + own.filter((t) => words.has(t)).length * 0.1;
    if (hit >= 0.99 && score > bestScore) [best, bestScore] = [a, score];
  }
  return best;
}
