import type { CharacterDefinition } from './definition';
import type { Frame } from './animator';
import { n, r2, smoothClosedPath, type Scene, type SceneNode } from './scene';
import { effectNodes } from './effects';
import { logoBody } from './logo';

const SIZE = 200;
const CX = 100;
const CY = 112;
const R = 60;

function bodyPoints(def: CharacterDefinition, f: Frame): [number, number][] {
  const time = f.reducedMotion ? 0 : f.t / 1000;
  const w = def.body.wobble;
  const pts: [number, number][] = [];
  const N = 48;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    let r = R;
    switch (def.body.shape) {
      case 'squircle':
        r = R / Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), 0.25) * 0.92;
        break;
      case 'bean':
        r = R * (1 + 0.1 * c * c - 0.05 * Math.max(0, -s));
        break;
      case 'blob':
        r = R * (1 + w * (0.6 * Math.sin(3 * a + time * 1.1) + 0.4 * Math.sin(5 * a - time * 1.7)));
        break;
      default:
        r = R * (1 + w * 0.25 * Math.sin(4 * a + time * 1.4));
    }
    let x = CX + r * c;
    let y = CY + r * s;
    if (def.body.shape === 'wisp' && s < 0) {
      const k = Math.pow(-s, 5);
      y -= 34 * k;
      x += k * (14 + 8 * Math.sin(time * 1.6));
    }
    if (s > 0) y -= 4 * s * s;
    pts.push([x, y]);
  }
  return pts;
}

function eyeNodes(def: CharacterDefinition, f: Frame, ex: number, ey: number, side: 'L' | 'R'): SceneNode[] {
  const e = def.eyes;
  const face = f.face;
  const sz = e.size;
  const open = Math.max(0, (side === 'L' ? face.eyeOpenL : face.eyeOpenR) * (1 - f.blink));
  const key = `eye${side}`;
  const lineEye = (bulge: number) =>
    n(key, 'path', {
      d: `M${r2(ex - 10 * sz)} ${r2(ey)}Q${r2(ex)} ${r2(ey + bulge * sz)} ${r2(ex + 10 * sz)} ${r2(ey)}`,
      fill: 'none',
      stroke: e.color,
      'stroke-width': r2(4.2 * sz),
      'stroke-linecap': 'round',
    });
  if (face.eyes === 'happy') return [lineEye(-11)];
  if (face.eyes === 'closed' || open < 0.12) return [lineEye(face.eyes === 'closed' ? 6 : 2)];

  const px = f.gazeX * 4.5 * sz;
  const py = f.gazeY * 4 * sz;
  if (e.style === 'classic') {
    const rx = 11.5 * sz;
    const ry = 14 * sz * Math.min(open, 1.15);
    const pr = 7 * sz * face.pupil;
    return [
      n(key, 'g', {}, [
        n('white', 'ellipse', { cx: r2(ex), cy: r2(ey), rx: r2(rx), ry: r2(ry), fill: e.white }),
        n('pupil', 'ellipse', {
          cx: r2(ex + px),
          cy: r2(ey + py * Math.min(1, open)),
          rx: r2(pr),
          ry: r2(Math.min(pr, ry * 0.85)),
          fill: e.color,
        }),
        n('shine', 'circle', { cx: r2(ex + px + 2.6 * sz), cy: r2(ey + py - 3 * sz * Math.min(1, open)), r: r2(2.3 * sz), fill: '#fff' }),
      ]),
    ];
  }
  const rx = 7.5 * sz * face.pupil;
  const ry = 10 * sz * Math.min(open, 1.15) * face.pupil;
  const kids: SceneNode[] = [
    n('ball', 'ellipse', { cx: r2(ex + px * 0.6), cy: r2(ey + py * 0.5), rx: r2(rx), ry: r2(ry), fill: e.color }),
    n('shine', 'circle', { cx: r2(ex + px * 0.6 - 2.4 * sz), cy: r2(ey + py * 0.5 - 3.5 * sz * Math.min(open, 1)), r: r2(2.6 * sz), fill: '#fff' }),
  ];
  if (e.style === 'sparkle')
    kids.push(n('shine2', 'circle', { cx: r2(ex + px * 0.6 + 2.6 * sz), cy: r2(ey + py * 0.5 + 3 * sz * Math.min(open, 1)), r: r2(1.3 * sz), fill: '#fff' }));
  return [n(key, 'g', {}, kids)];
}

