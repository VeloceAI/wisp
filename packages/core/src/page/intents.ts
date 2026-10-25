export type PageIntent = { type: 'explain' } | { type: 'find'; query: string };

const EXPLAIN = [
  /\b(what('?s| is)?|whats)\s+(on|in)\s+(this|the)\s+(page|screen)\b/i,
  /\b(explain|summari[sz]e|describe)\s+(this|the)\s+(page|screen)\b/i,
  /\bwhere am i\b/i,
  /\b(ye|yeh|is|iss)\s+(page|screen)\s*(par|pe|mein|me)?\s+kya\s+(hai|h)\b/i,
  /\b(page|screen)\s+(samjhao|samjha do|batao)\b/i,
  /(यह|इस)\s*(पेज|पन्ने)\s*(पर|में)?\s*क्या/,
];

const FIND: RegExp[] = [
  /^(?:where(?:'s| is| are)?|find(?: me)?|show me|point (?:to|at)|locate|how do i find)\s+(?:the\s+|a\s+|my\s+)?(.+?)[?.!]*$/i,
  /^(.+?)\s+(?:kahan|kaha|kahaan|kidhar)\s*(?:hai|h|hain|milega|milegi)?[?.!]*$/i,
  /^(?:dikhao|batao)\s+(.+?)[?.!]*$/i,
  /^(.+?)\s+(?:dikhao|dikha do)[?.!]*$/i,
  /^(.+?)\s+कहाँ\s+(?:है|हैं|मिलेगा)[?।]*$/,
];

/** Recognises page questions without AI: "what's on this page?", "where is the cart?", "cart kahan hai". */
export function parsePageIntent(text: string): PageIntent | null {
  const t = text.trim();
  if (EXPLAIN.some((re) => re.test(t))) return { type: 'explain' };
  for (const re of FIND) {
    const m = re.exec(t);
    const query = m?.[1]?.trim();
    if (query && query.length <= 60) return { type: 'find', query };
  }
  return null;
}
