/** Speech to text without any paid API: open-source Whisper running on the owner's server. */
export type Transcriber = (pcm16k: Float32Array, lang?: string) => Promise<string>;

const MODELS = { tiny: 'onnx-community/whisper-tiny', base: 'onnx-community/whisper-base', small: 'onnx-community/whisper-small' } as const;

// Whisper wants language names; Hinglish is spoken Hindi, written back in Devanagari, which Wisp understands.
const LANGUAGES: Record<string, string> = {
  en: 'english', hi: 'hindi', hinglish: 'hindi', ta: 'tamil', te: 'telugu', bn: 'bengali', mr: 'marathi', gu: 'gujarati',
  kn: 'kannada', ml: 'malayalam', pa: 'punjabi', ur: 'urdu', es: 'spanish', fr: 'french', de: 'german', pt: 'portuguese', ar: 'arabic',
};

/**
 * Loads Whisper once (tiny ≈ 40 MB, base ≈ 80 MB, downloaded on first use and cached) and keeps it in memory.
 * Needs the optional `@huggingface/transformers` package.
 */
export function whisper(model: keyof typeof MODELS = 'base', opts: { preload?: boolean } = {}): Transcriber {
  let asr: Promise<(audio: Float32Array, opts: object) => Promise<{ text: string }>> | null = null;
  const load = () =>
    (asr ??= import('@huggingface/transformers').then(
      (t) => t.pipeline('automatic-speech-recognition', MODELS[model], { dtype: 'q8' }) as unknown as (audio: Float32Array, opts: object) => Promise<{ text: string }>,
    ));
  // Loading takes 10-40 s the first time; preload so the first visitor doesn't wait.
  if (opts.preload) void load().catch(() => (asr = null));
  return async (pcm, lang) => {
    const run = await load();
    const language = lang ? LANGUAGES[lang] : undefined;
    const out = await run(pcm, { task: 'transcribe', ...(language ? { language } : {}) });
    return out.text.trim();
  };
}

/** Little-endian 16-bit PCM (what the browser sends) to the floats Whisper expects. */
export function pcm16ToFloat(buf: ArrayBuffer): Float32Array {
  const ints = new Int16Array(buf, 0, Math.floor(buf.byteLength / 2));
  const out = new Float32Array(ints.length);
  for (let i = 0; i < ints.length; i++) out[i] = ints[i]! / 32768;
  return out;
}

/** Wraps raw 16 kHz PCM as a WAV file, for AI providers that take audio files. */
export function pcmToWav(buf: ArrayBuffer, rate = 16000): Blob {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + buf.byteLength, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, buf.byteLength, true);
  return new Blob([header, buf], { type: 'audio/wav' });
}
