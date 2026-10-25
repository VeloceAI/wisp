// Records the demo shop walkthrough and key screenshots: npm run demo (in one terminal), then npm run docs:video
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';

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
      const input = document.querySelector('[data-wisp-host]')!.shadowRoot!.querySelector('.chat input') as HTMLInputElement;
      input.value = t;
    }, text.slice(0, i));
    await wait(35);
  }
  await page.evaluate(() => {
    const form = document.querySelector('[data-wisp-host]')!.shadowRoot!.querySelector('.chat form') as HTMLFormElement;
    (form.querySelector('input') as HTMLInputElement).value = (form.querySelector('input') as HTMLInputElement).value;
    form.requestSubmit();
  });
}

const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` as `${string}.png` });

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: { width: 1280, height: 760 }, args: ['--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  const recorder = await page.screencast({ path: 'docs/.raw-demo.webm' });
  await caption(page, 'Meet Wisp: a living guide for any website');
  await wait(3200);
  await shot(page, 'welcome');

  await caption(page, 'It runs a tour for new visitors');
  await wisp(page, `w.guide.dispatch({ type: 'button', value: 'tour:start' });`);
  await wait(2600);
  await shot(page, 'tour');
  await wisp(page, `w.guide.dispatch({ type: 'button', value: 'tour:next' });`);
  await wait(2400);
  await wisp(page, `w.guide.dispatch({ type: 'button', value: 'tour:end' });`);
  await wait(1800);

  await caption(page, 'It gives a short tip beside what you are reading');
  await page.evaluate(() => window.scrollTo({ top: document.getElementById('shop')!.offsetTop - 60, behavior: 'smooth' }));
  await wait(4500);
  await shot(page, 'tip');

  await caption(page, 'Ask anything, in English, Hindi or Hinglish');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await ask(page, 'delivery kitne din mein hogi?');
  await wait(2600);
  await shot(page, 'chat-hinglish');

  await caption(page, 'It reads the page and explains it');
  await ask(page, "what's on this page?");
  await wait(3200);
  await shot(page, 'explain');

  await caption(page, 'It finds things and points at them');
  await ask(page, 'where is the sort menu?');
  await wait(2600);
  await wisp(page, `w.guide.dispatch({ type: 'chat-close' });`);
  await wait(1200);
  await shot(page, 'point');

  await caption(page, 'It does things for you, step by step, with a Stop button');
  await wisp(page, `w.run('search red dress under ₹2000 and sort by price');`);
  await wait(2300);
  await shot(page, 'action');
  await wait(4200);

  await caption(page, 'It reacts to your app: plain-English fixes for errors');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('wisp:error', { detail: { code: 'card_declined' } })));
  await wait(3200);
  await shot(page, 'error');
  await wisp(page, `w.guide.dispatch({ type: 'dismiss' });`);
  await caption(page, '...and celebrates when things go right');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('wisp:success', { detail: { line: 'Order placed! It reaches you in 3 to 5 days.' } })));
  await wait(3000);

  await caption(page, '12 moods, any look, one line to add');
  await page.goto(new globalThis.URL('/moods.html', URL).href, { waitUntil: 'load' });
  await caption(page, '12 moods, any look, one line to add');
  await wait(1500);
  await shot(page, 'moods');
  await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'smooth' }));
  await wait(2500);
  await caption(page, 'github.com/VeloceAI/wisp');
  await wait(2200);
  await recorder.stop();

  // Phone view.
  const phone = await browser.newPage();
  await phone.emulate({ viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' });
  await phone.goto(URL, { waitUntil: 'load' });
  await phone.evaluate(() => localStorage.clear());
  await phone.reload({ waitUntil: 'load' });
  await wait(2500);
  await phone.screenshot({ path: `${SHOTS}/phone.png` });
  await browser.close();

  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', 'docs/.raw-demo.webm', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', '-vf', 'scale=1280:-2', 'docs/wisp-demo.mp4']);
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', 'docs/wisp-demo.mp4', '-vf', 'fps=10,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer', 'docs/assets/demo.gif']);
  rmSync('docs/.raw-demo.webm', { force: true });
  console.log('video and screenshots written');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
