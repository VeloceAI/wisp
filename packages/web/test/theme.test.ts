// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { defineCharacter, InMemoryStore, mount } from '../src/index';
import { applyTheme, resolveSize } from '../src/ui/theme';

describe('size', () => {
  it('resolves names, numbers and per-screen values', () => {
    expect(resolveSize(undefined, false)).toBe(112);
    expect(resolveSize('small', true)).toBe(64);
    expect(resolveSize('large', false)).toBe(144);
    expect(resolveSize(160, false)).toBe(160);
    expect(resolveSize(160, true)).toBe(120);
    expect(resolveSize(9999, false)).toBe(240);
    expect(resolveSize(1, false)).toBe(48);
    expect(resolveSize({ desktop: 'large', phone: 70 }, true)).toBe(70);
    expect(resolveSize({ desktop: 200 }, true)).toBe(150);
    expect(resolveSize('huge' as never, false)).toBe(112);
  });

  it('sizes the character on the page', async () => {
    const wisp = mount({ welcome: false, size: 150 }, { store: new InMemoryStore() });
    await new Promise((r) => setTimeout(r, 50));
    const fig = document.querySelector('[data-wisp-host]')!.shadowRoot!.querySelector('.figure') as HTMLElement;
    expect(fig.style.width).toBe('150px');
    wisp.destroy();
  });
});

describe('theme', () => {
  const layer = () => document.createElement('div');

  it('sets safe CSS variables and the colour mode', () => {
    const el = layer();
    applyTheme(el, { theme: { accent: '#ff6600', radius: 0, font: 'Poppins, sans-serif', mode: 'dark', chatWidth: 420 } }, defineCharacter());
    expect(el.style.getPropertyValue('--wisp-accent')).toBe('#ff6600');
    expect(el.style.getPropertyValue('--wisp-radius')).toBe('0px');
    expect(el.style.getPropertyValue('--wisp-font')).toBe('Poppins, sans-serif');
    expect(el.style.getPropertyValue('--wisp-chat-width')).toBe('420px');
    expect(el.dataset.mode).toBe('dark');
  });

  it('ignores unsafe or out-of-range values and falls back to the character', () => {
    const el = layer();
    const def = defineCharacter({ body: { shade: '#123456' } });
    applyTheme(el, { theme: { accent: 'red;}body{display:none', font: 'x; } * { color: red', radius: 999 } }, def);
    expect(el.style.getPropertyValue('--wisp-accent')).toBe('#123456');
    expect(el.style.getPropertyValue('--wisp-font')).toBe('');
    expect(el.style.getPropertyValue('--wisp-radius')).toBe('28px');
    expect(el.dataset.mode).toBe('auto');
  });
});
