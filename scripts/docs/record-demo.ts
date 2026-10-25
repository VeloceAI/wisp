// Records the narrated demo video and the README screenshots: npm run demo (in one terminal), then npm run docs:video
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { makeClips, muxVideo } from './narration';

const URL = process.env.DEMO_URL ?? 'http://localhost:5180/';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const SHOTS = 'docs/assets/screens';
mkdirSync(SHOTS, { recursive: true });

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

const SCENES: Scene[] = [
  { caption: 'Meet Wisp: a living guide for any website', say: 'Meet Wisp. A small, friendly guide that lives on your website or app.', minMs: 3200, run: async (p) => { await wait(2800); await shot(p, 'welcome'); } },
  {
    caption: 'It runs a tour for new visitors',
    say: 'New visitors get a quick tour, step by step.',
    minMs: 5000,
    run: async (p) => {
      await wisp(p, `w.guide.dispatch({ type: 'button', value: 'tour:start' });`);
      await wait(2400);
      await shot(p, 'tour');
      await wisp(p, `w.guide.dispatch({ type: 'button', value: 'tour:next' });`);
      await wait(2200);
      await wisp(p, `w.guide.dispatch({ type: 'button', value: 'tour:end' });`);
    },
  },
  {
    caption: 'It gives a short tip beside what you are reading',
    say: 'As people scroll, it gives one short tip, right beside what they are reading.',
    minMs: 4500,
    run: async (p) => {
      await p.evaluate(() => window.scrollTo({ top: document.getElementById('shop')!.offsetTop - 60, behavior: 'smooth' }));
      await wait(4300);
      await shot(p, 'tip');
    },
  },
  {
    caption: 'Ask anything, in English, Hindi or Hinglish',
    say: 'Visitors can ask anything, in English, Hindi, or Hinglish. It answers from your own help pages.',
    minMs: 4000,
    run: async (p) => {
      await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
      await ask(p, 'delivery kitne din mein hogi?');
      await wait(2400);
      await shot(p, 'chat-hinglish');
    },
  },
  { caption: 'It reads the page and explains it', say: 'It reads the page, so it can explain what is here.', minMs: 3600, run: async (p) => { await ask(p, "what's on this page?"); await wait(3000); await shot(p, 'explain'); } },
  {
    caption: 'It finds things and points at them',
    say: 'And it can find things, and point right at them.',
    minMs: 3600,
    run: async (p) => {
      await ask(p, 'where is the sort menu?');
      await wait(2400);
      await wisp(p, `w.guide.dispatch({ type: 'chat-close' });`);
      await wait(900);
      await shot(p, 'point');
    },
  },
  {
    caption: 'It does things for you, step by step, with a Stop button',
    say: 'Ask it to do something, and it does it step by step, with a stop button. It always asks before anything final, like paying.',
    minMs: 6500,
    run: async (p) => {
      await wisp(p, `w.run('search red dress under ₹2000 and sort by price');`);
      await wait(2200);
      await shot(p, 'action');
    },
  },
  {
    caption: 'It reacts to your app: plain-English fixes for errors',
    say: 'When something goes wrong, it explains the fix in plain words.',
    minMs: 3600,
    run: async (p) => {
      await p.evaluate(() => window.dispatchEvent(new CustomEvent('wisp:error', { detail: { code: 'card_declined' } })));
      await wait(3000);
      await shot(p, 'error');
      await wisp(p, `w.guide.dispatch({ type: 'dismiss' });`);
    },
  },
  {
    caption: '…and celebrates when things go right',
    say: 'And it celebrates when things go right.',
    minMs: 2800,
    run: async (p) => {
      await p.evaluate(() => window.dispatchEvent(new CustomEvent('wisp:success', { detail: { line: 'Order placed! It reaches you in 3 to 5 days.' } })));
    },
  },
  {
    caption: 'Shop by voice, in many Indian languages',
    say: 'It can even shop by voice, in many Indian languages. Say, pyaaz dikhaao, and it searches the store for onion, reads the results, and adds the first one to your cart.',
    minMs: 9000,
    run: async (p) => {
      await p.goto(new globalThis.URL('/grocery.html?mode=screen', URL).href, { waitUntil: 'load' });
      await caption(p, 'Shop by voice, in many Indian languages');
      await wait(1200);
      await ask(p, 'pyaaz dikhao');
      await wait(2600);
      await ask(p, 'pehla wala daal do');
      await wait(2000);
      await shot(p, 'grocery-screen-mode');
    },
  },
  {
    caption: '12 moods, any look, with or without AI',
    say: 'Twelve moods, any look you like, and it works with or without A I.',
    minMs: 4000,
    run: async (p) => {
      await p.goto(new globalThis.URL('/moods.html', URL).href, { waitUntil: 'load' });
      await caption(p, '12 moods, any look, with or without AI');
      await wait(1200);
      await shot(p, 'moods');
      await p.evaluate(() => window.scrollBy({ top: 700, behavior: 'smooth' }));
    },
  },
  { caption: 'Add it in one line · github.com/VeloceAI/wisp', say: 'Add it to your product with one line of code. Wisp, by Veloce A I.', minMs: 3600, run: async () => {} },
];

async function main() {
  const clips = await makeClips(SCENES.map((s) => s.say), 'docs/.voice');
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: { width: 1280, height: 760 }, args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  const recorder = await page.screencast({ path: 'docs/.raw-demo.webm' });
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

  muxVideo('docs/.raw-demo.webm', clips, starts, 'docs/wisp-demo.mp4');
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', 'docs/wisp-demo.mp4', '-vf', 'fps=10,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer', 'docs/assets/demo.gif']);
  rmSync('docs/.raw-demo.webm', { force: true });
  rmSync('docs/.voice', { recursive: true, force: true });
  console.log(`video written (${clips.filter((c) => c.file).length} voice lines)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
