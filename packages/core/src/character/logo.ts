import type { CharacterDefinition } from './definition';
import { n, r2, type ClipPath, type SceneNode } from './scene';

const CX = 100;
const CY = 112;
const R = 62;

/** The logo as the character's body, clipped to a circle or rounded square, with a soft rim. */
export function logoBody(logo: NonNullable<CharacterDefinition['logo']>, idPrefix: string): { nodes: SceneNode[]; clip: ClipPath | null; top: number } {
  const half = R * logo.scale;
  const x = CX - half;
  const y = CY - half;
  const size = half * 2;
  const clipId = `${idPrefix}-logo-clip`;
  const shape =
    logo.fit === 'circle'
      ? `M${CX - half} ${CY}a${half} ${half} 0 1 0 ${size} 0a${half} ${half} 0 1 0 ${-size} 0Z`
      : roundedRect(x, y, size, size, logo.fit === 'rounded' ? half * 0.32 : 0);
  const image = n('logo', 'image', {
    href: logo.src,
    x: r2(x),
    y: r2(y),
    width: r2(size),
    height: r2(size),
    preserveAspectRatio: logo.fit === 'none' ? 'xMidYMid meet' : 'xMidYMid slice',
    ...(logo.fit === 'none' ? {} : { 'clip-path': `url(#${clipId})` }),
  });
  const nodes: SceneNode[] = logo.fit === 'none' ? [image] : [n('logo-bg', 'path', { d: shape, fill: '#fff' }), image, n('logo-rim', 'path', { d: shape, fill: 'none', stroke: 'rgba(0,0,0,.12)', 'stroke-width': 2 })];
  return { nodes, clip: logo.fit === 'none' ? null : { id: clipId, d: shape }, top: y };
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${r2(x + r)} ${r2(y)}H${r2(x + w - r)}Q${r2(x + w)} ${r2(y)} ${r2(x + w)} ${r2(y + r)}V${r2(y + h - r)}Q${r2(x + w)} ${r2(y + h)} ${r2(x + w - r)} ${r2(y + h)}H${r2(x + r)}Q${r2(x)} ${r2(y + h)} ${r2(x)} ${r2(y + h - r)}V${r2(y + r)}Q${r2(x)} ${r2(y)} ${r2(x + r)} ${r2(y)}Z`;
}
