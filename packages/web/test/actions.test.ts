// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryStore, mount, parsePlan, planFromText, type GuideConfig, type WispInstance } from '../src/index';
import { PageReader } from '../src/page/reader';

const shop = `
  <form id="search" role="search"><input id="q" type="search" aria-label="Search products"><input id="max" type="number" aria-label="Maximum price"><button>Search</button></form>
  <label>Sort by <select id="sort"><option value="popular">Popular</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
  <h3>Red cotton dress</h3><button id="add-red">Add to cart</button>
  <form id="signup"><input type="email" aria-label="Email"><input type="password" aria-label="Password"><button type="submit">Sign up</button></form>`;

let wisp: WispInstance | null = null;
afterEach(() => {
  wisp?.destroy();
  wisp = null;
  document.body.innerHTML = '';
});

const start = (config: GuideConfig = {}) => {
  document.body.innerHTML = shop;
  const submits: string[] = [];
  document.addEventListener('submit', (e) => (e.preventDefault(), submits.push((e.target as HTMLElement).id)), { capture: true });
  wisp = mount({ welcome: false, ...config }, { store: new InMemoryStore() });
  return { submits, value: (id: string) => (document.getElementById(id) as HTMLInputElement).value };
};

const tick = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (fn: () => boolean) => {
  for (let i = 0; i < 400 && !fn(); i++) await new Promise((r) => setTimeout(r, 10));
};

describe('rule planner', () => {
  it('plans the example instruction without AI', () => {
    document.body.innerHTML = shop;
    const plan = planFromText('search red dresses under ₹2000 and sort by price', new PageReader(document).read());
    expect(plan?.steps).toEqual([
      { kind: 'type', target: expect.stringMatching(/^e\d+$/), text: '2000' },
      { kind: 'type', target: 'search', text: 'red dresses', submit: true },
      { kind: 'select', target: 'sort', option: 'price' },
    ]);
  });

  it('understands Hinglish instructions and declared actions', () => {
    document.body.innerHTML = shop;
    const model = new PageReader(document).read();
    expect(planFromText('red dress dhundo aur price se sort karo', model)?.steps.map((s) => s.kind)).toEqual(['type', 'select']);
    const actions = [{ name: 'track-order', description: 'Track my order' }];
    expect(planFromText('track order', model, actions)?.steps).toEqual([{ kind: 'tool', name: 'track-order' }]);
    expect(planFromText('search shoes', model, [{ name: 'search', description: 'Search', params: { query: { type: 'string' as const } } }])?.steps).toEqual([
      { kind: 'tool', name: 'search', args: { query: 'shoes' } },
    ]);
    expect(planFromText('bake me a cake', model)).toBeNull();
  });

  it('accepts only valid AI plans', () => {
    const plan = parsePlan('{"steps":[{"kind":"click","target":"e1"},{"kind":"click","target":"e999"},{"kind":"tool","name":"rm-rf"},{"kind":"type","target":"e2","text":"hi"}]}', 'g', new Set(['e1', 'e2']), new Set());
    expect(plan?.steps).toEqual([{ kind: 'click', target: 'e1' }, { kind: 'type', target: 'e2', text: 'hi', submit: false }]);
  });
});

describe('running actions', () => {
  it('searches, filters and sorts step by step', async () => {
    const page = start();
    const sorts: string[] = [];
    document.getElementById('sort')!.addEventListener('change', (e) => sorts.push((e.target as HTMLSelectElement).value));
    await wisp!.run('search red dresses under 2000 and sort by price');
    await waitFor(() => wisp!.guide.getState().acting === null && sorts.length > 0);
    expect(page.value('q')).toBe('red dresses');
    expect(page.value('max')).toBe('2000');
    expect(page.submits).toEqual(['search']);
    expect(sorts).toEqual(['price-asc']);
    expect(wisp!.guide.getState().mood).toBe('celebrate');
  });

  it('asks before anything final and stops on No', async () => {
    const page = start();
    void wisp!.run('click sign up');
    await waitFor(() => wisp!.guide.getState().bubble?.buttons.some((b) => b.value === 'act:yes') ?? false);
    expect(wisp!.guide.getState().bubble?.text).toContain('Sign up');
    wisp!.guide.dispatch({ type: 'button', value: 'act:no' });
    await tick();
    expect(page.submits).toEqual([]);
    expect(wisp!.guide.getState().acting).toBeNull();
  });

  it('goes ahead after Yes', async () => {
    const page = start();
    void wisp!.run('click sign up');
    await waitFor(() => wisp!.guide.getState().bubble?.buttons.some((b) => b.value === 'act:yes') ?? false);
    wisp!.guide.dispatch({ type: 'button', value: 'act:yes' });
    await waitFor(() => page.submits.length > 0);
    expect(page.submits).toEqual(['signup']);
  });

  it('never types into passwords', async () => {
    start();
    await wisp!.run('type hunter2 into password');
    await waitFor(() => wisp!.guide.getState().acting === null);
    expect((document.querySelector('input[type=password]') as HTMLInputElement).value).toBe('');
    expect(wisp!.guide.getState().bubble?.text).toMatch(/never type passwords/);
  });

  it('stops when asked', async () => {
    const page = start();
    void wisp!.run('search red dresses and sort by price');
    await waitFor(() => wisp!.guide.getState().acting !== null);
    wisp!.stop();
    await new Promise((r) => setTimeout(r, 1500));
    expect(page.submits).toEqual([]);
    expect(wisp!.guide.getState().bubble?.text).toContain('stopped');
  });

  it('calls site handlers for declared actions and asks first when final', async () => {
    start({ actions: [{ name: 'place-order', description: 'Place the order', final: true }] });
    const handler = vi.fn();
    wisp!.registerAction('place-order', handler);
    void wisp!.run('click place order');
    await waitFor(() => wisp!.guide.getState().bubble?.buttons.some((b) => b.value === 'act:yes') ?? false);
    expect(handler).not.toHaveBeenCalled();
    wisp!.guide.dispatch({ type: 'button', value: 'act:yes' });
    await waitFor(() => handler.mock.calls.length > 0);
    expect(handler).toHaveBeenCalled();
  });

  it('does nothing on blocked pages', async () => {
    start({ blocked: { paths: ['/'] } });
    await wisp!.run('click add to cart');
    expect(wisp!.guide.getState().bubble?.text).toMatch(/not allowed/);
  });
});
