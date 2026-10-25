import type { CharacterInput } from '../character/definition';
import type { Mood } from '../character/moods';
import type { Lang, Localized } from './lang';
import type { UiOverrides } from './lines';

export type HelpLevel = 'auto' | 'lots' | 'tips';

export interface FaqEntry {
  id?: string;
  /** One or more ways people ask it. */
  q: Localized | Localized[];
  a: Localized;
  keywords?: string[];
  link?: { href: string; label?: Localized };
}

export interface ContentDoc {
  id?: string;
  title: string;
  url?: string;
  text: string;
}

export interface SectionTip {
  /** Matches the section's `data-wisp-section` value, or use `selector`. */
  id: string;
  selector?: string;
  tip: Localized | Localized[];
  /** Shown instead of `tip` to regular visitors. */
  advanced?: Localized | Localized[];
  mood?: Mood;
}

export interface TourStep {
  /** CSS selector (web) or registered target name (native). */
  target: string;
  text: Localized;
  title?: Localized;
  mood?: Mood;
}

export interface ErrorFix {
  /** Plain substring, or `/regex/flags`, tested against the error code and message. */
  match: string;
  fix: Localized;
}

export interface Reaction {
  mood: Mood;
  line?: Localized | Localized[];
  ms?: number;
}

export interface GuideConfig {
  /** Keeps each site's memory separate. */
  siteId?: string;
  character?: CharacterInput | string;
  language?: Lang | 'auto';
  position?: 'bottom-right' | 'bottom-left';
  helpLevel?: HelpLevel;
  welcome?: boolean;
  leaveNudge?: boolean;
  faq?: FaqEntry[];
  content?: ContentDoc[];
  sections?: SectionTip[];
  tour?: TourStep[];
  errors?: ErrorFix[];
  /** Extra app events, e.g. `{ "cart-add": { "mood": "happy", "line": "Nice pick!" } }`. */
  reactions?: Record<string, Reaction>;
  lines?: Record<string, Localized | Localized[]>;
  /** Button labels; add any language here, e.g. `{ next: { ta: 'அடுத்து' } }`. */
  ui?: UiOverrides;
  /** Languages offered in settings. Defaults to en, hi, hinglish. */
  languages?: Lang[];
  idle?: { sleepyAfterMs?: number; sleepAfterMs?: number };
  /** Minimum gap between tips the visitor didn't ask for. */
  tipGapMs?: number;
  siteName?: string;
  /** Your Wisp proxy (keeps the AI key on your server). Without it, chat uses keyword answers. */
  ai?: { endpoint: string; timeoutMs?: number; maxCalls?: number };
  /**
   * Voice is off until the visitor turns it on. `false` hides the option.
   * "browser" uses the built-in voice; "ai" uses the proxy's natural voice and falls back to the browser.
   */
  voice?: false | { mode?: 'browser' | 'ai'; clips?: Record<string, string> };
}

export interface Button {
  label: string;
  /** `tour:start|next|back|end`, `faq:<id>`, `link:<href>`, `chat:open`, `dismiss`, or a custom value. */
  value: string;
  primary?: boolean;
}
