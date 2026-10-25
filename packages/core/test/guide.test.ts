import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Guide, InMemoryStore, type Cue, type GuideConfig } from '../src/index';

const config: GuideConfig = {
  siteId: 'test',
  tour: [
    { target: '#search', text: 'Search here.' },
    { target: '#cart', text: { en: 'Your cart.', hi: 'आपकी कार्ट।' } },
  ],
  sections: [{ id: 'pricing', tip: 'Plans start free.', advanced: 'Tip: yearly saves 20%.' }],
  errors: [{ match: 'card_declined', fix: 'Your card was declined. Try UPI instead.' }],
  reactions: { 'cart-add': { mood: 'happy', line: 'Nice pick!' } },
  faq: [{ id: 'ship', q: 'How long is delivery?', a: '3 to 5 days.' }],
};

function make(cfg: GuideConfig = config, store = new InMemoryStore()) {
  const cues: Cue[] = [];
  const g = new Guide(cfg, { store, random: () => 0 });
  g.onCue((c) => cues.push(c));
  return { g, cues, store };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Guide', () => {
  it('welcomes a first visitor and offers the tour', () => {
    const { g } = make();
    g.dispatch({ type: 'start' });
    expect(g.getState().mood).toBe('waking');
    vi.advanceTimersByTime(1100);
    const b = g.getState().bubble!;
    expect(b.kind).toBe('welcome');
    expect(b.text).toContain('Wisp');
    expect(b.buttons.map((x) => x.value)).toEqual(['tour:start', 'dismiss']);
  });

  it('runs the tour step by step and remembers it', () => {
    const { g, store } = make();
    g.dispatch({ type: 'start' });
    g.dispatch({ type: 'button', value: 'tour:start' });
    expect(g.getState().highlight).toBe('#search');
    expect(g.getState().anchor).toBe('#search');
    g.dispatch({ type: 'button', value: 'tour:next' });
    expect(g.getState().tour).toEqual({ index: 1, total: 2 });
    expect(g.getState().bubble?.buttons.at(-1)?.label).toBe('Done');
    g.dispatch({ type: 'button', value: 'tour:next' });
    expect(g.getState().tour).toBeNull();
    expect(g.getState().mood).toBe('celebrate');
    expect(new Guide(config, { store }).memory.get('tourDone')).toBe(true);
  });

  it('offers to resume an unfinished tour on the next visit', () => {
    const store = new InMemoryStore();
    const first = make(config, store).g;
    first.dispatch({ type: 'start' });
    first.dispatch({ type: 'button', value: 'tour:start' });
    first.dispatch({ type: 'button', value: 'tour:next' });
    const { g } = make(config, store);
    g.dispatch({ type: 'start' });
    vi.advanceTimersByTime(1100);
    expect(g.getState().bubble?.buttons[0]?.value).toBe('tour:resume');
  });

  it('turns an error into a plain-English fix', () => {
    const { g, cues } = make();
    g.dispatch({ type: 'app', name: 'error', detail: { code: 'card_declined' } });
    expect(g.getState().mood).toBe('confused');
    expect(g.getState().bubble?.text).toBe('Your card was declined. Try UPI instead.');
    expect(cues.some((c) => c.type === 'track' && c.event.kind === 'error')).toBe(true);
  });

  it('celebrates success, thinks while loading, and reacts to custom events', () => {
    const { g } = make();
    g.dispatch({ type: 'app', name: 'success' });
    expect(g.getState().mood).toBe('celebrate');
    vi.advanceTimersByTime(7000);
    g.dispatch({ type: 'app', name: 'loading' });
    expect(g.getState().mood).toBe('thinking');
    g.dispatch({ type: 'app', name: 'loaded' });
    expect(g.getState().mood).toBe('idle');
    g.dispatch({ type: 'app', name: 'cart-add' });
    expect(g.getState().bubble?.text).toBe('Nice pick!');
  });

  it('gets sleepy, falls asleep, and wakes on activity', () => {
    const { g } = make({ ...config, idle: { sleepyAfterMs: 1000, sleepAfterMs: 2000 }, welcome: false });
    g.dispatch({ type: 'start' });
    vi.advanceTimersByTime(1100);
    expect(g.getState().mood).toBe('sleepy');
    vi.advanceTimersByTime(1000);
    expect(g.getState().mood).toBe('sleeping');
    g.dispatch({ type: 'activity' });
    expect(g.getState().mood).toBe('waking');
    vi.advanceTimersByTime(950);
    expect(g.getState().mood).toBe('idle');
  });

  it('giggles and opens chat when tapped; three taps make it shy', () => {
    const { g, cues } = make();
    g.dispatch({ type: 'tap' });
    expect(g.getState().chatOpen).toBe(true);
    expect(g.getState().mood).toBe('happy');
    expect(cues.some((c) => c.type === 'impulse' && c.kind === 'squish')).toBe(true);
    g.dispatch({ type: 'tap' });
    g.dispatch({ type: 'tap' });
    expect(g.getState().mood).toBe('shy');
  });

  it('shows a section tip once, beside the section, after a thinking pose', () => {
    const { g } = make();
    g.dispatch({ type: 'section', id: 'pricing' });
    expect(g.getState().mood).toBe('thinking');
    expect(g.getState().anchor).toBe('pricing');
    vi.advanceTimersByTime(700);
    expect(g.getState().bubble?.text).toBe('Plans start free.');
    vi.advanceTimersByTime(20000);
    g.dispatch({ type: 'section', id: 'pricing' });
    expect(g.getState().bubble).toBeNull();
  });

  it('gives regulars the advanced tip straight away', () => {
    const { g } = make();
    g.dispatch({ type: 'set-help', level: 'tips' });
    g.dispatch({ type: 'section', id: 'pricing' });
    expect(g.getState().bubble?.text).toBe('Tip: yearly saves 20%.');
  });

  it('answers chat and tracks the question', async () => {
    const { g, cues } = make();
    await g.ask('how long is delivery');
    const last = g.getState().messages.at(-1)!;
    expect(last.text).toBe('3 to 5 days.');
    expect(cues.find((c) => c.type === 'track' && c.event.kind === 'question')).toBeTruthy();
  });

  it('switches to the visitor’s language from what they type', async () => {
    const { g } = make();
    await g.ask('delivery kitne din mein hogi');
    expect(g.getState().lang).toBe('hinglish');
  });

  it('remembers being hidden', () => {
    const store = new InMemoryStore();
    make(config, store).g.dispatch({ type: 'hide' });
    expect(make(config, store).g.getState().hidden).toBe(true);
  });

  it('nudges once when a new visitor is leaving', () => {
    const { g } = make();
    g.dispatch({ type: 'leave-intent' });
    expect(g.getState().bubble?.kind).toBe('nudge');
    g.dispatch({ type: 'dismiss' });
    g.dispatch({ type: 'leave-intent' });
    expect(g.getState().bubble).toBeNull();
  });
});
