// Feeds a spoken clip into Chrome's microphone and checks the whole chain: record → stop on silence →
// Wisp server (open-source Whisper) → shopping assistant. Run with the demo up: npm run check:mic
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { KokoroTTS } from 'kokoro-js';
import puppeteer from 'puppeteer-core';

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
await (await tts.generate('Give me onion.', { voice: 'am_michael' })).save('docs/.build/mic-raw.wav');
// A pause before and after, like a real person.
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', 'docs/.build/mic-raw.wav', '-af', 'adelay=800|800,apad=pad_dur=3', '-ar', '48000', '-ac', '1', 'docs/.build/mic.wav']);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${resolve('docs/.build/mic.wav')}%noloop`, '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto(process.env.DEMO_URL ?? 'http://localhost:5180/grocery.html?mode=screen', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 1500));
page.on('response', async (r) => {
  if (r.url().includes('/wisp/stt')) console.log(`server transcript (before page-aware correction): ${await r.text()}`);
});
const t0 = Date.now();
const result = await page.evaluate(async () => {
  const w = (window as any).wisp;
  w.guide.dispatch({ type: 'chat-open' });
  // One listening turn, the same path the mic button uses.
  const heard = await w.listen();
  if (heard) await w.guide.ask(heard);
  return { heard, reply: w.guide.getState().messages.at(-1)?.text, box: (document.querySelector('#site-search input') as HTMLInputElement)?.value };
});
console.log(`heard: "${result.heard}"\nreply: ${result.reply}\nstore search box: "${result.box}"\n(${Date.now() - t0} ms incl. first model load)`);
await browser.close();
