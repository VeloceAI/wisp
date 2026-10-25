import type { ClipPath, RadialGradient, Scene, SceneNode } from '@veloceai/wisp-core';

const NS = 'http://www.w3.org/2000/svg';

interface Mounted {
  el: SVGElement;
  attrs: Record<string, string | number>;
  kids: Map<string, Mounted>;
  text?: string;
}

/** Draws a core Scene into an <svg>, reusing elements by key so 60fps updates stay cheap. */
export class SvgRenderer {
  readonly svg: SVGSVGElement;
  private defs: SVGDefsElement;
  private root = new Map<string, Mounted>();
  private gradientKey = '';

  constructor(doc: Document = document) {
    this.svg = doc.createElementNS(NS, 'svg') as SVGSVGElement;
    this.svg.setAttribute('viewBox', '0 0 200 200');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.setAttribute('focusable', 'false');
    this.defs = doc.createElementNS(NS, 'defs') as SVGDefsElement;
    this.svg.appendChild(this.defs);
  }

  render(scene: Scene): void {
    this.renderDefs(scene.gradients, scene.clipPaths ?? []);
    this.sync(this.svg, this.root, scene.nodes);
  }

  private renderDefs(gradients: RadialGradient[], clips: ClipPath[]): void {
    const key = JSON.stringify([gradients, clips]);
    if (key === this.gradientKey) return;
    this.gradientKey = key;
    const doc = this.svg.ownerDocument;
    const clipEls = clips.map((c) => {
      const el = doc.createElementNS(NS, 'clipPath');
      el.setAttribute('id', c.id);
      const path = doc.createElementNS(NS, 'path');
      path.setAttribute('d', c.d);
      el.appendChild(path);
      return el;
    });
    this.defs.replaceChildren(
      ...clipEls,
      ...gradients.map((g) => {
        const el = this.svg.ownerDocument.createElementNS(NS, 'radialGradient');
        el.setAttribute('id', g.id);
        el.setAttribute('cx', String(g.cx));
        el.setAttribute('cy', String(g.cy));
        el.setAttribute('r', String(g.r));
        for (const s of g.stops) {
          const stop = this.svg.ownerDocument.createElementNS(NS, 'stop');
          stop.setAttribute('offset', String(s.offset));
          stop.setAttribute('stop-color', s.color);
          if (s.opacity !== undefined) stop.setAttribute('stop-opacity', String(s.opacity));
          el.appendChild(stop);
        }
        return el;
      }),
    );
  }

  private sync(parent: Element, mounted: Map<string, Mounted>, nodes: SceneNode[]): void {
    const seen = new Set<string>();
    let prev: Element | null = parent === this.svg ? this.defs : null;
    for (const node of nodes) {
      const id = `${node.tag}:${node.key}`;
      seen.add(id);
      let m = mounted.get(id);
      if (!m) {
        m = { el: this.svg.ownerDocument.createElementNS(NS, node.tag) as SVGElement, attrs: {}, kids: new Map() };
        mounted.set(id, m);
      }
      const expected: ChildNode | null = prev ? prev.nextSibling : parent.firstChild;
      if (m.el !== expected) parent.insertBefore(m.el, expected);
      prev = m.el;
      for (const [k, v] of Object.entries(node.attrs)) {
        if (m.attrs[k] !== v) m.el.setAttribute(k, String(v));
      }
      for (const k of Object.keys(m.attrs)) if (!(k in node.attrs)) m.el.removeAttribute(k);
      m.attrs = node.attrs;
      if (node.text !== undefined && node.text !== m.text) {
        m.el.textContent = node.text;
        m.text = node.text;
      }
      if (node.children) this.sync(m.el, m.kids, node.children);
    }
    for (const [id, m] of mounted) {
      if (!seen.has(id)) {
        m.el.remove();
        mounted.delete(id);
      }
    }
  }
}
