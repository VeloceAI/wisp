export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Corner = 'bottom-right' | 'bottom-left';

const MARGIN = 16;
const INTERACTIVE = 'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[role="tab"],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

export const isPhone = (vw: number) => vw < 640;

export function dockBox(corner: Corner, size: number, vw: number, vh: number, lift = 0): Box {
  const x = corner === 'bottom-left' ? MARGIN : vw - size - MARGIN;
  return { x, y: vh - size - MARGIN - lift, w: size, h: size };
}

/** Beside the target: right, then left, then above. Null when it can't fit without covering it. */
export function besideBox(t: DOMRect, size: number, vw: number, vh: number): Box | null {
  const y = clamp(t.top + Math.min(t.height, 160) / 2 - size / 2, MARGIN, vh - size - MARGIN);
  if (vw - t.right >= size + MARGIN + 8) return { x: t.right + 8, y, w: size, h: size };
  if (t.left >= size + MARGIN + 8) return { x: t.left - size - 8, y, w: size, h: size };
  const x = clamp(t.left + t.width - size, MARGIN, vw - size - MARGIN);
  if (vh - t.bottom >= size + MARGIN + 8) return { x, y: t.bottom + 8, w: size, h: size };
  if (t.top >= size + MARGIN + 8) return { x, y: t.top - size - 8, w: size, h: size };
  return null;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** True when any clickable page element sits under the box. `host` is our own element, ignored. */
export function coversInteractive(box: Box, doc: Document, host: Element): boolean {
  if (typeof doc.elementsFromPoint !== 'function') return false;
  const pts: [number, number][] = [];
  for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) pts.push([box.x + box.w * fx, box.y + box.h * fy]);
  return pts.some(([x, y]) =>
    doc.elementsFromPoint(x, y).some((el) => el !== host && !host.contains(el) && el.closest(INTERACTIVE) !== null),
  );
}

export interface Placement {
  box: Box;
  mini: boolean;
}

/**
 * Where the guide should sit. On phones it never leaves the bottom corners, and if both corners
 * cover something clickable it lifts up and then shrinks to a faded mini size.
 */
export function placeGuide(opts: {
  corner: Corner;
  size: number;
  vw: number;
  vh: number;
  target: DOMRect | null;
  covers: (b: Box) => boolean;
}): Placement {
  const { corner, size, vw, vh, target, covers } = opts;
  if (target && !isPhone(vw)) {
    const beside = besideBox(target, size, vw, vh);
    if (beside && !covers(beside)) return { box: beside, mini: false };
  }
  const other: Corner = corner === 'bottom-right' ? 'bottom-left' : 'bottom-right';
  const candidates = [dockBox(corner, size, vw, vh), dockBox(other, size, vw, vh), dockBox(corner, size, vw, vh, 72), dockBox(other, size, vw, vh, 72)];
  for (const box of candidates) if (!covers(box)) return { box, mini: false };
  const mini = Math.round(size * 0.6);
  const box = dockBox(corner, mini, vw, vh);
  return { box: { ...box, x: corner === 'bottom-left' ? 0 : vw - mini }, mini: true };
}
