/**
 * Last resort for sites with no Wisp server and browsers without speech recognition: Whisper tiny
 * (~40 MB, downloaded once and cached by the browser) in a background worker. Off unless the site
 * opts in with `voice.offline`.
 */
const DEFAULT_LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

const WORKER = (lib: string) => `
let asr;
self.onmessage = async (e) => {
  try {
    if (!asr) {
      const t = await import(${JSON.stringify(lib)});
      asr = await t.pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', { dtype: 'q8' });
    }
    const out = await asr(e.data.audio, { task: 'transcribe', ...(e.data.language ? { language: e.data.language } : {}) });
    self.postMessage({ id: e.data.id, text: out.text });
  } catch (err) {
    self.postMessage({ id: e.data.id, error: String(err) });
  }
};`;

const LANGUAGES: Record<string, string> = { en: 'english', hi: 'hindi', hinglish: 'hindi', ta: 'tamil', te: 'telugu', bn: 'bengali', mr: 'marathi', gu: 'gujarati', kn: 'kannada', ml: 'malayalam', pa: 'punjabi' };

export class LocalWhisper {
  private worker: Worker | null = null;
  private seq = 0;

  constructor(private lib = DEFAULT_LIB) {}

  transcribe(audio: Float32Array, lang?: string): Promise<string> {
    this.worker ??= new Worker(URL.createObjectURL(new Blob([WORKER(this.lib)], { type: 'text/javascript' })), { type: 'module' });
    const id = ++this.seq;
    const worker = this.worker;
    return new Promise((resolve, reject) => {
      const onMessage = (e: MessageEvent<{ id: number; text?: string; error?: string }>) => {
        if (e.data.id !== id) return;
        worker.removeEventListener('message', onMessage);
        if (e.data.error) reject(new Error(e.data.error));
        else resolve((e.data.text ?? '').trim());
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ id, audio, language: lang ? LANGUAGES[lang] : undefined }, [audio.buffer]);
    });
  }
}
