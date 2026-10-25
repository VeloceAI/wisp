import { describe, expect, it } from 'vitest';
import { CharacterAnimator, buildScene, defineCharacter, designFromText, paletteFrom, type SceneNode } from '../src/index';

const find = (nodes: SceneNode[], key: string): SceneNode | undefined => {
  for (const n of nodes) {
    if (n.key === key) return n;
    const inner = n.children && find(n.children, key);
    if (inner) return inner;
  }
  return undefined;
};

describe('designFromText', () => {
  it('turns a description into a character without AI', () => {
    const fox = defineCharacter(designFromText('a cute orange fox for a music app'));
    expect(fox.body.color).toBe('#FF8A4C');
    expect(fox.accessory.kind).toBe('ears');
    expect(fox.eyes.style).toBe('dot');
    const bot = defineCharacter(designFromText('blue robot called Zip'));
    expect([bot.name, bot.body.shape, bot.accessory.kind]).toEqual(['Zip', 'squircle', 'antenna']);
    expect(defineCharacter(designFromText('हरा पौधा, eco plant')).accessory.kind).toBe('sprout');
  });

  it('builds a matching palette from one colour', () => {
    const p = paletteFrom('#3FA9F5');
    expect(p.shade).not.toBe(p.color);
    expect(p.glow).not.toBe(p.color);
  });
});

describe('logo mode', () => {
  it('uses the logo as the body, clipped, with the face on top', () => {
    const def = defineCharacter({ logo: { src: 'https://example.com/logo.png', fit: 'rounded', faceY: 0.4 } });
    const scene = buildScene(def, new CharacterAnimator().tick(16), 't');
    expect(find(scene.nodes, 'logo')?.attrs.href).toBe('https://example.com/logo.png');
    expect(find(scene.nodes, 'body')).toBeUndefined();
    expect(scene.clipPaths?.[0]?.id).toBe('t-logo-clip');
    expect(find(scene.nodes, 'face')).toBeTruthy();
  });

  it('only accepts image sources', () => {
    expect(defineCharacter({ logo: { src: 'javascript:alert(1)' } }).logo).toBeNull();
    expect(defineCharacter({ logo: { src: 'data:text/html;base64,PHNjcmlwdD4=' } }).logo).toBeNull();
    expect(defineCharacter({ logo: { src: 'data:image/png;base64,iVBORw0KGgo=' } }).logo?.fit).toBe('circle');
    expect(defineCharacter({ logo: { src: '/brand/logo.svg' } }).logo?.src).toBe('/brand/logo.svg');
  });
});
