import {
  CharacterAnimator,
  MOODS,
  SvgRenderer,
  buildScene,
  defineCharacter,
  designCharacter,
  fileToDataUrl,
  mount,
  paletteFromImage,
  sampleCharacters,
  type CharacterInput,
  type GuideConfig,
  type Mood,
  type WispInstance,
} from '@veloceai/wisp-web';

type Input = Required<Pick<CharacterInput, 'body' | 'eyes' | 'mouth' | 'cheeks' | 'accessory'>> & CharacterInput;

const state = {
  character: structuredClone(defineCharacter()) as unknown as Input,
  size: 'medium' as 'small' | 'medium' | 'large',
  theme: { accent: '', radius: 16, mode: 'auto' as 'auto' | 'light' | 'dark' },
  mood: 'happy' as Mood,
};

// ---------- preview ----------
interface Cell { anim: CharacterAnimator; renderer: SvgRenderer; id: string }
const big: Cell = { anim: new CharacterAnimator(), renderer: new SvgRenderer(), id: 'big' };
document.getElementById('big')!.append(big.renderer.svg);
big.renderer.svg.addEventListener('click', () => big.anim.impulse('squish'));
const cells: Cell[] = MOODS.map((mood) => {
  const cell = { anim: new CharacterAnimator(), renderer: new SvgRenderer(), id: `m-${mood}` };
  cell.anim.setMood(mood);
  cell.anim.setSpeaking(mood === 'talking');
  const fig = document.createElement('figure');
  fig.append(cell.renderer.svg, Object.assign(document.createElement('figcaption'), { textContent: mood }));
  document.getElementById('grid')!.append(fig);
  return cell;
});

const moodButtons = document.getElementById('mood-buttons')!;
for (const mood of MOODS) {
  const b = Object.assign(document.createElement('button'), { textContent: mood });
  b.addEventListener('click', () => {
    state.mood = mood;
    refresh();
  });
  moodButtons.append(b);
}

let def = defineCharacter(state.character);
let last = performance.now();
function loop(now: number) {
  const dt = now - last;
  last = now;
  big.renderer.render(buildScene(def, big.anim.tick(dt), big.id));
  for (const c of cells) c.renderer.render(buildScene(def, c.anim.tick(dt), c.id));
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- controls ----------
const controls = document.getElementById('controls')!;
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, props);
  return e;
}

function section(title: string, ...children: Node[]) {
  const fs = el('fieldset');
  fs.append(el('legend', { textContent: title }), ...children);
  controls.append(fs);
}
function row(label: string, input: HTMLElement) {
  const r = el('div', { className: 'row' });
  r.append(el('label', { textContent: label }), input);
  return r;
}
function select(options: string[], get: () => string, set: (v: string) => void) {
  const s = el('select');
  for (const o of options) s.append(el('option', { value: o, textContent: o }));
  s.addEventListener('change', () => (set(s.value), refresh()));
  binders.push(() => (s.value = get()));
  return s;
}
function colour(get: () => string | null | undefined, set: (v: string) => void) {
  const c = el('input', { type: 'color' });
  c.addEventListener('input', () => (set(c.value), refresh()));
  binders.push(() => (c.value = toHex(get() ?? '#ffffff')));
  return c;
}
function range(min: number, max: number, step: number, get: () => number, set: (v: number) => void) {
  const r = el('input', { type: 'range', min: String(min), max: String(max), step: String(step) });
  r.addEventListener('input', () => (set(Number(r.value)), refresh()));
  binders.push(() => (r.value = String(get())));
  return r;
}
function toggle(get: () => boolean, set: (v: boolean) => void) {
  const t = el('input', { type: 'checkbox' });
  t.addEventListener('change', () => (set(t.checked), refresh()));
  binders.push(() => (t.checked = get()));
  return t;
}
const binders: (() => void)[] = [];
const ch = () => state.character;

// Start from
const samples = el('div', { className: 'samples' });
for (const [name, input] of Object.entries(sampleCharacters)) {
  const b = el('button', { textContent: name });
  b.addEventListener('click', () => load(input));
  samples.append(b);
}
const describe = el('div', { className: 'describe' });
const prompt = el('input', { placeholder: 'e.g. a cute orange fox for a music app' });
const designBtn = el('button', { className: 'btn primary', textContent: 'Design' });
designBtn.addEventListener('click', async () => {
  designBtn.textContent = '…';
  load(await designCharacter(prompt.value, new URLSearchParams(location.search).get('ai') ? '/wisp' : undefined));
  designBtn.textContent = 'Design';
});
describe.append(prompt, designBtn);
section('Start from', samples, describe, el('p', { className: 'hint', textContent: 'Describe it in a few words (any of: colour, animal, robot, plant, royal, cute…). Works without AI; with AI it understands anything.' }));

// Logo
const file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml' });
file.addEventListener('change', async () => {
  const f = file.files?.[0];
  if (!f) return;
  const src = await fileToDataUrl(f);
  ch().logo = { src, fit: 'circle', scale: 1, faceY: 0 };
  const p = await paletteFromImage(src);
  if (p) {
    Object.assign(ch().body, { color: p.color, shade: p.shade, glow: p.glow });
    Object.assign(ch().eyes, { color: '#1D1442' });
    state.theme.accent = p.shade;
  }
  refresh();
});
const noLogo = el('button', { className: 'btn', textContent: 'Remove logo' });
noLogo.addEventListener('click', () => ((ch().logo = null), refresh()));
section(
  'Your logo (optional)',
  row('Upload', file),
  row('Shape', select(['circle', 'rounded', 'none'], () => ch().logo?.fit ?? 'circle', (v) => ch().logo && (ch().logo!.fit = v as 'circle'))),
  row('Logo size', range(0.6, 1.4, 0.05, () => ch().logo?.scale ?? 1, (v) => ch().logo && (ch().logo!.scale = v))),
  row('Face height', range(-1, 1, 0.05, () => ch().logo?.faceY ?? 0, (v) => ch().logo && (ch().logo!.faceY = v))),
  noLogo,
  el('p', { className: 'hint', textContent: 'Your logo becomes the body; eyes, mouth and all 12 moods are drawn on top. Brand colours are picked up automatically.' }),
);

