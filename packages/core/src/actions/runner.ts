import type { Guide } from '../brain/guide';
import type { KeyValueStore } from '../memory/memory';
import type { PageElement, PageModel } from '../page/model';
import { describeElement } from '../page/understand';
import { looksLikeCommand, planFromText } from './rule-planner';
import type { ActionPlan, ActionStep, SiteActionDecl } from './types';

/** The platform part: finds and drives real elements (web: DOM; native: registered handlers). */
export interface ActionDriver {
  read(): PageModel;
  locate(step: ActionStep): PageElement | null;
  /** True when the step pays, deletes, sends or submits something. */
  isFinal(step: ActionStep, el: PageElement | null): boolean;
  perform(step: ActionStep, el: PageElement | null): Promise<void>;
}

export type AiPlanner = (goal: string, model: PageModel, actions: SiteActionDecl[]) => Promise<ActionPlan | null>;

const PENDING_KEY = 'wisp:pending-plan';
const RESUME_WINDOW_MS = 60_000;
const NEEDS_TARGET = new Set(['click', 'type', 'select']);

export const FINAL_WORDS =
  /\b(pay|buy|purchase|place order|checkout|check out|confirm|delete|remove|send|submit|transfer|book|subscribe|sign ?up|register|log ?out|sign ?out|cancel|unsubscribe|donate|withdraw|order now)\b/i;

/** Runs instructions step by step, narrating, highlighting, asking before anything final, and stoppable. */
export class ActionRunner {
  private abort: AbortController | null = null;
  private confirmWaiter: ((yes: boolean) => void) | null = null;

  constructor(
    private guide: Guide,
    private driver: ActionDriver,
    private opts: { store?: KeyValueStore; aiPlanner?: AiPlanner; stepDelayMs?: number; now?: () => number } = {},
  ) {}

  get busy(): boolean {
    return this.abort !== null;
  }

  /** Plans and runs a command. Returns false when the text isn't an instruction it can follow. */
  async handle(text: string): Promise<boolean> {
    if (!looksLikeCommand(text)) return false;
    const model = this.driver.read();
    if (model.blocked) {
      this.guide.say(this.guide.line('act.blocked'), { mood: 'worried' });
      return true;
    }
    const actions = this.guide.config.actions ?? [];
    let plan = planFromText(text, model, actions);
    if (!plan && this.opts.aiPlanner) {
      this.guide.feel('thinking', 8000);
      plan = await this.opts.aiPlanner(text, model, actions).catch(() => null);
    }
    if (!plan || !plan.steps.length) {
      this.guide.say(this.guide.line('act.cantPlan'), { mood: 'confused' });
      return true;
    }
    await this.run(plan);
    return true;
  }

  async run(plan: ActionPlan, start = 0): Promise<void> {
    this.stop();
    const ctrl = new AbortController();
    this.abort = ctrl;
    const g = this.guide;
    const total = plan.steps.length;
    g.patch({ acting: { goal: plan.goal, step: start, total }, chatOpen: false });
    try {
      for (let i = start; i < total; i++) {
        if (ctrl.signal.aborted) return;
        const step = plan.steps[i]!;
        const el = this.driver.locate(step);
        if (NEEDS_TARGET.has(step.kind) && !el) return this.fail('act.notFound', { thing: (step as { target: string }).target });
        if (el?.sensitive) return this.fail('act.sensitive');
        if (this.driver.isFinal(step, el)) {
          const yes = await this.confirm(step, el);
          if (ctrl.signal.aborted) return;
          if (!yes) return this.end('act.stopped', 'idle');
        }
        g.patch({ acting: { goal: plan.goal, step: i + 1, total } });
        if (el) g.pointAt(`ref:${el.ref}`);
        g.say(this.narrate(step, el), {
          kind: 'action',
          mood: 'talking',
          sticky: true,
          buttons: [{ label: g.t('stop'), value: 'act:stop' }],
        });
        await this.wait(ctrl.signal);
        if (ctrl.signal.aborted) return;
        this.savePending(plan, i + 1);
        await this.driver.perform(step, el);
        g.track({ kind: 'event', name: `action:${step.kind}` });
        await this.wait(ctrl.signal, 0.6);
      }
      this.clearPending();
      this.end('act.done', 'celebrate');
    } catch {
      this.fail('act.failed');
    } finally {
      if (this.abort === ctrl) this.abort = null;
    }
  }

