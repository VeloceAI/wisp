import { designFromText, paletteFrom, rgbToHex, type CharacterInput } from '@veloceai/wisp-core';

/** A character from a sentence: AI through the proxy when available, otherwise keyword matching. */
export async function designCharacter(description: string, endpoint?: string): Promise<CharacterInput> {
  if (endpoint) {
    try {
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/design`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const { character } = (await res.json()) as { character: CharacterInput | null };
      if (res.ok && character) return character;
    } catch {
      /* fall back to keywords */
    }
  }
  return designFromText(description);
}

/** Reads a picture file into a data URL (for logo mode). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/**
 * The logo's main brand colour, turned into a character palette. Greys, near-white and near-black
 * pixels are ignored so a white background doesn't win.
 */
export async function paletteFromImage(src: string): Promise<ReturnType<typeof paletteFrom> | null> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode().catch(() => undefined);
  if (!img.naturalWidth) return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null;
  }
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
    if (a < 128) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat < 0.25 || max < 40 || min > 235) continue;
    const hue = Math.round(hueOf(r, g, b) / 30) % 12;
    const bucket = buckets.get(hue) ?? { w: 0, r: 0, g: 0, b: 0 };
    const w = sat;
    bucket.w += w;
    bucket.r += r * w;
    bucket.g += g * w;
    bucket.b += b * w;
    buckets.set(hue, bucket);
  }
  const best = [...buckets.values()].sort((a, b) => b.w - a.w)[0];
  if (!best) return null;
  return paletteFrom(rgbToHex([best.r / best.w, best.g / best.w, best.b / best.w]));
}

function hueOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
