export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Mixes toward white (amount > 0) or black (amount < 0). */
export function tint(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return rgbToHex(rgb.map((v) => v + (target - v) * a) as Rgb);
}

/** A full character palette from one brand colour. */
export function paletteFrom(hex: string): { color: string; shade: string; glow: string; ink: string; cheeks: string } {
  return { color: rgbToHex(hexToRgb(hex) ?? [139, 124, 255]), shade: tint(hex, -0.28), glow: tint(hex, 0.6), ink: tint(hex, -0.82), cheeks: tint(hex, 0.35) };
}
