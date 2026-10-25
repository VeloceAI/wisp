import { defineCharacter, sampleCharacters, type CharacterDefinition } from '../character/definition';
import type { Mood } from '../character/moods';
import { FaqChat, type Answerer, type ChatAnswer } from '../chat/faq-chat';
import { GuideMemory, InMemoryStore, type KeyValueStore } from '../memory/memory';
import type { Button, GuideConfig, HelpLevel } from './config';
import { detectLang, langFromLocale, localize, type Localized } from './lang';
import { Lines, toLineSet, uiText, type UiStringKey } from './lines';
import { TourRunner } from './tour';
import {
  realScheduler,
  type AppEventDetail,
  type Bubble,
  type BubbleKind,
  type Cue,
  type GuideEvent,
  type GuideState,
  type Scheduler,
  type TrackEvent,
} from './types';

export interface GuideDeps {
  store?: KeyValueStore;
  scheduler?: Scheduler;
  random?: () => number;
  /** Browser or OS locale, used when the language is "auto". */
  hostLocale?: string;
  /** Replaces the keyword FAQ chat, e.g. with an AI answerer that falls back to it. */
  answerer?: Answerer;
}

export interface SayOptions {
  mood?: Mood;
  kind?: BubbleKind;
  buttons?: Button[];
  sticky?: boolean;
  title?: string;
  anchor?: string | null;
  /** Show the thinking pose this long before the line appears. */
  thinkMs?: number;
  lineId?: string;
}

type Listener = (s: GuideState) => void;
type CueListener = (c: Cue) => void;

const TAP_WINDOW_MS = 2000;

export class Guide {
  readonly character: CharacterDefinition;
  readonly config: GuideConfig;
  readonly memory: GuideMemory;
  readonly lines: Lines;
  readonly faq: FaqChat;
  private answerer: Answerer;
  private sched: Scheduler;
  private state: GuideState;
  private listeners = new Set<Listener>();
  private cueListeners = new Set<CueListener>();
  private timers = new Map<string, unknown>();
  private baseMood: Mood = 'idle';
  private tempMood: Mood | null = null;
  private bubbleSeq = 0;
  private taps: number[] = [];
  private lastTipAt = -Infinity;
  private shownTips = new Set<string>();
  private loading = false;
  private nudged = false;
  private started = false;
  private tour: TourRunner;
  private random: () => number;

  constructor(config: GuideConfig = {}, deps: GuideDeps = {}) {
    this.config = config;
    const charInput = typeof config.character === 'string' ? sampleCharacters[config.character] : config.character;
    this.character = defineCharacter(charInput);
    this.sched = deps.scheduler ?? realScheduler;
    this.random = deps.random ?? Math.random;
    this.memory = new GuideMemory(deps.store ?? new InMemoryStore(), config.siteId);
    this.lines = new Lines(config.lines, deps.random);
    this.faq = new FaqChat(config.faq ?? [], config.content ?? [], this.lines);
    this.answerer = deps.answerer ?? this.faq;
    const lang =
      this.memory.get('lang') ??
      (config.language && config.language !== 'auto' ? config.language : langFromLocale(deps.hostLocale));
    this.state = {
      name: this.character.name,
      mood: 'idle',
      speaking: false,
      bubble: null,
      anchor: null,
      highlight: null,
      hidden: this.memory.get('hidden'),
      chatOpen: false,
      messages: [],
      busy: false,
      lang,
      helpLevel: this.memory.get('helpLevel'),
      tour: null,
    };
    this.tour = new TourRunner(this, config.tour ?? []);
  }

  getState(): GuideState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  onCue(fn: CueListener): () => void {
    this.cueListeners.add(fn);
    return () => this.cueListeners.delete(fn);
  }

  setAnswerer(answerer: Answerer): void {
    this.answerer = answerer;
  }

  /** Effective help style: "lots" (step by step) or "tips" (short, advanced). */
  help(): Exclude<HelpLevel, 'auto'> {
    return this.memory.effectiveHelp();
  }

  t(key: UiStringKey): string {
    return uiText(key, this.state.lang, this.config.ui);
  }

  line(id: string, vars: Record<string, string | number> = {}): string {
    return this.lines.pick(id, this.state.lang, { name: this.character.name, ...vars });
  }

  // ---- internal plumbing used by the tour runner too ----

  patch(p: Partial<GuideState>): void {
    this.state = { ...this.state, ...p };
    for (const fn of this.listeners) fn(this.state);
  }

