import { validColor, type CharacterDefinition, type GuideConfig, type GuideSize } from '@veloceai/wisp-core';

const NAMED: Record<string, [number, number]> = { small: [80, 64], medium: [112, 84], large: [144, 104] };
const MIN = 48;
const MAX = 240;

const px = (size: GuideSize | undefined, phone: boolean): number | null => {
  if (size === undefined) return null;
  if (typeof size === 'number' && Number.isFinite(size)) return Math.round(Math.min(MAX, Math.max(MIN, size)));
  const named = NAMED[size as string];
  return named ? named[phone ? 1 : 0] : null;
};

/** Character size in pixels for this screen. A bare number on phones shrinks to 75% so it doesn't crowd. */
export function resolveSize(size: GuideConfig['size'], phone: boolean): number {
  if (size !== null && typeof size === 'object') {
    const own = px(phone ? size.phone : size.desktop, phone);
    if (own) return own;
    const other = px(phone ? size.desktop : size.phone, phone);
    if (other) return phone ? Math.max(MIN, Math.round(other * 0.75)) : other;
    return NAMED.medium![phone ? 1 : 0];
  }
  const n = px(size, phone);
  if (n === null) return NAMED.medium![phone ? 1 : 0];
  return phone && typeof size === 'number' ? Math.max(MIN, Math.round(n * 0.75)) : n;
}

// Fonts go into a CSS variable, so only plain family lists are accepted.
const safeFont = (v: unknown) => (typeof v === 'string' && /^[\w\s,"'-]{1,200}$/.test(v) ? v : null);
const clamp = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

/** Applies the owner's theme as CSS variables on the widget's own layer; nothing leaks to the page. */
export function applyTheme(layer: HTMLElement, config: GuideConfig, def: CharacterDefinition): void {
  const t = config.theme ?? {};
  const set = (name: string, value: string | null) => (value === null ? layer.style.removeProperty(name) : layer.style.setProperty(name, value));
  const accent = validColor(t.accent) ?? def.body.shade;
  set('--wisp-accent', accent);
  set('--wisp-soft', /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}55` : def.body.glow + '66');
  set('--wisp-paper', validColor(t.paper));
  set('--wisp-ink', validColor(t.ink));
  set('--wisp-font', safeFont(t.font));
  const fontSize = clamp(t.fontSize, 11, 20);
  set('--wisp-font-size', fontSize === null ? null : `${fontSize}px`);
  const radius = clamp(t.radius, 0, 28);
  set('--wisp-radius', radius === null ? null : `${radius}px`);
  const w = clamp(t.chatWidth, 280, 560);
  set('--wisp-chat-width', w === null ? null : `${w}px`);
  const h = clamp(t.chatHeight, 320, 800);
  set('--wisp-chat-height', h === null ? null : `${h}px`);
  layer.dataset.mode = t.mode === 'light' || t.mode === 'dark' ? t.mode : 'auto';
}
