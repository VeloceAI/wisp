import type { Lang } from '@veloceai/wisp-core';

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

const LOCALES: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', hinglish: 'en-IN' };
const locale = (lang: Lang) => LOCALES[lang] ?? lang;

export interface VoiceOptions {
  mode: 'browser' | 'ai';
  endpoint?: string;
  visitor?: string;
  /** Pre-recorded audio by line id or exact text; played instead of generating speech. */
  clips?: Record<string, string>;
}

/**
 * Speaks and listens. Recorded clips play first; the "ai" mode asks the proxy (whose audio cache
 * makes repeated lines free); anything that fails falls back to the browser's own voice.
 */
export class WebVoice {
  private audio: HTMLAudioElement | null = null;
  private urls = new Map<string, string>();
  private recognition: Recognition | null = null;

  constructor(private opts: VoiceOptions) {}

  get canListen(): boolean {
    return !!speechRecognitionCtor() || (this.opts.mode === 'ai' && !!this.opts.endpoint && typeof MediaRecorder !== 'undefined');
  }

  async speak(text: string, lang: Lang, lineId?: string): Promise<void> {
    this.stop();
    const clip = (lineId && this.opts.clips?.[lineId]) || this.opts.clips?.[text];
    try {
      if (clip) return await this.play(clip);
      if (this.opts.mode === 'ai' && this.opts.endpoint) return await this.play(await this.fetchSpeech(text, lang));
    } catch {
      /* fall back to the built-in voice */
    }
    this.browserSpeak(text, lang);
  }

  stop(): void {
    this.audio?.pause();
    this.audio = null;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /** Listens once and resolves with what was heard ('' if nothing). */
  listen(lang: Lang): Promise<string> {
    const Ctor = speechRecognitionCtor();
    if (Ctor) {
      return new Promise((resolve) => {
        const r = new Ctor();
        this.recognition = r;
        r.lang = locale(lang);
        r.interimResults = false;
        let heard = '';
        r.onresult = (e) => (heard = e.results[0]?.[0]?.transcript ?? '');
        r.onerror = () => resolve('');
        r.onend = () => resolve(heard);
        r.start();
      });
    }
    return this.recordAndTranscribe(lang);
  }

  stopListening(): void {
    this.recognition?.stop();
    this.recorder?.stop();
  }

  private recorder: MediaRecorder | null = null;

  private async recordAndTranscribe(lang: Lang): Promise<string> {
    if (!this.opts.endpoint) return '';
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    this.recorder = rec;
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise<void>((r) => (rec.onstop = () => r()));
    rec.start();
    setTimeout(() => rec.state === 'recording' && rec.stop(), 8000);
    await done;
    stream.getTracks().forEach((t) => t.stop());
    const res = await fetch(`${this.opts.endpoint.replace(/\/$/, '')}/stt?lang=${encodeURIComponent(lang)}`, {
      method: 'POST',
      headers: { 'x-wisp-visitor': this.opts.visitor ?? '' },
      body: new Blob(chunks, { type: rec.mimeType }),
    });
    return res.ok ? String((await res.json()).text ?? '') : '';
  }

  private async fetchSpeech(text: string, lang: Lang): Promise<string> {
    const key = `${lang}|${text}`;
    const cached = this.urls.get(key);
    if (cached) return cached;
    const res = await fetch(`${this.opts.endpoint!.replace(/\/$/, '')}/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-wisp-visitor': this.opts.visitor ?? '' },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const url = URL.createObjectURL(await res.blob());
    this.urls.set(key, url);
    return url;
  }

  private play(src: string): Promise<void> {
    const audio = new Audio(src);
    this.audio = audio;
    return audio.play();
  }

  private browserSpeak(text: string, lang: Lang): void {
    if (typeof speechSynthesis === 'undefined') return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale(lang);
    const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(u.lang.toLowerCase().slice(0, 2)));
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
}

function speechRecognitionCtor(): (new () => Recognition) | null {
  const w = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
