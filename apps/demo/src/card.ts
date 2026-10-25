import { CharacterAnimator, SvgRenderer, buildScene, defineCharacter, sampleCharacters, type Mood } from '@veloceai/wisp-web';

// Title cards for the demo video: /card.html?t=Title&s=Subtitle&c=code&mood=excited&char=wisp
const q = new URLSearchParams(location.search);
document.getElementById('t')!.textContent = q.get('t') ?? 'Wisp';
document.getElementById('s')!.textContent = q.get('s') ?? '';
const code = document.getElementById('c')!;
if (q.get('c')) {
  code.textContent = q.get('c');
  code.hidden = false;
}
const def = defineCharacter(sampleCharacters[q.get('char') ?? 'wisp']);
const anim = new CharacterAnimator();
anim.setMood((q.get('mood') as Mood) ?? 'excited');
anim.impulse('hop');
const r = new SvgRenderer();
document.getElementById('char')!.append(r.svg);
let last = performance.now();
const loop = (now: number) => {
  r.render(buildScene(def, anim.tick(now - last), 'card'));
  last = now;
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
setTimeout(() => (anim.setMood('happy'), anim.impulse('squish')), 1600);
