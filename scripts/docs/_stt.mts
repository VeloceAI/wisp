import { KokoroTTS } from 'kokoro-js';
import { pipeline } from '@huggingface/transformers';

const phrases = ['Give me onion.', 'Put the first one in the cart.', 'Two kilo tomato and milk please.', 'Go to my orders page.', 'What is the total?', 'Pyaaz dikhao.'];
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const clips = [];
for (const t of phrases) {
  const a = await tts.generate(t, { voice: 'am_michael' });
  clips.push({ t, audio: resample(a.audio, a.sampling_rate, 16000) });
}
function resample(x, from, to) {
  const out = new Float32Array(Math.round((x.length * to) / from));
  for (let i = 0; i < out.length; i++) {
    const p = (i * from) / to, j = Math.floor(p), f = p - j;
    out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? 0) * f;
  }
  return out;
}
for (const model of ['onnx-community/whisper-tiny', 'onnx-community/whisper-base']) {
  const t0 = Date.now();
  const asr = await pipeline('automatic-speech-recognition', model, { dtype: 'q8' });
  console.log(`\n${model} loaded in ${Date.now() - t0} ms`);
  for (const c of clips) {
    const s = Date.now();
    const r = await asr(c.audio, { language: 'english', task: 'transcribe' });
    console.log(`  "${c.t}" -> "${r.text.trim()}"  (${Date.now() - s} ms)`);
  }
}
