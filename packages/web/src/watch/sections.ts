import type { SectionTip } from '@veloceai/wisp-core';

const DWELL_MS = 1200;

/** Reports which tip section the visitor is reading: the most visible one, after a short dwell. */
export function watchSections(doc: Document, sections: SectionTip[], onSection: (id: string | null) => void): () => void {
  if (!sections.length || typeof IntersectionObserver === 'undefined') return () => {};
  const ids = new Map<Element, string>();
  for (const s of sections) {
    const els = s.selector ? safeQueryAll(doc, s.selector) : [...doc.querySelectorAll(`[data-wisp-section="${cssEscape(s.id)}"]`)];
    for (const el of els) ids.set(el, s.id);
  }
  const ratios = new Map<string, number>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: string | null = null;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = ids.get(e.target);
        if (id) ratios.set(id, e.isIntersecting ? visibleShare(e) : 0);
      }
      let best: string | null = null;
      let bestRatio = 0.35;
      for (const [id, r] of ratios) if (r > bestRatio) [best, bestRatio] = [id, r];
      if (best === current) return;
      current = best;
      clearTimeout(timer);
      if (best) timer = setTimeout(() => current === best && onSection(best), DWELL_MS);
      else onSection(null);
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  for (const el of ids.keys()) io.observe(el);
  return () => {
    clearTimeout(timer);
    io.disconnect();
  };
}

/** Share of the viewport (or of the element, if smaller) that the element fills. */
function visibleShare(e: IntersectionObserverEntry): number {
  const vh = e.rootBounds?.height || window.innerHeight;
  const visible = e.intersectionRect.height;
  return Math.max(e.intersectionRatio, visible / Math.max(1, vh));
}

export function safeQueryAll(doc: Document | Element, selector: string): Element[] {
  try {
    return [...doc.querySelectorAll(selector)];
  } catch {
    return [];
  }
}

export function cssEscape(v: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : v.replace(/["\\]/g, '\\$&');
}
