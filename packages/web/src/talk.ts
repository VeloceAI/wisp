import { BUILT_IN_WORD_PACKS, mergePacks, parseShop, type Guide, type ShopWordPack } from '@veloceai/wisp-core';

export interface Talker {
  listen(lang: string): Promise<string>;
  stopListening(): void;
  idle(): Promise<void>;
  stop(): void;
}

const MAX_SILENCES = 2;

/**
 * Talk mode: listen → send → wait for the reply to be spoken → listen again, until the visitor
 * says "done" / "bas", stays quiet twice, or taps the mic again.
 */
export class TalkLoop {
  private running = false;
  private words: ShopWordPack;
  private listeners = new Set<(on: boolean) => void>();

  constructor(
    private guide: Guide,
    private voice: Talker,
    extraWords: Partial<ShopWordPack>[] = [],
  ) {
    this.words = mergePacks([...BUILT_IN_WORD_PACKS, ...extraWords]);
  }

  get active(): boolean {
    return this.running;
  }

  onChange(fn: (on: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  toggle(): void {
    if (this.running) this.stop();
    else void this.start();
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.set(true);
    // Talking means replies are spoken too.
    if (!this.guide.getState().voice) this.guide.dispatch({ type: 'set-voice', on: true });
    this.voice.stop();
    let silences = 0;
    while (this.running) {
      const heard = (await this.voice.listen(this.guide.getState().lang).catch(() => '')).trim();
      if (!this.running) break;
      if (!heard) {
        if (++silences >= MAX_SILENCES) break;
        continue;
      }
      silences = 0;
      const finished = this.isDone(heard);
      await this.send(heard);
      await this.voice.idle();
      if (finished) break;
    }
    this.set(false);
  }

  stop(): void {
    if (!this.running) return;
    this.set(false);
    this.voice.stopListening();
    this.voice.stop();
  }

  private isDone(text: string): boolean {
    const intents = parseShop(text, this.words);
    return intents.length === 1 && intents[0]!.kind === 'done';
  }

  /** Sends what was heard and waits until the guide has answered. */
  private send(text: string): Promise<void> {
    const before = this.guide.getState().messages.length;
    return new Promise((resolve) => {
      let unsub: () => void = () => {};
      const timeout = setTimeout(() => (unsub(), resolve()), 20000);
      unsub = this.guide.subscribe((s) => {
        // The question and "busy" arrive in one update, so "not busy" after it means the answer is in.
        if (s.messages.length > before && !s.busy) {
          clearTimeout(timeout);
          queueMicrotask(() => unsub());
          resolve();
        }
      });
      this.guide.dispatch({ type: 'chat-send', text });
    });
  }

  private set(on: boolean): void {
    this.running = on;
    for (const fn of this.listeners) fn(on);
  }
}