function browNodes(def: CharacterDefinition, f: Frame, ex: number, ey: number, side: 'L' | 'R'): SceneNode[] {
  const face = f.face;
  if (face.browShow < 0.05) return [];
  const sz = def.eyes.size;
  const tilt = side === 'L' ? face.browTiltL : face.browTiltR;
  const dir = side === 'L' ? 1 : -1;
  const y = ey - 20 * sz - face.browLift;
  const inner = ex + dir * 8 * sz;
  const outer = ex - dir * 8 * sz;
  return [
    n(`brow${side}`, 'path', {
      d: `M${r2(outer)} ${r2(y + tilt * 5)}L${r2(inner)} ${r2(y - tilt * 5)}`,
      stroke: def.eyes.color,
      'stroke-width': 3.4,
      'stroke-linecap': 'round',
      opacity: r2(face.browShow),
    }),
  ];
}

function mouthNode(def: CharacterDefinition, f: Frame, mx: number, my: number): SceneNode {
  const face = f.face;
  const m = def.mouth;
  const w = 12 * face.mouthWidth * (m.style === 'tiny' ? 0.7 : 1);
  const open = Math.min(1, face.mouthOpen + f.talk);
  const stroke = { stroke: m.color, 'stroke-width': 3.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
  let shape = face.mouth;
  if (shape === 'curve' && m.style === 'cat' && open < 0.15 && face.mouthCurve > 0.2) shape = 'cat';

  if (shape === 'o') {
    const ry = 3 + open * 6;
    return n('mouth', 'ellipse', { cx: r2(mx), cy: r2(my + 2), rx: r2(Math.max(3.5, w * 0.45)), ry: r2(ry), fill: m.inner, stroke: m.color, 'stroke-width': 2.5 });
  }
  if (shape === 'wave') {
    const a = w;
    return n('mouth', 'path', { d: `M${r2(mx - a)} ${r2(my + 2)}q${r2(a / 2)} -6 ${r2(a)} 0t${r2(a)} 0`, ...stroke });
  }
  if (shape === 'cat') {
    const a = w * 0.55;
    return n('mouth', 'path', { d: `M${r2(mx - 2 * a)} ${r2(my)}q${r2(a / 2)} 6 ${r2(a)} 0q${r2(a / 2)} 6 ${r2(a)} 0`, ...stroke });
  }
  const curve = face.mouthCurve * 9;
  if (open < 0.08) return n('mouth', 'path', { d: `M${r2(mx - w)} ${r2(my)}Q${r2(mx)} ${r2(my + curve)} ${r2(mx + w)} ${r2(my)}`, ...stroke });
  const top = my + Math.min(curve, 0) * 0.4;
  const bottom = my + Math.max(curve, 2) + open * 14;
  return n('mouth', 'g', {}, [
    n('lip', 'path', {
      d: `M${r2(mx - w)} ${r2(my)}Q${r2(mx)} ${r2(top)} ${r2(mx + w)} ${r2(my)}Q${r2(mx)} ${r2(bottom)} ${r2(mx - w)} ${r2(my)}Z`,
      fill: m.inner,
      stroke: m.color,
      'stroke-width': 2.8,
      'stroke-linejoin': 'round',
    }),
    n('tongue', 'ellipse', { cx: r2(mx), cy: r2(my + (bottom - my) * 0.62), rx: r2(w * 0.45), ry: r2(Math.max(0.1, (bottom - my) * 0.22)), fill: '#FF7A9C', opacity: open > 0.3 ? 1 : 0 }),
  ]);
}

function accessoryNodes(def: CharacterDefinition, f: Frame, topY: number): SceneNode[] {
  const a = def.accessory;
  const sway = f.reducedMotion ? 0 : Math.sin(f.t / 450) * 4;
  switch (a.kind) {
    case 'antenna':
      return [
        n('acc', 'g', {}, [
          n('stem', 'path', { d: `M100 ${r2(topY + 6)}Q${r2(100 + sway)} ${r2(topY - 10)} ${r2(100 + sway * 1.5)} ${r2(topY - 22)}`, stroke: def.body.shade, 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' }),
          n('bob', 'circle', { cx: r2(100 + sway * 1.5), cy: r2(topY - 25), r: 6, fill: a.color }),
        ]),
      ];
    case 'sprout':
      return [
        n('acc', 'g', { transform: `rotate(${r2(sway * 1.5)} 100 ${r2(topY + 4)})` }, [
          n('stem', 'path', { d: `M100 ${r2(topY + 6)}L100 ${r2(topY - 12)}`, stroke: a.color, 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
          n('leafL', 'path', { d: `M100 ${r2(topY - 10)}q-16 -14 -22 -2q10 8 22 2Z`, fill: a.color }),
          n('leafR', 'path', { d: `M100 ${r2(topY - 12)}q14 -16 22 -4q-10 9 -22 4Z`, fill: a.color }),
        ]),
      ];
    case 'ears':
      return [
        n('acc', 'g', {}, [
          n('earL', 'path', { d: `M62 ${r2(topY + 30)}L58 ${r2(topY - 4 + sway * 0.5)}L86 ${r2(topY + 12)}Z`, fill: a.color }),
          n('earR', 'path', { d: `M138 ${r2(topY + 30)}L142 ${r2(topY - 4 - sway * 0.5)}L114 ${r2(topY + 12)}Z`, fill: a.color }),
        ]),
      ];
    case 'crown':
      return [n('acc', 'path', { d: `M80 ${r2(topY + 4)}L82 ${r2(topY - 14)}L91 ${r2(topY - 4)}L100 ${r2(topY - 18)}L109 ${r2(topY - 4)}L118 ${r2(topY - 14)}L120 ${r2(topY + 4)}Z`, fill: a.color, stroke: def.body.shade, 'stroke-width': 1.5, 'stroke-linejoin': 'round' })];
    default:
      return [];
  }
}

export function buildScene(def: CharacterDefinition, f: Frame, idPrefix = 'wisp'): Scene {
  const face = f.face;
  const lift = f.bobY + f.hopY + face.sink;
  const pts = bodyPoints(def, f);
  const logo = def.logo ? logoBody(def.logo, idPrefix) : null;
  const topY = logo ? logo.top : Math.min(...pts.map((p) => p[1]));
  const sx = f.squashX * (1 - f.breath * 0.012);
  const sy = f.squashY * (1 + f.breath * 0.02);
  const bodyId = `${idPrefix}-body`;
  const glowId = `${idPrefix}-glow`;

  const faceDx = f.gazeX * 5;
  const faceDy = f.gazeY * 3.5;
  const eyeGap = 23 * def.eyes.spacing;
  const ey = 104 - def.eyes.height * 10 - (def.logo?.faceY ?? 0) * 25 + faceDy;
  const exL = CX - eyeGap + faceDx;
  const exR = CX + eyeGap + faceDx;
  const blush = def.cheeks.show ? face.blush * 0.6 : 0;

  const body: SceneNode[] = logo
    ? logo.nodes
    : [n('body', 'path', { d: smoothClosedPath(pts), fill: `url(#${bodyId})`, ...(def.body.outline ? { stroke: def.body.outline, 'stroke-width': 3 } : {}) })];
  if (!logo && def.body.belly) body.push(n('belly', 'ellipse', { cx: CX, cy: 142, rx: 34, ry: 22, fill: def.body.belly, opacity: 0.85 }));
  if (!logo) body.push(n('gloss', 'ellipse', { cx: 76, cy: 84, rx: 13, ry: 8, fill: '#fff', opacity: 0.35, transform: 'rotate(-30 76 84)' }));

  const faceNodes: SceneNode[] = [
    n('cheekL', 'ellipse', { cx: r2(exL - 8), cy: r2(ey + 20), rx: 9, ry: 5.5, fill: def.cheeks.color, opacity: r2(blush) }),
    n('cheekR', 'ellipse', { cx: r2(exR + 8), cy: r2(ey + 20), rx: 9, ry: 5.5, fill: def.cheeks.color, opacity: r2(blush) }),
    ...browNodes(def, f, exL, ey, 'L'),
    ...browNodes(def, f, exR, ey, 'R'),
    ...eyeNodes(def, f, exL, ey, 'L'),
    ...eyeNodes(def, f, exR, ey, 'R'),
    mouthNode(def, f, CX + faceDx * 0.8, 132 + faceDy * 0.8),
  ];

  const tilt = face.tilt + f.tiltExtra;
  const shadowScale = 1 + lift / 60;
  return {
    size: SIZE,
    clipPaths: logo?.clip ? [logo.clip] : [],
    gradients: [
      { id: bodyId, cx: 0.38, cy: 0.32, r: 0.8, stops: [{ offset: 0, color: def.body.glow }, { offset: 0.45, color: def.body.color }, { offset: 1, color: def.body.shade }] },
      { id: glowId, cx: 0.5, cy: 0.5, r: 0.5, stops: [{ offset: 0, color: def.body.glow, opacity: 0.55 }, { offset: 1, color: def.body.glow, opacity: 0 }] },
    ],
    nodes: [
      n('aura', 'circle', { cx: CX, cy: CY, r: 92, fill: `url(#${glowId})` }),
      n('shadow', 'ellipse', { cx: CX, cy: 188, rx: r2(40 * shadowScale), ry: r2(6 * shadowScale), fill: '#000', opacity: r2(0.14 * shadowScale) }),
      n('figure', 'g', { transform: `translate(0 ${r2(lift)}) rotate(${r2(tilt)} ${CX} 170) translate(${CX} 172) scale(${r2(sx)} ${r2(sy)}) translate(${-CX} -172)` }, [
        ...accessoryNodes(def, f, topY),
        ...body,
        n('face', 'g', {}, faceNodes),
      ]),
      ...effectNodes(f, topY + lift),
    ],
  };
}
