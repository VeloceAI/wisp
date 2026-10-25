import { CharacterAnimator, MOODS, SvgRenderer, buildScene, defineCharacter, sampleCharacters } from '@veloceai/wisp-web';

const out = document.getElementById('out')!;
const cells: { anim: CharacterAnimator; renderer: SvgRenderer; def: ReturnType<typeof defineCharacter>; id: string }[] = [];

for (const [name, input] of Object.entries(sampleCharacters)) {
  const def = defineCharacter(input);
  const row = document.createElement('div');
  row.className = 'row';
  out.append(Object.assign(document.createElement('h2'), { textContent: def.name }), row);
  for (const mood of MOODS) {
    const anim = new CharacterAnimator();
    anim.setMood(mood);
    anim.setSpeaking(mood === 'talking');
    const renderer = new SvgRenderer();
    const fig = document.createElement('figure');
    fig.append(renderer.svg, Object.assign(document.createElement('figcaption'), { textContent: mood }));
    fig.addEventListener('click', () => anim.impulse('squish'));
    row.append(fig);
    cells.push({ anim, renderer, def, id: `${name}-${mood}` });
  }
}

let last = performance.now();
const loop = (now: number) => {
  const dt = now - last;
  last = now;
  for (const c of cells) c.renderer.render(buildScene(c.def, c.anim.tick(dt), c.id));
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