  cue(c: Cue): void {
    for (const fn of this.cueListeners) fn(c);
  }

  track(event: TrackEvent): void {
    this.cue({ type: 'track', event });
  }

  timer(key: string, ms: number, fn: () => void): void {
    this.clearTimer(key);
    this.timers.set(key, this.sched.setTimeout(() => {
      this.timers.delete(key);
      fn();
    }, ms));
  }

  clearTimer(key: string): void {
    const h = this.timers.get(key);
    if (h !== undefined) this.sched.clearTimeout(h);
    this.timers.delete(key);
  }

  moveTo(anchor: string | null): void {
    if (anchor === this.state.anchor) return;
    this.patch({ anchor });
    this.cue({ type: 'impulse', kind: 'hop' });
  }

  private refreshMood(): void {
    const mood = this.tempMood ?? (this.loading ? 'thinking' : this.baseMood);
    if (mood !== this.state.mood) this.patch({ mood });
  }

  /** Show a mood for a while, then fall back to the resting mood. */
  feel(mood: Mood, ms = 1500): void {
    this.tempMood = mood;
    this.refreshMood();
    this.timer('mood', ms, () => {
      this.tempMood = null;
      this.refreshMood();
    });
  }

  say(text: string, opts: SayOptions = {}): void {
    if (!text || this.state.hidden) return;
    const show = () => {
      const bubble: Bubble = {
        id: ++this.bubbleSeq,
        kind: opts.kind ?? 'line',
        text,
        title: opts.title,
        buttons: opts.buttons ?? [],
        sticky: opts.sticky ?? (opts.buttons?.length ?? 0) > 0,
      };
      const talkMs = Math.min(6000, Math.max(1200, text.length * 55));
      this.patch({ bubble, speaking: true });
      this.feel(opts.mood ?? 'talking', talkMs);
      this.cue({ type: 'speak', text, lineId: opts.lineId });
      this.timer('speaking', talkMs, () => this.patch({ speaking: false }));
      if (!bubble.sticky) this.timer('bubble', talkMs + 2500, () => this.dismissBubble(bubble.id));
      else this.clearTimer('bubble');
    };
    if (opts.anchor !== undefined) this.moveTo(opts.anchor);
    if (opts.thinkMs) {
      this.feel('thinking', opts.thinkMs + 100);
      this.timer('think', opts.thinkMs, show);
    } else show();
  }

  sayLine(id: string, opts: SayOptions = {}, vars?: Record<string, string | number>): void {
    this.say(this.line(id, vars), { lineId: id, ...opts });
  }

  dismissBubble(id?: number): void {
    if (!this.state.bubble || (id !== undefined && this.state.bubble.id !== id)) return;
    this.patch({ bubble: null });
    if (!this.state.tour) this.moveTo(null);
  }

  dispatch(e: GuideEvent): void {
    switch (e.type) {
      case 'start':
        return this.start();
      case 'tap':
        return this.onTap();
      case 'activity':
        return this.onActivity();
      case 'section':
        return this.onSection(e.id);
      case 'app':
        return this.onApp(e.name, e.detail);
      case 'leave-intent':
        return this.onLeave();
      case 'button':
        return this.onButton(e.value);
      case 'chat-open':
        return this.openChat();
      case 'chat-close':
        return this.patch({ chatOpen: false });
      case 'chat-send':
        void this.ask(e.text);
        return;
      case 'hide':
        this.memory.update({ hidden: true });
        this.patch({ hidden: true, chatOpen: false, bubble: null, highlight: null });
        return;
      case 'show':
        this.memory.update({ hidden: false });
        this.patch({ hidden: false });
        this.feel('happy', 1200);
        return;
      case 'set-help':
        this.memory.update({ helpLevel: e.level });
        this.patch({ helpLevel: e.level });
        return;
      case 'set-lang':
        this.memory.update({ lang: e.lang });
        this.patch({ lang: e.lang });
        return;
      case 'dismiss':
        return this.dismissBubble();
    }
  }

  destroy(): void {
    for (const key of [...this.timers.keys()]) this.clearTimer(key);
    this.listeners.clear();
    this.cueListeners.clear();
  }

