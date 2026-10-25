// Draws the README/PDF character art straight from the core drawing code: npm run docs:art
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { CharacterAnimator, MOODS, buildScene, defineCharacter, sampleCharacters, type Mood } from '../../packages/core/src/index';
import { place, pose, sceneMarkup, svgDoc } from './svg';

const out = 'docs/assets';
mkdirSync(`${out}/characters`, { recursive: true });
const FONT = 'font-family="Segoe UI, Arial, sans-serif"';

// One SVG per sample character, idle.
for (const [name, input] of Object.entries(sampleCharacters)) {
  const def = defineCharacter(input);
  writeFileSync(`${out}/characters/${name}.svg`, svgDoc(200, 200, sceneMarkup(pose(def, 'happy', name, 900, { still: true }))));
}

// Line-up of all samples with names.
const names = Object.keys(sampleCharacters);
const lineup = names
  .map((name, i) => {
    const def = defineCharacter(sampleCharacters[name]);
    return `${place(pose(def, i % 2 ? 'happy' : 'idle', `l${i}`, 900, { still: true }), 20 + i * 180, 10, 160)}<text x="${100 + i * 180}" y="200" text-anchor="middle" ${FONT} font-size="18" font-weight="600" fill="#2b2540">${def.name}</text>`;
  })
  .join('');
writeFileSync(`${out}/lineup.svg`, svgDoc(names.length * 180 + 20, 220, lineup, '#fbf8f4'));

// 12-mood grid for each character.
for (const [name, input] of Object.entries(sampleCharacters)) {
  const def = defineCharacter(input);
  const cells = MOODS.map((mood, i) => {
    const x = (i % 6) * 150;
    const y = Math.floor(i / 6) * 170;
    return `<rect x="${x + 6}" y="${y + 6}" width="138" height="158" rx="16" fill="#fff"/>${place(pose(def, mood, `${name}-${mood}`, 1200, { talk: mood === 'talking' }), x + 15, y + 8, 120)}<text x="${x + 75}" y="${y + 152}" text-anchor="middle" ${FONT} font-size="14" fill="#6b6880">${mood}</text>`;
  }).join('');
  writeFileSync(`${out}/moods-${name}.svg`, svgDoc(900, 346, cells, '#f3efe9'));
}

// Animated hero: Wisp cycling through a few moods, rendered frame by frame into a GIF.
const frames = join(out, '.frames');
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
const def = defineCharacter();
const anim = new CharacterAnimator({ random: Math.random });
const plan: [Mood, number, boolean?][] = [['waking', 900], ['happy', 1300], ['talking', 1500, true], ['thinking', 1300], ['excited', 1400], ['celebrate', 1600], ['shy', 1200], ['idle', 1000]];
let frame = 0;
const fps = 25;
for (const [mood, ms, talk] of plan) {
  anim.setMood(mood);
  anim.setSpeaking(!!talk);
  if (mood === 'happy') anim.impulse('squish');
  if (mood === 'excited') anim.impulse('hop');
  for (let t = 0; t < ms; t += 1000 / fps) {
    const svg = svgDoc(240, 240, `<g transform="translate(20 25)">${sceneMarkup(buildScene(def, anim.tick(1000 / fps), 'h'))}</g>`, '#ffffff');
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 240 } }).render().asPng();
    writeFileSync(join(frames, `f${String(frame++).padStart(4, '0')}.png`), png);
  }
}
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, 'f%04d.png'),
  '-vf', 'split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse', '-loop', '0', `${out}/wisp.gif`]);
rmSync(frames, { recursive: true, force: true });
console.log(`art written to ${out} (${readdirSync(`${out}/characters`).length} characters, ${frame} gif frames)`);
