export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Corner = 'bottom-right' | 'bottom-left';

/** Space the host app keeps for itself, such as a bottom tab bar. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

const MARGIN = 16;
const INTERACTIVE = 'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[role="tab"],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

export const isPhone = (vw: number) => vw < 640;

export function dockBox(corner: Corner, size: number, vw: number, vh: number, lift = 0, inset: Insets = NO_INSETS): Box {
  const x = corner === 'bottom-left' ? MARGIN + inset.left : vw - size - MARGIN - inset.right;
  return { x, y: vh - size - MARGIN - lift - inset.bottom, w: size, h: size };
}

/** Beside the target: right, then left, then below, then above. Null when it can't fit without covering it. */
export function besideBox(t: DOMRect, size: number, vw: number, vh: number, inset: Insets = NO_INSETS): Box | null {
  const top = MARGIN + inset.top;
  const bottom = vh - inset.bottom;
  const y = clamp(t.top + Math.min(t.height, 160) / 2 - size / 2, top, bottom - size - MARGIN);
  if (vw - inset.right - t.right >= size + MARGIN + 8) return { x: t.right + 8, y, w: size, h: size };
  if (t.left - inset.left >= size + MARGIN + 8) return { x: t.left - size - 8, y, w: size, h: size };
  const x = clamp(t.left + t.width - size, MARGIN + inset.left, vw - size - MARGIN - inset.right);
  if (bottom - t.bottom >= size + MARGIN + 8) return { x, y: t.bottom + 8, w: size, h: size };
  if (t.top - inset.top >= size + MARGIN + 8) return { x, y: t.top - size - 8, w: size, h: size };
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
  insets?: Insets;
}): Placement {
  const { corner, size, vw, vh, target, covers } = opts;
  const inset = opts.insets ?? NO_INSETS;
  if (target && !isPhone(vw)) {
    const beside = besideBox(target, size, vw, vh, inset);
    if (beside && !covers(beside)) return { box: beside, mini: false };
  }
  const other: Corner = corner === 'bottom-right' ? 'bottom-left' : 'bottom-right';
  const candidates = [
    dockBox(corner, size, vw, vh, 0, inset),
    dockBox(other, size, vw, vh, 0, inset),
    dockBox(corner, size, vw, vh, 72, inset),
    dockBox(other, size, vw, vh, 72, inset),
  ];
  for (const box of candidates) if (!covers(box)) return { box, mini: false };
  const mini = Math.round(size * 0.6);
  const box = dockBox(corner, mini, vw, vh, 0, inset);
  return { box: { ...box, x: corner === 'bottom-left' ? inset.left : vw - mini - inset.right }, mini: true };
}

export function toInsets(v: Partial<Insets> | undefined): Insets {
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(400, Math.max(0, x)) : 0);
  return { top: n(v?.top), right: n(v?.right), bottom: n(v?.bottom), left: n(v?.left) };
}
