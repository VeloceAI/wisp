import type { AppEventDetail } from '@veloceai/wisp-core';

export const BUILT_IN_EVENTS = ['success', 'error', 'loading', 'loaded', 'conversion'];

export interface InputHandlers {
  onActivity(): void;
  onPointer(x: number, y: number): void;
  onScroll(direction: 1 | -1): void;
  onLeave(): void;
  onAppEvent(name: string, detail: AppEventDetail): void;
}

/** Visitor activity, cursor position, exit intent and `wisp:*` app events. Never touches forms. */
export function watchInput(win: Window, customEvents: string[], h: InputHandlers): () => void {
  const off: (() => void)[] = [];
  const on = <K extends string>(target: EventTarget, type: K, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, opts);
    off.push(() => target.removeEventListener(type, fn, opts));
  };

  let lastActivity = 0;
  const activity = () => {
    const now = Date.now();
    if (now - lastActivity > 1000) {
      lastActivity = now;
      h.onActivity();
    }
  };
  on(win, 'pointermove', (e) => {
    const p = e as PointerEvent;
    h.onPointer(p.clientX, p.clientY);
    activity();
  }, { passive: true });
  on(win, 'pointerdown', activity, { passive: true });
  on(win, 'keydown', activity);
  let lastY = win.scrollY;
  on(win, 'scroll', () => {
    const y = win.scrollY;
    if (Math.abs(y - lastY) > 4) h.onScroll(y > lastY ? 1 : -1);
    lastY = y;
    activity();
  }, { passive: true });
  on(win.document, 'mouseout', (e) => {
    const m = e as MouseEvent;
    if (!m.relatedTarget && m.clientY <= 0) h.onLeave();
  });

  for (const name of new Set([...BUILT_IN_EVENTS, ...customEvents])) {
    on(win, `wisp:${name}`, (e) => h.onAppEvent(name, toDetail((e as CustomEvent).detail)));
  }
  return () => off.forEach((f) => f());
}

function toDetail(raw: unknown): AppEventDetail {
  if (typeof raw === 'string') return { message: raw };
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 500) : undefined);
  return { message: str(r.message), code: str(r.code), fix: str(r.fix), line: str(r.line) };
}