  /** Picks up a plan cut short by a page navigation. */
  async resume(): Promise<void> {
    const raw = this.opts.store?.get(PENDING_KEY);
    if (!raw) return;
    this.clearPending();
    try {
      const { plan, next, at } = JSON.parse(raw) as { plan: ActionPlan; next: number; at: number };
      if ((this.opts.now ?? Date.now)() - at < RESUME_WINDOW_MS && next < plan.steps.length) await this.run(plan, next);
    } catch {
      /* stale or broken: ignore */
    }
  }

  stop(): void {
    if (!this.abort) return;
    this.abort.abort();
    this.abort = null;
    this.confirmWaiter?.(false);
    this.clearPending();
    this.end('act.stopped', 'idle');
  }

  /** Routes `act:*` buttons from the bubble. */
  button(value: string): void {
    if (value === 'act:stop') return this.stop();
    if (value === 'act:yes' || value === 'act:no') {
      const w = this.confirmWaiter;
      this.confirmWaiter = null;
      w?.(value === 'act:yes');
    }
  }

  private confirm(step: ActionStep, el: PageElement | null): Promise<boolean> {
    const g = this.guide;
    g.say(g.line('act.confirm', { thing: this.what(step, el) }), {
      kind: 'action',
      mood: 'worried',
      sticky: true,
      buttons: [
        { label: g.t('yes'), value: 'act:yes', primary: true },
        { label: g.t('no'), value: 'act:no' },
      ],
    });
    return new Promise((resolve) => (this.confirmWaiter = resolve));
  }

  private narrate(step: ActionStep, el: PageElement | null): string {
    const g = this.guide;
    const thing = this.what(step, el);
    switch (step.kind) {
      case 'type':
        return g.line('act.typing', { text: step.text, thing });
      case 'select':
        return g.line('act.selecting', { text: step.option, thing });
      case 'scroll':
        return g.line('act.scrolling');
      case 'navigate':
        return g.line('act.going', { thing: step.url });
      case 'tool':
        return g.line('act.running', { thing: step.name.replace(/[-_]/g, ' ') });
      default:
        return g.line('act.clicking', { thing });
    }
  }

  private what(step: ActionStep, el: PageElement | null): string {
    if (el) return describeElement(el, this.guide.getState().lang);
    if (step.kind === 'tool') return step.name.replace(/[-_]/g, ' ');
    if (step.kind === 'navigate') return step.url;
    return 'target' in step && step.target ? step.target : '';
  }

  private fail(lineId: string, vars?: Record<string, string>): void {
    this.clearPending();
    this.guide.patch({ acting: null });
    this.guide.sayLine(lineId, { mood: 'confused' }, vars);
  }

  private end(lineId: string, mood: 'celebrate' | 'idle'): void {
    this.guide.patch({ acting: null, highlight: null });
    this.guide.sayLine(lineId, { mood: mood === 'celebrate' ? 'celebrate' : 'talking' });
  }

  private wait(signal: AbortSignal, factor = 1): Promise<void> {
    const ms = (this.opts.stepDelayMs ?? 700) * factor;
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true });
    });
  }

  private savePending(plan: ActionPlan, next: number): void {
    try {
      this.opts.store?.set(PENDING_KEY, JSON.stringify({ plan, next, at: (this.opts.now ?? Date.now)() }));
    } catch {
      /* storage blocked: the plan just won't survive a page load */
    }
  }

  private clearPending(): void {
    this.opts.store?.set(PENDING_KEY, '');
  }
}
