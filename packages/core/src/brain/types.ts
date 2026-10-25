import type { Impulse } from '../character/animator';
import type { Mood } from '../character/moods';
import type { Button, HelpLevel } from './config';
import type { Lang } from './lang';

export type BubbleKind = 'line' | 'tip' | 'welcome' | 'tour' | 'reaction' | 'nudge';

export interface Bubble {
  id: number;
  kind: BubbleKind;
  text: string;
  title?: string;
  buttons: Button[];
  sticky: boolean;
}

export interface ChatMessage {
  from: 'user' | 'guide';
  text: string;
  buttons?: Button[];
}

export interface GuideState {
  name: string;
  mood: Mood;
  speaking: boolean;
  bubble: Bubble | null;
  /** Target the guide sits beside (selector or registered name); null means docked in its corner. */
  anchor: string | null;
  highlight: string | null;
  hidden: boolean;
  chatOpen: boolean;
  messages: ChatMessage[];
  busy: boolean;
  lang: Lang;
  helpLevel: HelpLevel;
  tour: { index: number; total: number } | null;
}

export type AppEventName = 'success' | 'error' | 'loading' | 'loaded' | 'conversion' | (string & {});

export interface AppEventDetail {
  message?: string;
  code?: string;
  fix?: string;
  line?: string;
}

export type GuideEvent =
  | { type: 'start' }
  | { type: 'tap' }
  | { type: 'activity' }
  | { type: 'section'; id: string | null }
  | { type: 'app'; name: AppEventName; detail?: AppEventDetail }
  | { type: 'leave-intent' }
  | { type: 'button'; value: string }
  | { type: 'chat-open' }
  | { type: 'chat-close' }
  | { type: 'chat-send'; text: string }
  | { type: 'hide' }
  | { type: 'show' }
  | { type: 'set-help'; level: HelpLevel }
  | { type: 'set-lang'; lang: Lang }
  | { type: 'dismiss' };

export type TrackEvent =
  | { kind: 'question'; text: string; answered: boolean; lang: Lang; source?: string }
  | { kind: 'error'; message: string; code?: string }
  | { kind: 'tour'; step: number; action: 'view' | 'skip' | 'done' }
  | { kind: 'conversion'; name?: string }
  | { kind: 'nudge' }
  | { kind: 'event'; name: string };

export type Cue =
  | { type: 'impulse'; kind: Impulse }
  | { type: 'speak'; text: string; lineId?: string }
  | { type: 'link'; href: string }
  | { type: 'custom'; value: string }
  | { type: 'track'; event: TrackEvent };

export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  now(): number;
}

export const realScheduler: Scheduler = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};
