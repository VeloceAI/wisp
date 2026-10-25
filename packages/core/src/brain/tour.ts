import type { TourStep } from './config';
import type { Guide } from './guide';
import { localize } from './lang';

export class TourRunner {
  constructor(
    private guide: Guide,
    private steps: TourStep[],
  ) {}

  get length(): number {
    return this.steps.length;
  }

  canResume(): boolean {
    const i = this.guide.memory.get('tourIndex');
    return i > 0 && i < this.steps.length && !this.guide.memory.get('tourDone');
  }

  handle(cmd: string): void {
    const cur = this.guide.getState().tour?.index ?? -1;
    if (cmd === 'start') return this.show(0);
    if (cmd === 'resume') return this.show(Math.max(0, this.guide.memory.get('tourIndex')));
    if (cmd === 'next') return cur + 1 >= this.steps.length ? this.finish(true) : this.show(cur + 1);
    if (cmd === 'back') return this.show(Math.max(0, cur - 1));
    if (cmd === 'end') return this.finish(false);
  }

  private show(index: number): void {
    const step = this.steps[index];
    if (!step) return;
    const g = this.guide;
    const lang = g.getState().lang;
    const last = index === this.steps.length - 1;
    g.memory.update({ tourIndex: index });
    g.patch({ tour: { index, total: this.steps.length }, highlight: step.target, chatOpen: false });
    g.track({ kind: 'tour', step: index, action: 'view' });
    g.say(localize(step.text, lang), {
      kind: 'tour',
      title: step.title ? localize(step.title, lang) : `${index + 1} / ${this.steps.length}`,
      mood: step.mood,
      anchor: step.target,
      sticky: true,
      buttons: [
        ...(index > 0 ? [{ label: g.t('back'), value: 'tour:back' }] : []),
        { label: last ? g.t('done') : g.t('next'), value: 'tour:next', primary: true },
        ...(last ? [] : [{ label: g.t('skip'), value: 'tour:end' }]),
      ],
    });
  }

  private finish(completed: boolean): void {
    const g = this.guide;
    const step = g.getState().tour?.index ?? 0;
    g.memory.update(completed ? { tourDone: true, tourIndex: -1 } : { tourIndex: step });
    g.track({ kind: 'tour', step, action: completed ? 'done' : 'skip' });
    g.patch({ tour: null, highlight: null, bubble: null });
    g.moveTo(null);
    g.sayLine('tour.done', { mood: completed ? 'celebrate' : 'happy' });
  }
}
