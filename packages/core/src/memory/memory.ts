import type { HelpLevel } from '../brain/config';
import type { Lang } from '../brain/lang';

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export class InMemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  get(key: string) {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.map.set(key, value);
  }
}

export interface GuidePrefs {
  visits: number;
  firstSeen: number;
  lastSeen: number;
  hidden: boolean;
  lang: Lang | null;
  helpLevel: HelpLevel;
  voice: boolean;
  tourIndex: number;
  tourDone: boolean;
  seenTips: string[];
  questions: number;
  /** When the last welcome was shown, so moving between pages doesn't repeat it. */
  lastWelcome: number;
  /** The visitor said "Not now" to finishing the tour. */
  tourLater: boolean;
}

const DEFAULTS: GuidePrefs = {
  visits: 0,
  firstSeen: 0,
  lastSeen: 0,
  hidden: false,
  lang: null,
  helpLevel: 'auto',
  voice: false,
  tourIndex: -1,
  tourDone: false,
  seenTips: [],
  questions: 0,
  lastWelcome: 0,
  tourLater: false,
};

/** What the guide remembers about one visitor on one site. */
export class GuideMemory {
  private prefs: GuidePrefs;
  private key: string;

  constructor(
    private store: KeyValueStore,
    siteId = 'default',
  ) {
    this.key = `wisp:${siteId}`;
    this.prefs = { ...DEFAULTS, ...this.load() };
  }

  private load(): Partial<GuidePrefs> {
    try {
      const raw = this.store.get(this.key);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  get<K extends keyof GuidePrefs>(k: K): GuidePrefs[K] {
    return this.prefs[k];
  }

  all(): Readonly<GuidePrefs> {
    return this.prefs;
  }

  update(patch: Partial<GuidePrefs>): void {
    this.prefs = { ...this.prefs, ...patch };
    try {
      this.store.set(this.key, JSON.stringify(this.prefs));
    } catch {
      // Storage can be full or blocked; the guide keeps working from memory.
    }
  }

  /** Counts a visit at most once per 30 minutes. */
  recordVisit(now: number): void {
    const fresh = now - this.prefs.lastSeen > 30 * 60 * 1000;
    this.update({
      visits: this.prefs.visits + (fresh ? 1 : 0),
      firstSeen: this.prefs.firstSeen || now,
      lastSeen: now,
    });
  }

  /** "auto" resolves to step-by-step help for newcomers and tips for regulars. */
  effectiveHelp(): Exclude<HelpLevel, 'auto'> {
    if (this.prefs.helpLevel !== 'auto') return this.prefs.helpLevel;
    return this.prefs.visits <= 2 && !this.prefs.tourDone ? 'lots' : 'tips';
  }
}
