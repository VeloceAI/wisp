import type { Guide } from './guide';

/** Unasked-for section tips: one at a time, spaced out, each once, and held back while something else is showing. */
export class TipScheduler {
  private shown = new Set<string>();
  private lastAt = -Infinity;
  private pending: string | null = null;

  constructor(
    private g: Guide,
    private overlayOpen: () => boolean,
    private now: () => number,
  ) {}

  onSection(id: string | null): void {
    const g = this.g;
    this.pending = null;
    g.clearTimer('tip-retry');
    const s = g.getState();
    if (!id || s.hidden) return;
    const tip = g.config.sections?.find((t) => t.id === id);
    if (!tip || this.shown.has(id)) return;
    const now = this.now();
    const wait = (g.config.tipGapMs ?? 8000) - (now - this.lastAt);
    const busy = !!(s.tour || s.chatOpen || s.bubble?.sticky || s.acting || this.overlayOpen());
    if (busy || wait > 0) {
      // Keep the tip for this section and try again once the way is clear.
      this.pending = id;
      g.timer('tip-retry', busy ? 2000 : wait + 50, () => this.pending && this.onSection(this.pending));
      return;
    }
    const regular = g.help() === 'tips';
    const seen = g.memory.get('seenTips');
    if (regular && seen.includes(id) && !tip.advanced) return;
    const text = g.pickLocalized(regular && tip.advanced ? tip.advanced : tip.tip);
    if (!text) return;
    this.shown.add(id);
    this.lastAt = now;
    if (!seen.includes(id)) g.memory.update({ seenTips: [...seen, id] });
    g.say(text, { kind: 'tip', mood: tip.mood, anchor: tip.selector ?? id, thinkMs: regular ? 0 : 600 });
  }
}
