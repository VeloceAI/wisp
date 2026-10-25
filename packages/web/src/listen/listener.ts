import { correctTranscript, type Lang, type Vocabulary } from '@veloceai/wisp-core';
import { LocalWhisper } from './local-whisper';
import { recordSpeech, toPcm16 } from './record';

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

// Indian English handles Hinglish best in browser recognisers; other codes pass through (e.g. "fr" → French).
const LOCALES: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', hinglish: 'en-IN', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN',
  kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-IN', or: 'or-IN', as: 'as-IN',
};

/**
 * - `server`: record in any browser, the owner's Wisp server transcribes (open-source Whisper, free).
 * - `device`: the browser's own recogniser (Chrome, Edge, Safari).
 * - `offline`: Whisper tiny in the browser (~40 MB once), for sites without a server.
 * - `auto` (default): server if the proxy can listen, else device, else offline if allowed.
 */
export const speechLocale = (lang: Lang) => LOCALES[lang] ?? lang;

export type ListenMode = 'auto' | 'server' | 'device' | 'offline';

export interface ListenerOptions {
  mode?: ListenMode;
  endpoint?: string;
  visitor?: string;
  offline?: boolean;
  /** Product and page words for fixing slightly misheard words. */
  vocabulary?: () => Vocabulary;
}

export class Listener {
  private recognition: Recognition | null = null;
  private abort: AbortController | null = null;
  private serverCanListen: Promise<boolean> | null = null;
  private local: LocalWhisper | null = null;

  constructor(private opts: ListenerOptions) {}

  /** True when some way of listening exists on this device; the mic button shows only then. */
  get available(): boolean {
    const record = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    return !!recognitionCtor() || (record && (!!this.opts.endpoint || !!this.opts.offline));
  }

  async listen(lang: Lang): Promise<string> {
    const mode = await this.pick();
    let text = '';
    if (mode === 'device') text = await this.device(lang);
    else {
      this.abort = new AbortController();
      const audio = await recordSpeech({ signal: this.abort.signal });
      if (!audio) return '';
      text = mode === 'server' ? await this.server(audio, lang) : await (this.local ??= new LocalWhisper()).transcribe(audio, lang);
    }
    const vocab = this.opts.vocabulary?.();
    return vocab ? correctTranscript(text, vocab) : text;
  }

  stop(): void {
    this.recognition?.stop();
    this.abort?.abort();
  }

  private async pick(): Promise<Exclude<ListenMode, 'auto'>> {
    const mode = this.opts.mode ?? 'auto';
    if (mode !== 'auto') return mode;
    if (this.opts.endpoint && (await this.checkServer())) return 'server';
    if (recognitionCtor()) return 'device';
    if (this.opts.offline) return 'offline';
    return 'server';
  }

  private checkServer(): Promise<boolean> {
    this.serverCanListen ??= fetch(`${this.base()}/health`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((h: { listen?: boolean }) => !!h.listen)
      .catch(() => false);
    return this.serverCanListen;
  }

  private async server(audio: Float32Array, lang: Lang): Promise<string> {
    const res = await fetch(`${this.base()}/stt?lang=${encodeURIComponent(lang)}`, {
      method: 'POST',
      headers: { 'content-type': 'audio/pcm;rate=16000', 'x-wisp-visitor': this.opts.visitor ?? '' },
      body: toPcm16(audio),
    });
    return res.ok ? String(((await res.json()) as { text?: string }).text ?? '') : '';
  }

  private device(lang: Lang): Promise<string> {
    const Ctor = recognitionCtor()!;
    return new Promise((resolve) => {
      const r = new Ctor();
      this.recognition = r;
      r.lang = speechLocale(lang);
      r.interimResults = false;
      let heard = '';
      r.onresult = (e) => (heard = e.results[0]?.[0]?.transcript ?? '');
      r.onerror = () => resolve('');
      r.onend = () => resolve(heard);
      r.start();
    });
  }

  private base(): string {
    return (this.opts.endpoint ?? '').replace(/\/$/, '');
  }
}

function recognitionCtor(): (new () => Recognition) | null {
  const w = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
