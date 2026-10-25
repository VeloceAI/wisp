// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryStore, mount, type WispInstance } from '../src/index';
import { placeGuide } from '../src/ui/placement';

let wisp: WispInstance | null = null;
const shadow = () => document.querySelector('[data-wisp-host]')!.shadowRoot!;
const flush = () => new Promise((r) => setTimeout(r, 30));

afterEach(() => {
  wisp?.destroy();
  wisp = null;
  vi.useRealTimers();
});

describe('mount', () => {
  it('draws the character inside a shadow root', async () => {
    wisp = mount({ welcome: false }, { store: new InMemoryStore() });
    await flush();
    const root = shadow();
    expect(root.querySelector('svg path')).toBeTruthy();
    expect(root.querySelector('.body-btn')?.getAttribute('aria-label')).toContain('Wisp');
  });

  it('opens chat on tap and answers from the FAQ', async () => {
    wisp = mount({ welcome: false, faq: [{ q: 'How long is delivery?', a: '3 to 5 days.' }] }, { store: new InMemoryStore() });
    (shadow().querySelector('.body-btn') as HTMLButtonElement).click();
    expect(shadow().querySelector('.chat')!.hasAttribute('hidden')).toBe(false);
    const input = shadow().querySelector('.chat input') as HTMLInputElement;
    input.value = 'delivery time?';
    shadow().querySelector('.chat form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    const msgs = [...shadow().querySelectorAll('.msg')].map((m) => m.textContent);
    expect(msgs.at(-1)).toContain('3 to 5 days.');
  });

  it('reacts to wisp:error events with the fix', async () => {
    wisp = mount({ welcome: false }, { store: new InMemoryStore() });
    window.dispatchEvent(new CustomEvent('wisp:error', { detail: { fix: 'Check your PIN code.' } }));
    expect(shadow().querySelector('.bubble .text')?.textContent).toBe('Check your PIN code.');
    expect(wisp.guide.getState().mood).toBe('confused');
  });

  it('never renders config text as HTML', async () => {
    wisp = mount({ welcome: false }, { store: new InMemoryStore() });
    wisp.say('<img src=x onerror="window.__pwned=1">');
    expect(shadow().querySelector('.bubble img')).toBeNull();
    expect(shadow().querySelector('.bubble .text')?.textContent).toContain('<img');
  });

  it('hides to a tab and comes back', () => {
    wisp = mount({ welcome: false }, { store: new InMemoryStore() });
    wisp.hide();
    expect(shadow().querySelector('.figure')!.hasAttribute('hidden')).toBe(true);
    const tab = shadow().querySelector('.tab') as HTMLButtonElement;
    expect(tab.hasAttribute('hidden')).toBe(false);
    tab.click();
    expect(shadow().querySelector('.figure')!.hasAttribute('hidden')).toBe(false);
  });

  it('fires custom buttons as wisp:action', () => {
    const seen: string[] = [];
    window.addEventListener('wisp:action', (e) => seen.push((e as CustomEvent).detail.value), { once: true });
    wisp = mount({ welcome: false }, { store: new InMemoryStore() });
    wisp.guide.dispatch({ type: 'button', value: 'open-sizes' });
    expect(seen).toEqual(['open-sizes']);
  });

  it('removes itself on destroy', () => {
    wisp = mount({ welcome: false }, { store: new InMemoryStore() });
    wisp.destroy();
    wisp = null;
    expect(document.querySelector('[data-wisp-host]')).toBeNull();
  });
});

describe('placement', () => {
  const rect = (x: number, y: number, w: number, h: number) => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h }) as DOMRect;

  it('sits beside a target on desktop', () => {
    const p = placeGuide({ corner: 'bottom-right', size: 100, vw: 1200, vh: 800, target: rect(100, 200, 400, 100), covers: () => false });
    expect(p.box.x).toBe(508);
  });

  it('stays in a corner on phones', () => {
    const p = placeGuide({ corner: 'bottom-right', size: 80, vw: 375, vh: 800, target: rect(10, 100, 200, 50), covers: () => false });
    expect(p.box).toMatchObject({ x: 375 - 80 - 16, y: 800 - 80 - 16 });
  });

  it('moves away from buttons, then shrinks if everywhere is busy', () => {
    const busyRight = placeGuide({ corner: 'bottom-right', size: 80, vw: 375, vh: 800, target: null, covers: (b) => b.x > 100 });
    expect(busyRight.box.x).toBe(16);
    const busy = placeGuide({ corner: 'bottom-right', size: 80, vw: 375, vh: 800, target: null, covers: () => true });
    expect(busy.mini).toBe(true);
  });
});
