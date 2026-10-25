import type { Lang } from '@veloceai/wisp-core';
import { Listener, speechLocale as locale, type ListenerOptions } from './listen/listener';

export interface VoiceOptions {
  mode: 'browser' | 'ai';
  endpoint?: string;
  visitor?: string;
  /** Pre-recorded audio by line id or exact text; played instead of generating speech. */
  clips?: Record<string, string>;
  listen?: ListenerOptions;
}

/**
 * Speaks and listens. Recorded clips play first; the "ai" mode asks the proxy (whose audio cache
 * makes repeated lines free); anything that fails falls back to the browser's own voice.
 */
export class WebVoice {
  private audio: HTMLAudioElement | null = null;
  private urls = new Map<string, string>();
  private listener: Listener;

  constructor(private opts: VoiceOptions) {
    this.listener = new Listener({ endpoint: opts.endpoint, visitor: opts.visitor, ...opts.listen });
  }

  get canListen(): boolean {
    return this.listener.available;
  }

  private current: Promise<void> = Promise.resolve();

  /** Resolves when the line has finished playing (or was stopped). */
  speak(text: string, lang: Lang, lineId?: string): Promise<void> {
    this.stop();
    this.current = this.say(text, lang, lineId);
    return this.current;
  }

  /** Resolves once nothing is being said. */
  idle(): Promise<void> {
    return this.current;
  }

  private async say(text: string, lang: Lang, lineId?: string): Promise<void> {
    const clip = (lineId && this.opts.clips?.[lineId]) || this.opts.clips?.[text];
    try {
      if (clip) return await this.play(clip);
      if (this.opts.mode === 'ai' && this.opts.endpoint) return await this.play(await this.fetchSpeech(text, lang));
    } catch {
      /* fall back to the built-in voice */
    }
    return this.browserSpeak(text, lang);
  }

  stop(): void {
    this.audio?.pause();
    this.audio = null;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  /** Listens once and resolves with what was heard ('' if nothing), on any browser or device. */
  listen(lang: Lang): Promise<string> {
    return this.listener.listen(lang).catch(() => '');
  }

  stopListening(): void {
    this.listener.stop();
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

  private async play(src: string): Promise<void> {
    const audio = new Audio(src);
    this.audio = audio;
    const ended = new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onpause = () => resolve();
    });
    await audio.play();
    await ended;
  }

  private browserSpeak(text: string, lang: Lang): Promise<void> {
    if (typeof speechSynthesis === 'undefined') return Promise.resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale(lang);
    const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(u.lang.toLowerCase().slice(0, 2)));
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 1.15;
    return new Promise((resolve) => {
      // Some browsers never fire onend; don't wait forever.
      const t = setTimeout(resolve, 2000 + text.length * 90);
      u.onend = u.onerror = () => {
        clearTimeout(t);
        resolve();
      };
      speechSynthesis.speak(u);
    });
  }
}
