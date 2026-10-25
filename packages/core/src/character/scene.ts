/** Renderer-neutral drawing: web turns it into SVG DOM, native into react-native-svg. */
export type SceneTag = 'g' | 'path' | 'ellipse' | 'circle' | 'rect' | 'text';

export interface SceneNode {
  key: string;
  tag: SceneTag;
  /** SVG attribute names (kebab-case). */
  attrs: Record<string, string | number>;
  children?: SceneNode[];
  text?: string;
}

export interface GradientStop {
  offset: number;
  color: string;
  opacity?: number;
}

export interface RadialGradient {
  id: string;
  cx: number;
  cy: number;
  r: number;
  stops: GradientStop[];
}

export interface Scene {
  size: number;
  gradients: RadialGradient[];
  nodes: SceneNode[];
}

export const n = (
  key: string,
  tag: SceneTag,
  attrs: Record<string, string | number>,
  children?: SceneNode[],
): SceneNode => (children ? { key, tag, attrs, children } : { key, tag, attrs });

export const r2 = (v: number) => Math.round(v * 100) / 100;

/** Smooth closed path through points (Catmull-Rom converted to cubic Béziers). */
export function smoothClosedPath(pts: [number, number][]): string {
  const len = pts.length;
  if (len < 3) return '';
  const p = (i: number) => pts[((i % len) + len) % len]!;
  let d = `M${r2(p(0)[0])} ${r2(p(0)[1])}`;
  for (let i = 0; i < len; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d + 'Z';
}