  private start(): void {
    if (this.started) return;
    this.started = true;
    this.memory.recordVisit(this.sched.now());
    this.resetIdle();
    if (this.state.hidden || this.config.welcome === false) return;
    const visits = this.memory.get('visits');
    this.feel('waking', 900);
    this.timer('welcome', 1000, () => {
      if (this.tour.canResume()) {
        this.sayLine('welcome.resume', { kind: 'welcome', mood: 'happy', buttons: [
          { label: this.t('resume'), value: 'tour:resume', primary: true },
          { label: this.t('notNow'), value: 'dismiss' },
        ] });
      } else if (visits <= 1) {
        const buttons: Button[] = this.tour.length
          ? [{ label: this.t('tourStart'), value: 'tour:start', primary: true }, { label: this.t('notNow'), value: 'dismiss' }]
          : [];
        this.sayLine('welcome.first', { kind: 'welcome', mood: 'happy', buttons });
      } else {
        this.sayLine('welcome.back', { kind: 'welcome', mood: 'happy' });
      }
    });
  }

  private onTap(): void {
    const now = this.sched.now();
    this.taps = [...this.taps.filter((t) => now - t < TAP_WINDOW_MS), now];
    this.cue({ type: 'impulse', kind: 'squish' });
    const wasAsleep = this.baseMood === 'sleeping' || this.baseMood === 'sleepy';
    this.resetIdle();
    if (wasAsleep) {
      this.feel('waking', 900);
      this.timer('wake-line', 900, () => this.sayLine('wake', { mood: 'happy' }));
      return;
    }
    if (this.taps.length >= 3) {
      this.taps = [];
      this.sayLine('giggle.many', { mood: 'shy' });
      return;
    }
    this.feel('happy', 1100);
    if (this.state.chatOpen) this.patch({ chatOpen: false });
    else this.openChat();
  }

  private openChat(): void {
    this.resetIdle();
    if (this.state.hidden) this.dispatch({ type: 'show' });
    const messages = this.state.messages.length
      ? this.state.messages
      : [{ from: 'guide' as const, text: this.line('chat.hello'), buttons: this.faq.suggestions(this.state.lang) }];
    this.patch({ chatOpen: true, messages, bubble: this.state.bubble?.sticky ? this.state.bubble : null });
  }

  async ask(text: string): Promise<void> {
    const question = text.trim().slice(0, 500);
    if (!question || this.state.busy) return;
    this.resetIdle();
    if (!this.memory.get('lang') && question.split(/\s+/).length >= 2) {
      const detected = detectLang(question, this.state.lang);
      if (detected !== this.state.lang) this.patch({ lang: detected });
    }
    this.patch({ chatOpen: true, busy: true, messages: [...this.state.messages, { from: 'user', text: question }] });
    this.feel('thinking', 20000);
    let answer: ChatAnswer;
    try {
      answer = await this.answerer.answer(question, this.state.lang);
    } catch {
      answer = await this.faq.answer(question, this.state.lang);
    }
    this.memory.update({ questions: this.memory.get('questions') + 1 });
    this.track({ kind: 'question', text: question, answered: answer.matched, lang: this.state.lang, source: answer.source });
    this.reply(answer);
  }

  private reply(answer: ChatAnswer): void {
    this.patch({ busy: false, messages: [...this.state.messages, { from: 'guide', text: answer.text, buttons: answer.buttons }] });
    this.cue({ type: 'speak', text: answer.text });
    this.feel(answer.matched ? 'talking' : 'confused', answer.matched ? 2200 : 1800);
  }

  private onButton(value: string): void {
    this.resetIdle();
    if (value === 'dismiss') return this.dismissBubble();
    if (value === 'chat:open') return this.openChat();
    if (value.startsWith('tour:')) return this.tour.handle(value.slice(5));
    if (value.startsWith('link:')) return this.cue({ type: 'link', href: value.slice(5) });
    if (value.startsWith('faq:')) {
      const answer = this.faq.faqAnswer(value, this.state.lang);
      if (!answer) return;
      this.patch({ chatOpen: true, messages: [...this.state.messages, { from: 'user', text: this.faq.question(value, this.state.lang) }] });
      this.track({ kind: 'question', text: this.faq.question(value, 'en'), answered: true, lang: this.state.lang, source: value });
      return this.reply(answer);
    }
    this.cue({ type: 'custom', value });
  }

