import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Guide, InMemoryStore, NavHandler, parseNav, type NavDriver, type PageModel } from '../src/index';

describe('parseNav', () => {
  it.each([
    ['go to delivery', { kind: 'go', place: 'delivery' }],
    ['take me to my orders page', { kind: 'go', place: 'my orders' }],
    ['open cart', { kind: 'go', place: 'cart' }],
    ['delivery page pe jao', { kind: 'go', place: 'delivery' }],
    ['cart kholo', { kind: 'go', place: 'cart' }],
    ['ऑर्डर पेज खोलो', { kind: 'go', place: 'ऑर्डर' }],
    ['கார்ட்டுக்கு போ', { kind: 'go', place: 'கார்ட்டு' }],
    ['go back', { kind: 'back' }],
    ['peeche jao', { kind: 'back' }],
    ['scroll down', { kind: 'scroll', to: 'down' }],
    ['upar jao', { kind: 'scroll', to: 'up' }],
    ['sabse upar', { kind: 'scroll', to: 'top' }],
  ])('%s', (text, intent) => {
    expect(parseNav(text)).toEqual(intent);
  });

  it('ignores things that aren’t about moving around', () => {
    expect(parseNav('pyaaz dikhao')).toBeNull();
    expect(parseNav('how long is delivery')).toBeNull();
  });
});

describe('NavHandler', () => {
  let driver: NavDriver & Record<string, ReturnType<typeof vi.fn>>;
  let g: Guide;
  const model: PageModel = {
    url: '/',
    title: 'Shop',
    passages: [],
    elements: [
      { ref: 'e1', role: 'link', name: 'Cart', href: '/cart' },
      { ref: 'e2', role: 'heading', name: 'Delivery & returns', level: 2 },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    driver = { goTo: vi.fn(), click: vi.fn(), scrollTo: vi.fn(), scroll: vi.fn(), back: vi.fn() };
    g = new Guide({ welcome: false }, { store: new InMemoryStore(), random: () => 0, page: { read: () => model } });
    g.use(new NavHandler(g, driver, [{ name: ['My orders', { hi: 'मेरे ऑर्डर', hinglish: 'order wala page' }], url: '/orders', keywords: ['order history'] }]));
  });
  afterEach(() => vi.useRealTimers());

  it('clicks a link on screen with that name', async () => {
    await g.ask('open cart');
    expect(g.getState().messages.at(-1)?.text).toBe('Taking you to Cart!');
    vi.advanceTimersByTime(800);
    expect(driver.click).toHaveBeenCalledWith('e1');
  });

  it('goes to a configured page that isn’t linked here, by any of its names', async () => {
    await g.ask('go to my orders');
    vi.advanceTimersByTime(800);
    expect(driver.goTo).toHaveBeenCalledWith('/orders');
    await g.ask('मेरे ऑर्डर पेज खोलो');
    vi.advanceTimersByTime(800);
    expect(driver.goTo).toHaveBeenCalledTimes(2);
  });

  it('scrolls to a section of this page', async () => {
    await g.ask('go to delivery');
    expect(driver.scrollTo).toHaveBeenCalledWith('e2');
    expect(g.getState().highlight).toBe('ref:e2');
  });

  it('goes back and scrolls', async () => {
    await g.ask('peeche jao');
    vi.advanceTimersByTime(800);
    expect(driver.back).toHaveBeenCalled();
    await g.ask('neeche jao');
    expect(driver.scroll).toHaveBeenCalledWith('down');
  });

  it('offers the main pages when it can’t find one, but leaves other requests alone', async () => {
    await g.ask('go to the moon');
    expect(g.getState().messages.at(-1)?.buttons?.[0]).toEqual({ label: 'My orders', value: 'nav:/orders' });
    g.dispatch({ type: 'button', value: 'nav:/orders' });
    expect(driver.goTo).toHaveBeenCalledWith('/orders');
    const before = g.getState().messages.length;
    await g.ask('show me the cheapest milk');
    expect(g.getState().messages.at(-1)?.text).not.toContain('page called');
    expect(g.getState().messages.length).toBe(before + 2);
  });
});
