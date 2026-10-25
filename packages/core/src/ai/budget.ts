export class BudgetError extends Error {
  constructor(message = 'AI call limit reached') {
    super(message);
    this.name = 'BudgetError';
  }
}

/** Runs `fn` with an AbortSignal that fires after `ms`; rejects on timeout. */
export async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>, outer?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const onOuter = () => ctrl.abort();
  outer?.addEventListener('abort', onOuter);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(ctrl.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          ctrl.abort();
          reject(new Error(`timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', onOuter);
  }
}

/** Counts AI calls per key within a rolling window. Used by the proxy and by visitors' browsers. */
export class CallLimiter {
  private counts = new Map<string, { n: number; resetAt: number }>();

  constructor(
    private limit: number,
    private windowMs = 24 * 60 * 60 * 1000,
    private now: () => number = Date.now,
  ) {}

  take(key: string): boolean {
    const t = this.now();
    let entry = this.counts.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { n: 0, resetAt: t + this.windowMs };
      this.counts.set(key, entry);
    }
    if (entry.n >= this.limit) return false;
    entry.n++;
    if (this.counts.size > 50_000) this.sweep(t);
    return true;
  }

  remaining(key: string): number {
    const e = this.counts.get(key);
    return !e || e.resetAt <= this.now() ? this.limit : Math.max(0, this.limit - e.n);
  }

  private sweep(t: number): void {
    for (const [k, v] of this.counts) if (v.resetAt <= t) this.counts.delete(k);
  }
}