  private onSection(id: string | null): void {
    if (!id || this.state.hidden || this.state.tour || this.state.chatOpen || this.state.bubble?.sticky) return;
    const tip = this.config.sections?.find((s) => s.id === id);
    if (!tip || this.shownTips.has(id)) return;
    const now = this.sched.now();
    if (now - this.lastTipAt < (this.config.tipGapMs ?? 8000)) return;
    const regular = this.help() === 'tips';
    const seen = this.memory.get('seenTips');
    if (regular && seen.includes(id) && !tip.advanced) return;
    const source = regular && tip.advanced ? tip.advanced : tip.tip;
    const text = this.pickLocalized(source);
    if (!text) return;
    this.shownTips.add(id);
    this.lastTipAt = now;
    if (!seen.includes(id)) this.memory.update({ seenTips: [...seen, id] });
    this.say(text, { kind: 'tip', mood: tip.mood, anchor: tip.selector ?? id, thinkMs: regular ? 0 : 600 });
  }

  private onApp(name: string, detail: AppEventDetail = {}): void {
    this.resetIdle();
    switch (name) {
      case 'success':
        this.say(detail.line ?? this.line('success'), { kind: 'reaction', mood: 'celebrate' });
        return;
      case 'error': {
        this.track({ kind: 'error', message: detail.message ?? '', code: detail.code });
        const fix = detail.fix ?? this.findFix(detail);
        this.say(fix ?? this.line('error.generic'), {
          kind: 'reaction',
          mood: 'confused',
          buttons: [{ label: this.t('askMe'), value: 'chat:open', primary: true }, { label: this.t('close'), value: 'dismiss' }],
        });
        this.cue({ type: 'impulse', kind: 'shake' });
        return;
      }
      case 'loading':
        this.loading = true;
        this.refreshMood();
        this.timer('loading-slow', 8000, () => this.loading && this.sayLine('loading.slow', { mood: 'thinking' }));
        return;
      case 'loaded':
        this.loading = false;
        this.clearTimer('loading-slow');
        this.refreshMood();
        return;
      case 'conversion':
        this.track({ kind: 'conversion', name: detail.code });
        this.feel('excited', 2000);
        return;
    }
    const reaction = this.config.reactions?.[name];
    this.track({ kind: 'event', name });
    if (!reaction) return;
    const text = reaction.line && this.pickLocalized(reaction.line);
    if (text) return this.say(text, { kind: 'reaction', mood: reaction.mood });
    this.feel(reaction.mood, reaction.ms ?? 1800);
  }

  private pickLocalized(value: Localized | Localized[]): string | undefined {
    const set = toLineSet(value);
    const list = set[this.state.lang] ?? set.en ?? Object.values(set).find((v) => v?.length) ?? [];
    return list[Math.floor(this.random() * list.length)];
  }

  private findFix(detail: AppEventDetail): string | undefined {
    const haystack = `${detail.code ?? ''} ${detail.message ?? ''}`;
    for (const rule of this.config.errors ?? []) {
      const re = /^\/(.+)\/([a-z]*)$/.exec(rule.match);
      let hit = false;
      try {
        hit = re ? new RegExp(re[1]!, re[2]).test(haystack) : haystack.toLowerCase().includes(rule.match.toLowerCase());
      } catch {
        hit = false;
      }
      if (hit) return localize(rule.fix, this.state.lang);
    }
    return undefined;
  }

  private onLeave(): void {
    if (this.nudged || this.config.leaveNudge === false || this.state.hidden || this.state.chatOpen || this.state.bubble) return;
    if (this.help() !== 'lots') return;
    this.nudged = true;
    this.track({ kind: 'nudge' });
    this.sayLine('leave.nudge', {
      kind: 'nudge',
      mood: 'shy',
      buttons: [{ label: this.t('askMe'), value: 'chat:open', primary: true }, { label: this.t('notNow'), value: 'dismiss' }],
    });
  }

  private onActivity(): void {
    const wasAsleep = this.baseMood !== 'idle';
    this.resetIdle();
    if (wasAsleep) this.feel('waking', 900);
  }

  private resetIdle(): void {
    if (this.baseMood !== 'idle') {
      this.baseMood = 'idle';
      this.refreshMood();
    }
    const sleepy = this.config.idle?.sleepyAfterMs ?? 30000;
    const sleep = this.config.idle?.sleepAfterMs ?? 50000;
    this.timer('sleepy', sleepy, () => this.goDrowsy('sleepy'));
    this.timer('sleep', sleep, () => this.goDrowsy('sleeping'));
  }

  private goDrowsy(mood: 'sleepy' | 'sleeping'): void {
    if (this.state.chatOpen || this.state.tour || this.state.busy || this.loading) {
      this.resetIdle();
      return;
    }
    this.baseMood = mood;
    if (mood === 'sleeping') this.dismissBubble();
    this.refreshMood();
  }
}
