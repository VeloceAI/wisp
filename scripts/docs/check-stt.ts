// End-to-end speech check with no microphone and no paid API: Kokoro speaks each phrase, the audio goes to the
// Wisp server exactly as a browser sends it (16 kHz PCM), open-source Whisper transcribes it, and the
// page-aware correction tidies it. Run: npm run check:stt  (WISP_STT_MODEL=tiny|base|small)
import { KokoroTTS } from 'kokoro-js';
import { baseVocabulary, correctTranscript, mockProvider, parseShop, mergePacks, BUILT_IN_WORD_PACKS, parseNav } from '../../packages/core/src/index';
import { createWispHandler } from '../../packages/proxy/src/handler';
import { whisper } from '../../packages/proxy/src/local-stt';

const PHRASES = [
  'Give me onion.',
  'Put the first one in the cart.',
  'Two kilo tomato and milk please.',
  'Show me the cheapest chips.',
  'Make it three.',
  'What is the total?',
  'Go to my orders page.',
  'Go back.',
];
const model = (process.env.WISP_STT_MODEL ?? 'base') as 'tiny' | 'base' | 'small';

function resample(x: Float32Array, from: number, to: number): Float32Array {
  const out = new Float32Array(Math.round((x.length * to) / from));
  for (let i = 0; i < out.length; i++) {
    const p = (i * from) / to;
    const j = Math.floor(p);
    const f = p - j;
    out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? 0) * f;
  }
  return out;
}
const toPcm16 = (s: Float32Array) => Int16Array.from(s, (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32767)))).buffer;

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const handler = createWispHandler({ provider: mockProvider(), voice: { enabled: true, listen: whisper(model) } });
const vocab = baseVocabulary();
const words = mergePacks(BUILT_IN_WORD_PACKS);
let understood = 0;
console.log(`Whisper ${model}, voices am_michael and af_bella\n`);
for (const [i, phrase] of PHRASES.entries()) {
  const a = await tts.generate(phrase, { voice: i % 2 ? 'af_bella' : 'am_michael' });
  const t0 = Date.now();
  const res = await handler(
    new Request('http://local/wisp/stt?lang=en', { method: 'POST', headers: { 'content-type': 'audio/pcm;rate=16000' }, body: toPcm16(resample(a.audio, a.sampling_rate, 16000)) }),
  );
  const { text = '' } = (await res.json()) as { text?: string };
  const fixed = correctTranscript(text, vocab);
  const ok = parseShop(fixed, words).length > 0 || parseNav(fixed) !== null;
  understood += ok ? 1 : 0;
  console.log(`${ok ? '✓' : '✗'} said "${phrase}"\n    heard "${text}"${fixed !== text ? ` → "${fixed}"` : ''}  (${Date.now() - t0} ms)`);
}
console.log(`\n${understood}/${PHRASES.length} understood as commands`);
