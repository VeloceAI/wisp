import type { Frame } from './animator';
import { n, r2, type SceneNode } from './scene';

const CONFETTI = ['#FF6B8B', '#FFD166', '#4CC9F0', '#7AE582', '#B794F6'];

const star = (cx: number, cy: number, s: number) =>
  `M${r2(cx)} ${r2(cy - s)}Q${r2(cx)} ${r2(cy)} ${r2(cx + s)} ${r2(cy)}Q${r2(cx)} ${r2(cy)} ${r2(cx)} ${r2(cy + s)}Q${r2(cx)} ${r2(cy)} ${r2(cx - s)} ${r2(cy)}Q${r2(cx)} ${r2(cy)} ${r2(cx)} ${r2(cy - s)}Z`;

export function effectNodes(f: Frame, topY: number): SceneNode[] {
  const t = f.reducedMotion ? 0.6 : f.effectT;
  const loop = (period: number, offset = 0) => (((t + offset) % period) + period) % period / period;
  switch (f.face.effect) {
    case 'zzz':
      return [
        n('fx', 'g', {}, [0, 1, 2].map((i) => {
          const p = loop(2.4, i * 0.8);
          const s = 5 + i * 1.5 + p * 3;
          const x = 140 + p * 18 + i * 4;
          const y = topY + 10 - p * 34 - i * 6;
          return n(`z${i}`, 'path', {
            d: `M${r2(x)} ${r2(y)}h${r2(s)}l${r2(-s)} ${r2(s)}h${r2(s)}`,
            fill: 'none',
            stroke: '#6B6B9A',
            'stroke-width': 2.4,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            opacity: r2(Math.sin(Math.PI * p)),
          });
        })),
      ];
    case 'sparkles':
      return [
        n('fx', 'g', {}, [[38, 70], [160, 64], [168, 128], [30, 132]].map(([x, y], i) => {
          const p = 0.6 + 0.4 * Math.sin(t * 5 + i * 1.7);
          return n(`s${i}`, 'path', { d: star(x!, y!, 7 * p), fill: '#FFD166', opacity: r2(p) });
        })),
      ];
    case 'question':
      return [{ ...n('fx', 'text', { x: 150, y: r2(topY + 20 - Math.sin(t * 3) * 3), 'font-size': 30, 'font-weight': 800, 'font-family': 'system-ui, sans-serif', fill: '#6B5BD6' }), text: '?' }];
    case 'exclaim':
      return [{ ...n('fx', 'text', { x: 148, y: r2(topY + 16), 'font-size': 28, 'font-weight': 800, 'font-family': 'system-ui, sans-serif', fill: '#FF8A4C', opacity: r2(Math.min(1, t * 3)) }), text: '!' }];
    case 'sweat': {
      const p = loop(1.6);
      const y = topY + 22 + p * 10;
      return [n('fx', 'path', { d: `M150 ${r2(y)}q-6 9 0 12q6 -3 0 -12Z`, fill: '#7CC7FF', opacity: r2(1 - p * 0.6) })];
    }
    case 'dots':
      return [
        n('fx', 'g', {}, [0, 1, 2].map((i) =>
          n(`d${i}`, 'circle', { cx: 146 + i * 11, cy: r2(topY + 8 - i * 6), r: 3 + i, fill: '#9C92C9', opacity: r2(f.reducedMotion ? 1 : loop(1.2, -i * 0.3) < 0.7 ? 1 : 0.25) }),
        )),
      ];
    case 'heart': {
      const p = loop(1.8);
      const x = 150;
      const y = topY + 20 - p * 22;
      return [n('fx', 'path', { d: `M${x} ${r2(y + 6)}c-7 -5 -9 -10 -5 -13c3 -2 5 0 5 2c0 -2 2 -4 5 -2c4 3 2 8 -5 13Z`, fill: '#FF6B8B', opacity: r2(1 - p * 0.7) })];
    }
    case 'confetti':
      return [
        n('fx', 'g', {}, Array.from({ length: 14 }, (_, i) => {
          const p = loop(1.8, i * 0.13);
          const x = 20 + ((i * 37) % 160) + Math.sin(t * 3 + i) * 6;
          const y = 10 + p * 150;
          return n(`c${i}`, 'rect', {
            x: r2(x),
            y: r2(y),
            width: 5,
            height: 8,
            rx: 1.5,
            fill: CONFETTI[i % CONFETTI.length]!,
            opacity: r2(1 - p * 0.5),
            transform: `rotate(${r2((t * 200 + i * 40) % 360)} ${r2(x + 2.5)} ${r2(y + 4)})`,
          });
        })),
      ];
    default:
      return [];
  }
}
