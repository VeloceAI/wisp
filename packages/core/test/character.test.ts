import { describe, expect, it } from 'vitest';
import { CharacterAnimator, MOODS, buildScene, defineCharacter, sampleCharacters, type SceneNode } from '../src/index';

const walk = (nodes: SceneNode[], fn: (n: SceneNode) => void) =>
  nodes.forEach((n) => {
    fn(n);
    if (n.children) walk(n.children, fn);
  });

describe('defineCharacter', () => {
  it('fills defaults and rejects unsafe values', () => {
    const c = defineCharacter({ body: { color: 'url(javascript:alert(1))', shape: 'nope' as never, wobble: 9 }, eyes: { size: 99 } });
    expect(c.body.color).toBe('#8B7CFF');
    expect(c.body.shape).toBe('wisp');
    expect(c.body.wobble).toBe(0.2);
    expect(c.eyes.size).toBe(1.6);
  });

  it('keeps valid colours and explicit nulls', () => {
    const c = defineCharacter({ body: { color: '#123456', belly: null } });
    expect(c.body.color).toBe('#123456');
    expect(c.body.belly).toBeNull();
  });
});

describe('scene', () => {
  for (const [name, input] of Object.entries(sampleCharacters)) {
    it(`draws every mood for ${name} with finite numbers`, () => {
      const def = defineCharacter(input);
      const anim = new CharacterAnimator({ random: () => 0.5 });
      for (const mood of MOODS) {
        anim.setMood(mood);
        anim.setSpeaking(mood === 'talking');
        anim.impulse('hop');
        for (let i = 0; i < 20; i++) anim.tick(33);
        const scene = buildScene(def, anim.tick(33));
        walk(scene.nodes, (n) => {
          for (const v of Object.values(n.attrs)) expect(String(v)).not.toMatch(/NaN|Infinity|undefined/);
        });
      }
    });
  }

  it('shows mood effects', () => {
    const anim = new CharacterAnimator();
    anim.setMood('sleeping');
    const scene = buildScene(defineCharacter(), anim.tick(16));
    expect(scene.nodes.some((n) => n.key === 'fx')).toBe(true);
  });

  it('stays still with reduced motion', () => {
    const anim = new CharacterAnimator({ reducedMotion: true });
    anim.setMood('celebrate');
    anim.impulse('hop');
    let f = anim.tick(16);
    for (let i = 0; i < 30; i++) f = anim.tick(50);
    expect(f.bobY).toBe(0);
    expect(f.hopY).toBe(0);
  });

  it('blinks now and then', () => {
    const anim = new CharacterAnimator({ random: () => 0.1 });
    let blinked = false;
    for (let i = 0; i < 400; i++) if (anim.tick(20).blink > 0.5) blinked = true;
    expect(blinked).toBe(true);
  });

  it('eyes follow a look target', () => {
    const anim = new CharacterAnimator();
    anim.lookAt(1, 0);
    let f = anim.tick(16);
    for (let i = 0; i < 30; i++) f = anim.tick(30);
    expect(f.gazeX).toBeGreaterThan(0.9);
  });
});
