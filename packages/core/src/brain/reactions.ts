import type { ErrorFix } from './config';
import type { Guide } from './guide';
import { localize, type Lang } from './lang';
import type { AppEventDetail } from './types';

/** How the guide reacts to the host app's events: success, error, loading and custom ones. */
export function reactToApp(g: Guide, name: string, detail: AppEventDetail = {}): void {
  switch (name) {
    case 'success':
      g.say(detail.line ?? g.line('success'), { kind: 'reaction', mood: 'celebrate' });
      return;
    case 'error': {
      g.track({ kind: 'error', message: detail.message ?? '', code: detail.code });
      const fix = detail.fix ?? findFix(g.config.errors ?? [], detail, g.getState().lang);
      g.say(fix ?? g.line('error.generic'), {
        kind: 'reaction',
        mood: 'confused',
        buttons: [{ label: g.t('askMe'), value: 'chat:open', primary: true }, { label: g.t('close'), value: 'dismiss' }],
      });
      g.cue({ type: 'impulse', kind: 'shake' });
      return;
    }
    case 'loading':
      g.setLoading(true);
      g.timer('loading-slow', 8000, () => g.isLoading && g.sayLine('loading.slow', { mood: 'thinking' }));
      return;
    case 'loaded':
      g.setLoading(false);
      g.clearTimer('loading-slow');
      return;
    case 'conversion':
      g.track({ kind: 'conversion', name: detail.code });
      g.feel('excited', 2000);
      return;
  }
  const reaction = g.config.reactions?.[name];
  g.track({ kind: 'event', name });
  if (!reaction) return;
  const text = reaction.line && g.pickLocalized(reaction.line);
  if (text) return g.say(text, { kind: 'reaction', mood: reaction.mood });
  g.feel(reaction.mood, reaction.ms ?? 1800);
}

export function findFix(rules: ErrorFix[], detail: AppEventDetail, lang: Lang): string | undefined {
  const haystack = `${detail.code ?? ''} ${detail.message ?? ''}`;
  for (const rule of rules) {
    const re = /^\/(.+)\/([a-z]*)$/.exec(rule.match);
    let hit = false;
    try {
      hit = re ? new RegExp(re[1]!, re[2]).test(haystack) : haystack.toLowerCase().includes(rule.match.toLowerCase());
    } catch {
      hit = false;
    }
    if (hit) return localize(rule.fix, lang);
  }
  return undefined;
}
