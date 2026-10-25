import { CharacterAnimator, buildScene, type CharacterDefinition, type Mood, type Scene, type SceneNode } from '../../packages/core/src/index';

const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function node(n: SceneNode): string {
  const attrs = Object.entries(n.attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  const inner = n.text !== undefined ? esc(n.text) : (n.children ?? []).map(node).join('');
  return `<${n.tag}${attrs}>${inner}</${n.tag}>`;
}

/** A core Scene as SVG markup (no outer <svg>), with gradient ids made unique by `prefix`. */
export function sceneMarkup(scene: Scene): string {
  const defs = scene.gradients
    .map((g) => `<radialGradient id="${g.id}" cx="${g.cx}" cy="${g.cy}" r="${g.r}">${g.stops
      .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"${s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ''}/>`)
      .join('')}</radialGradient>`)
    .join('');
  return `<defs>${defs}</defs>${scene.nodes.map(node).join('')}`;
}

/** The character in a mood, settled for `ms` so blends finish; `t` picks the moment in its loops. */
export function pose(def: CharacterDefinition, mood: Mood, id: string, settleMs = 900, opts: { talk?: boolean; still?: boolean } = {}): Scene {
  const anim = new CharacterAnimator({ random: () => 0.99, reducedMotion: opts.still });
  anim.setMood(mood);
  anim.setSpeaking(!!opts.talk);
  let f = anim.tick(16);
  for (let t = 0; t < settleMs; t += 30) f = anim.tick(30);
  return buildScene(def, f, id);
}

export function svgDoc(width: number, height: number, body: string, bg?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : ''}${body}</svg>`;
}

/** Places a 200x200 scene at (x, y) scaled to `size`. */
export function place(scene: Scene, x: number, y: number, size: number): string {
  return `<g transform="translate(${x} ${y}) scale(${size / 200})">${sceneMarkup(scene)}</g>`;
}
