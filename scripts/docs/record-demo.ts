// Records the narrated demo video and the README screenshots: npm run demo (in one terminal), then npm run docs:video
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { makeClips, muxVideo } from './narration';

const URL = process.env.DEMO_URL ?? 'http://localhost:5180/';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const SHOTS = 'docs/assets/screens';
mkdirSync(SHOTS, { recursive: true });
mkdirSync('docs/.build', { recursive: true });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function caption(page: Page, text: string) {
  await page.evaluate((t) => {
    let el = document.getElementById('docs-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'docs-caption';
      el.setAttribute('data-wisp', 'off');
      Object.assign(el.style, {
        position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', zIndex: '2147483646',
        background: 'rgba(29,20,66,.92)', color: '#fff', padding: '12px 22px', borderRadius: '999px',
        font: '600 20px/1.3 Segoe UI, system-ui, sans-serif', boxShadow: '0 8px 30px rgba(0,0,0,.25)', transition: 'opacity .3s',
        pointerEvents: 'none', whiteSpace: 'nowrap',
      });
      document.body.append(el);
    }
    el.style.opacity = t ? '1' : '0';
    if (t) el.textContent = t;
  }, text);
}

const wisp = (page: Page, code: string) => page.evaluate(`(async () => { const w = window.wisp; ${code} })()`);

async function ask(page: Page, text: string) {
  await wisp(page, `w.openChat();`);
  await wait(400);
  for (let i = 1; i <= text.length; i += 2) {
    await page.evaluate((t) => {
      (document.querySelector('[data-wisp-host]')!.shadowRoot!.querySelector('.chat input') as HTMLInputElement).value = t;
    }, text.slice(0, i));
    await wait(35);
  }
  await page.evaluate((t) => {
    const form = document.querySelector('[data-wisp-host]')!.shadowRoot!.querySelector('.chat form') as HTMLFormElement;
    (form.querySelector('input') as HTMLInputElement).value = t;
    form.requestSubmit();
  }, text);
}

