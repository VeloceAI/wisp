export type BodyShape = 'wisp' | 'round' | 'squircle' | 'blob' | 'bean';
export type EyeStyle = 'classic' | 'dot' | 'sparkle';
export type MouthStyle = 'smile' | 'cat' | 'tiny';
export type AccessoryKind = 'none' | 'antenna' | 'sprout' | 'ears' | 'crown';

export interface CharacterDefinition {
  name: string;
  body: {
    shape: BodyShape;
    color: string;
    shade: string;
    glow: string;
    belly: string | null;
    outline: string | null;
    /** 0..0.2 — how much the outline breathes and ripples. */
    wobble: number;
  };
  eyes: {
    style: EyeStyle;
    color: string;
    white: string;
    /** 0.6..1.6 */
    size: number;
    /** 0.6..1.6 */
    spacing: number;
    /** -1..1, moves the eyes up or down the face. */
    height: number;
  };
  mouth: { style: MouthStyle; color: string; inner: string };
  cheeks: { show: boolean; color: string };
  accessory: { kind: AccessoryKind; color: string };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object | null ? DeepPartial<NonNullable<T[K]>> | T[K] : T[K] };
export type CharacterInput = DeepPartial<CharacterDefinition>;

export const defaultCharacter: CharacterDefinition = {
  name: 'Wisp',
  body: {
    shape: 'wisp',
    color: '#8B7CFF',
    shade: '#5D4BE0',
    glow: '#C9C1FF',
    belly: null,
    outline: null,
    wobble: 0.08,
  },
  eyes: { style: 'classic', color: '#1D1442', white: '#FFFFFF', size: 1, spacing: 1, height: 0 },
  mouth: { style: 'smile', color: '#1D1442', inner: '#5A1F45' },
  cheeks: { show: true, color: '#FF8FB8' },
  accessory: { kind: 'none', color: '#FFD166' },
};

const SHAPES: BodyShape[] = ['wisp', 'round', 'squircle', 'blob', 'bean'];
const EYES: EyeStyle[] = ['classic', 'dot', 'sparkle'];
const MOUTHS: MouthStyle[] = ['smile', 'cat', 'tiny'];
const ACCESSORIES: AccessoryKind[] = ['none', 'antenna', 'sprout', 'ears', 'crown'];

const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
const pick = <T extends string>(v: unknown, allowed: T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
// Colours end up in SVG attributes, so anything that isn't a plain colour token is rejected.
const COLOR_RE = /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;
export const validColor = (v: unknown): string | null => (typeof v === 'string' && COLOR_RE.test(v.trim()) ? v.trim() : null);
const color = (v: unknown, fallback: string) => validColor(v) ?? fallback;
const optColor = (v: unknown, fallback: string | null) => (v === null ? null : validColor(v) ?? fallback);

export function defineCharacter(input: CharacterInput = {}): CharacterDefinition {
  const d = defaultCharacter;
  const b = input.body ?? {};
  const e = input.eyes ?? {};
  const m = input.mouth ?? {};
  const c = input.cheeks ?? {};
  const a = input.accessory ?? {};
  return {
    name: typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 40) : d.name,
    body: {
      shape: pick(b.shape, SHAPES, d.body.shape),
      color: color(b.color, d.body.color),
      shade: color(b.shade, d.body.shade),
      glow: color(b.glow, d.body.glow),
      belly: optColor(b.belly, d.body.belly),
      outline: optColor(b.outline, d.body.outline),
      wobble: clamp(b.wobble, 0, 0.2, d.body.wobble),
    },
    eyes: {
      style: pick(e.style, EYES, d.eyes.style),
      color: color(e.color, d.eyes.color),
      white: color(e.white, d.eyes.white),
      size: clamp(e.size, 0.6, 1.6, d.eyes.size),
      spacing: clamp(e.spacing, 0.6, 1.6, d.eyes.spacing),
      height: clamp(e.height, -1, 1, d.eyes.height),
    },
    mouth: {
      style: pick(m.style, MOUTHS, d.mouth.style),
      color: color(m.color, d.mouth.color),
      inner: color(m.inner, d.mouth.inner),
    },
    cheeks: { show: c.show ?? d.cheeks.show, color: color(c.color, d.cheeks.color) },
    accessory: { kind: pick(a.kind, ACCESSORIES, d.accessory.kind), color: color(a.color, d.accessory.color) },
  };
}

/** Ready-made looks; products usually start from one and change the colours. */
export const sampleCharacters: Record<string, CharacterInput> = {
  wisp: {},
  ember: {
    name: 'Ember',
    body: { shape: 'wisp', color: '#FF8A4C', shade: '#E2552B', glow: '#FFD0A8', wobble: 0.1 },
    eyes: { style: 'dot', color: '#3A1406' },
    mouth: { style: 'cat', color: '#3A1406', inner: '#7A2410' },
    cheeks: { color: '#FF5E7E' },
  },
  sprout: {
    name: 'Sprout',
    body: { shape: 'bean', color: '#5FD39A', shade: '#2FA36C', glow: '#C5F5DC', belly: '#D9FBE9' },
    eyes: { style: 'sparkle', color: '#0E3B26' },
    mouth: { color: '#0E3B26', inner: '#164D33' },
    accessory: { kind: 'sprout', color: '#2E9E5B' },
  },
  bolt: {
    name: 'Bolt',
    body: { shape: 'squircle', color: '#3FA9F5', shade: '#1F78C8', glow: '#BFE4FF', wobble: 0.03 },
    eyes: { style: 'classic', color: '#0B2540', spacing: 1.1 },
    mouth: { style: 'tiny', color: '#0B2540', inner: '#14385E' },
    accessory: { kind: 'antenna', color: '#FFD166' },
  },
  mochi: {
    name: 'Mochi',
    body: { shape: 'blob', color: '#FFC6D9', shade: '#F28DB2', glow: '#FFF0F5', wobble: 0.12 },
    eyes: { style: 'dot', color: '#4A2333', size: 1.1 },
    mouth: { style: 'cat', color: '#4A2333', inner: '#8A3A55' },
    cheeks: { color: '#FF7FA8' },
    accessory: { kind: 'ears', color: '#F28DB2' },
  },
};