// Body, face, extras
section(
  'Body',
  row('Name', bindText(() => ch().name ?? 'Wisp', (v) => (ch().name = v))),
  row('Shape', select(['wisp', 'round', 'squircle', 'blob', 'bean'], () => ch().body.shape!, (v) => (ch().body.shape = v as 'round'))),
  row('Colour', colour(() => ch().body.color, (v) => (ch().body.color = v))),
  row('Shade', colour(() => ch().body.shade, (v) => (ch().body.shade = v))),
  row('Glow', colour(() => ch().body.glow, (v) => (ch().body.glow = v))),
  row('Wobble', range(0, 0.2, 0.01, () => ch().body.wobble ?? 0.08, (v) => (ch().body.wobble = v))),
);
section(
  'Face',
  row('Eyes', select(['classic', 'dot', 'sparkle'], () => ch().eyes.style!, (v) => (ch().eyes.style = v as 'dot'))),
  row('Eye colour', colour(() => ch().eyes.color, (v) => (ch().eyes.color = v))),
  row('Eye size', range(0.6, 1.6, 0.05, () => ch().eyes.size ?? 1, (v) => (ch().eyes.size = v))),
  row('Eye spacing', range(0.6, 1.6, 0.05, () => ch().eyes.spacing ?? 1, (v) => (ch().eyes.spacing = v))),
  row('Mouth', select(['smile', 'cat', 'tiny'], () => ch().mouth.style!, (v) => (ch().mouth.style = v as 'cat'))),
  row('Blush', toggle(() => ch().cheeks.show !== false, (v) => (ch().cheeks.show = v))),
  row('Blush colour', colour(() => ch().cheeks.color, (v) => (ch().cheeks.color = v))),
);
section(
  'Extras',
  row('Accessory', select(['none', 'antenna', 'sprout', 'ears', 'crown'], () => ch().accessory.kind!, (v) => (ch().accessory.kind = v as 'none'))),
  row('Accessory colour', colour(() => ch().accessory.color, (v) => (ch().accessory.color = v))),
);
section(
  'On your site',
  row('Size', select(['small', 'medium', 'large'], () => state.size, (v) => (state.size = v as 'small'))),
  row('Button colour', colour(() => state.theme.accent || defineCharacter(ch()).body.shade, (v) => (state.theme.accent = v))),
  row('Corners', range(0, 28, 1, () => state.theme.radius, (v) => (state.theme.radius = v))),
  row('Light / dark', select(['auto', 'light', 'dark'], () => state.theme.mode, (v) => (state.theme.mode = v as 'auto'))),
);

function bindText(get: () => string, set: (v: string) => void) {
  const t = el('input', { type: 'text' });
  t.addEventListener('input', () => (set(t.value), refresh()));
  binders.push(() => (t.value = get()));
  return t;
}

function load(input: CharacterInput) {
  const keepLogo = ch().logo;
  state.character = structuredClone(defineCharacter(input)) as unknown as Input;
  if (keepLogo && !input.logo) state.character.logo = keepLogo;
  big.anim.impulse('hop');
  refresh();
}

// ---------- output ----------
function config(): GuideConfig {
  const theme = { ...(state.theme.accent ? { accent: state.theme.accent } : {}), radius: state.theme.radius, mode: state.theme.mode };
  const character = structuredClone(ch());
  if (character.logo?.src?.startsWith('data:')) character.logo.src = 'https://your-site.com/logo.png';
  return { character, size: state.size, theme };
}

function refresh() {
  def = defineCharacter(ch());
  big.anim.setMood(state.mood);
  big.anim.setSpeaking(state.mood === 'talking');
  for (const b of moodButtons.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.textContent === state.mood));
  binders.forEach((b) => b());
  document.getElementById('json')!.textContent = JSON.stringify(config(), null, 2);
  document.getElementById('tag')!.textContent = '<script src="https://YOUR-CDN/wisp.js" data-config="/wisp.json" defer></script>';
}

const copy = (id: string, btn: string) =>
  document.getElementById(btn)!.addEventListener('click', async (e) => {
    await navigator.clipboard?.writeText(document.getElementById(id)!.textContent ?? '');
    (e.target as HTMLButtonElement).textContent = 'Copied!';
    setTimeout(() => ((e.target as HTMLButtonElement).textContent = 'Copy'), 1200);
  });
copy('tag', 'copy-tag');
copy('json', 'copy-json');

let live: WispInstance | null = null;
document.getElementById('try')!.addEventListener('click', () => {
  live?.destroy();
  const cfg = config();
  cfg.character = ch();
  live = mount({ ...cfg, siteId: 'builder', welcome: false });
  live.say(`Hi, I'm ${def.name}! This is how I'll look on your site.`, 'happy');
  (window as unknown as { wisp: WispInstance }).wisp = live;
});

function toHex(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${[...c.slice(1)].map((x) => x + x).join('')}`;
  return '#ffffff';
}

refresh();