const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` as `${string}.png` });

interface Scene {
  caption: string;
  /** What the voiceover says; spelled for the speech engine. */
  say: string;
  run(page: Page): Promise<void>;
  /** Shortest time on screen, even if the voice line is shorter. */
  minMs: number;
}

const card = (t: string, s: string, extra = '') => `/card.html?t=${encodeURIComponent(t)}&s=${encodeURIComponent(s)}${extra}`;
const go = async (p: Page, path: string, cap: string) => {
  await p.goto(new globalThis.URL(path, URL).href, { waitUntil: 'load' });
  await caption(p, cap);
};

const SCENES: Scene[] = [
  {
    caption: '',
    say: 'What if your website had a friend... who actually helps?',
    minMs: 3600,
    run: async (p) => go(p, card('Your website just got a friend.', 'Meet Wisp, a living guide for any website or app'), ''),
  },
  {
    caption: 'Say hi to Wisp 👋',
    say: 'Meet Wisp! It greets every visitor, and shows new people around.',
    minMs: 4600,
    run: async (p) => {
      await go(p, '/', 'Say hi to Wisp 👋');
      // A fresh visitor, so the welcome shows.
      await p.evaluate(() => localStorage.clear());
      await p.reload({ waitUntil: 'load' });
      await caption(p, 'Say hi to Wisp 👋');
      await wait(1400);
      await shot(p, 'welcome');
      await wisp(p, `w.guide.dispatch({ type: 'button', value: 'tour:start' });`);
      await wait(1800);
      await shot(p, 'tour');
      await wisp(p, `w.guide.dispatch({ type: 'button', value: 'tour:end' });`);
    },
  },
  {
    caption: 'Tips right where you are reading',
    say: 'Scroll, and it drops a quick tip, right where you are reading.',
    minMs: 4200,
    run: async (p) => {
      await p.evaluate(() => window.scrollTo({ top: document.getElementById('shop')!.offsetTop - 60, behavior: 'smooth' }));
      await wait(3900);
      await shot(p, 'tip');
    },
  },
  {
    caption: 'Ask anything: English, हिन्दी, Hinglish',
    say: 'Ask anything! In English, Hindi, or Hinglish.',
    minMs: 3800,
    run: async (p) => {
      await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await ask(p, 'delivery kitne din mein hogi?');
      await wait(2200);
      await shot(p, 'chat-hinglish');
    },
  },
  {
    caption: 'It reads the page and points the way',
    say: 'It reads the page, and points you straight to what you need.',
    minMs: 3800,
    run: async (p) => {
      await ask(p, 'where is the sort menu?');
      await wait(2000);
      await wisp(p, `w.guide.dispatch({ type: 'chat-close' });`);
      await wait(700);
      await shot(p, 'point');
    },
  },
  {
    caption: 'Tell it what to do, and watch it work',
    say: 'Tell it what to do, and watch it work, step by step. And it always asks before anything final.',
    minMs: 6000,
    run: async (p) => {
      await wisp(p, `w.run('search red dress under ₹2000 and sort by price');`);
      await wait(2200);
      await shot(p, 'action');
    },
  },
  {
    caption: 'Errors? Plain-English fixes',
    say: 'Something went wrong? It explains the fix, in plain words.',
    minMs: 3600,
    run: async (p) => {
      await p.evaluate(() => window.dispatchEvent(new CustomEvent('wisp:error', { detail: { code: 'card_declined' } })));
      await wait(2800);
      await shot(p, 'error');
      await wisp(p, `w.guide.dispatch({ type: 'dismiss' });`);
    },
  },
  {
    caption: '🎙 “grocery wala page kholo”',
    say: 'Get around by voice! Just say, grocery page kholo.',
    minMs: 4200,
    run: async (p) => {
      await ask(p, 'grocery wala page kholo');
      await wait(2600);
      await caption(p, '🎙 “grocery wala page kholo”');
    },
  },
  {
    caption: '🛒 Shop by voice, in 11 languages',
    say: 'And shop by voice, in eleven languages! Pyaaz dikhaao. Pehla wala daal do. Done!',
    minMs: 7500,
    run: async (p) => {
      await go(p, '/grocery.html?mode=screen', '🛒 Shop by voice, in 11 languages');
      await wait(900);
      await ask(p, 'pyaaz dikhao');
      await wait(2300);
      await ask(p, 'pehla wala daal do');
      await wait(1800);
      await shot(p, 'grocery-screen-mode');
    },
  },
  {
    caption: '🎨 Make it yours, or use your logo',
    say: 'Make it yours! Describe a character, or just upload your logo, and it comes alive.',
    minMs: 7000,
    run: async (p) => {
      await go(p, '/builder.html', '🎨 Make it yours, or use your logo');
      await wait(700);
      await p.type('.describe input', 'a cute orange fox', { delay: 30 });
      await p.click('.describe button');
      await wait(1800);
      const file = await p.$('input[type=file]');
      await file?.uploadFile('apps/demo/public/sample-logo.svg');
      await wait(2200);
    },
  },
  {
    caption: '',
    say: 'Wisp. Add it to your product with one line of code. With or without A I.',
    minMs: 4400,
    run: async (p) =>
      go(p, card('Add Wisp in one line.', 'Works with or without AI · github.com/VeloceAI/wisp', `&c=${encodeURIComponent('<script src="wisp.js" data-config="wisp.json">')}&mood=celebrate`), ''),
  },
];

async function main() {
  const clips = await makeClips(SCENES.map((s) => s.say), 'docs/.build/voice');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: { width: 1280, height: 760 }, args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  const recorder = await page.screencast({ path: 'docs/.build/raw.webm' });
  const t0 = Date.now();
  const starts: number[] = [];
  for (const [i, scene] of SCENES.entries()) {
    const start = Date.now();
    starts.push(start - t0);
    await caption(page, scene.caption);
    await scene.run(page);
    const left = Math.max(scene.minMs, (clips[i]?.ms ?? 0) + 500) - (Date.now() - start);
    if (left > 0) await wait(left);
  }
  await recorder.stop();

  const phone = await browser.newPage();
  await phone.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  await phone.goto(URL, { waitUntil: 'load' });
  await phone.evaluate(() => localStorage.clear());
  await phone.reload({ waitUntil: 'load' });
  await wait(2500);
  await phone.screenshot({ path: `${SHOTS}/phone.png` });
  await browser.close();

  writeFileSync('docs/.build/timeline.json', JSON.stringify({ clips, starts }));
  muxVideo('docs/.build/raw.webm', clips, starts, 'docs/wisp-demo.mp4', process.env.WISP_MUSIC);
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', 'docs/wisp-demo.mp4', '-vf', 'fps=10,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer', 'docs/assets/demo.gif']);
  console.log(`video written (${clips.filter((c) => c.file).length} voice lines)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
