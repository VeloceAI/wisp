// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryStore, Lines, explainPage, mount, type WispInstance } from '../src/index';
import { PageReader } from '../src/page/reader';
import { dockBox, placeGuide, toInsets } from '../src/ui/placement';

let wisp: WispInstance | null = null;
afterEach(() => {
  wisp?.destroy();
  wisp = null;
  document.body.innerHTML = '';
});

describe('insets', () => {
  const insets = toInsets({ bottom: 64 });

  it('keeps every placement above a bottom tab bar', () => {
    expect(dockBox('bottom-right', 80, 375, 800, 0, insets).y).toBe(800 - 80 - 16 - 64);
    const busy = placeGuide({ corner: 'bottom-right', size: 80, vw: 375, vh: 800, target: null, covers: () => true, insets });
    expect(busy.box.y + busy.box.h).toBeLessThanOrEqual(800 - 64);
  });

  it('lifts the "Show guide" tab too', async () => {
    wisp = mount({ welcome: false, insets: { bottom: 64 } }, { store: new InMemoryStore() });
    wisp.hide();
    await new Promise((r) => setTimeout(r, 50));
    const tab = document.querySelector('[data-wisp-host]')!.shadowRoot!.querySelector('.tab') as HTMLElement;
    expect(tab.style.bottom).toBe('82px');
  });

  it('ignores bad values', () => {
    expect(toInsets({ bottom: -5, top: Number.NaN, left: 9999 })).toEqual({ top: 0, right: 0, bottom: 0, left: 400 });
  });
});

describe('page summary', () => {
  it('uses the h1 over a shared site title, and lists links', () => {
    document.title = 'SVEYRA';
    document.body.innerHTML = '<nav><a href="/closet">Closet</a><a href="/looks">Looks</a></nav><h1>My closet</h1><h2>Tops</h2>';
    const text = explainPage(new PageReader(document).read(), 'en', new Lines({}, () => 0));
    expect(text).toContain('“My closet”');
    expect(text).toContain('Links here: Closet, Looks.');
  });
});

describe('navigate hook', () => {
  it('sends same-site links to the app router instead of reloading', () => {
    const navigate = vi.fn();
    wisp = mount({ welcome: false }, { store: new InMemoryStore(), navigate });
    wisp.guide.dispatch({ type: 'button', value: 'link:/returns?x=1#top' });
    expect(navigate).toHaveBeenCalledWith('/returns?x=1#top');
  });
});

describe('targets', () => {
  it('uses the first visible match, not a hidden one', async () => {
    document.body.innerHTML = '<button class="dup" style="display:none">hidden</button><button class="dup" id="shown">shown</button>';
    const shown = document.getElementById('shown')!;
    shown.getClientRects = () => [{}] as unknown as DOMRectList;
    shown.getBoundingClientRect = () => ({ top: 100, left: 40, width: 80, height: 30, right: 120, bottom: 130, x: 40, y: 100, toJSON() {} }) as DOMRect;
    wisp = mount({ welcome: false }, { store: new InMemoryStore() });
    wisp.guide.pointAt('.dup');
    await new Promise((r) => setTimeout(r, 60));
    const hl = document.querySelector('[data-wisp-host]')!.shadowRoot!.querySelector('.highlight') as HTMLElement;
    expect(hl.classList.contains('show')).toBe(true);
    expect(hl.style.top).toBe('96px');
  });
});
