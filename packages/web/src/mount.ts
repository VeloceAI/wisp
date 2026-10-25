import {
  CharacterAnimator,
  Guide,
  buildScene,
  type Answerer,
  type AppEventDetail,
  type Cue,
  type GuideConfig,
  type GuideState,
  type KeyValueStore,
  type Mood,
  type PageModel,
  type SiteActionHandler,
  ActionRunner,
  localize,
  type TrackEvent,
} from '@veloceai/wisp-core';
import { SvgRenderer } from './render/svg';
import { ChatView } from './ui/chat';
import { buttonRow, h } from './ui/dom';
import { clamp, coversInteractive, dockBox, isPhone, placeGuide, type Box, type Corner } from './ui/placement';
import { STYLES } from './ui/styles';
import { applyTheme, resolveSize } from './ui/theme';
import { watchInput } from './watch/input';
import { cssEscape, safeQueryAll, watchSections } from './watch/sections';
import { browserStore } from './storage';
import { connectAI, visitorId } from './ai';
import { WebVoice } from './voice';
import { PageReader } from './page/reader';
import { DomDriver } from './actions/driver';
import { proxyPlanner } from './ai';

export interface MountOptions {
  /** Where the host element goes. Defaults to document.body. */
  parent?: HTMLElement;
  store?: KeyValueStore;
  answerer?: Answerer;
  onTrack?: (event: TrackEvent) => void;
  /** Called for buttons with custom values; also fired as a `wisp:action` window event. */
  onAction?: (value: string) => void;
}

export interface WispInstance {
  guide: Guide;
  emit(name: string, detail?: AppEventDetail): void;
  say(text: string, mood?: Mood): void;
  /** What the guide currently understands about the page. */
  read(): PageModel;
  /** Carry out an instruction, e.g. "search red dresses under 2000 and sort by price". */
  run(instruction: string): Promise<boolean>;
  /** Handle a declared action yourself instead of receiving a `wisp:run` event. */
  registerAction(name: string, handler: SiteActionHandler): void;
  stop(): void;
  openChat(): void;
  startTour(): void;
  hide(): void;
  show(): void;
  destroy(): void;
}

export function mount(config: GuideConfig = {}, opts: MountOptions = {}): WispInstance {
  const doc = document;
  const win = window;
  const store = opts.store ?? browserStore();
  const guide = new Guide(config, {
    store,
    hostLocale: doc.documentElement.lang || navigator.language,
    answerer: opts.answerer,
  });
  const reader = new PageReader(doc, { blockedSelectors: config.blocked?.selectors, blockedPaths: config.blocked?.paths });
  guide.page = reader;
  if (!opts.answerer) connectAI(guide, store);
  const driver = new DomDriver(reader, () => config.actions ?? []);
  const actions = new ActionRunner(guide, driver, {
    store: browserStore('sessionStorage'),
    aiPlanner: config.ai?.endpoint ? proxyPlanner(config.ai.endpoint, visitorId(store)) : undefined,
    stepDelayMs: win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 250 : 700,
  });
  guide.actions = actions;
  guide.faq.extra = (lang) =>
    (config.actions ?? []).filter((a) => a.button).map((a) => ({ label: localize(a.button, lang), value: `run:${a.name}` }));
  const voice =
    config.voice === false
      ? null
      : new WebVoice({ mode: config.voice?.mode ?? 'browser', endpoint: config.ai?.endpoint, visitor: visitorId(store), clips: config.voice?.clips });
  const def = guide.character;
  const corner: Corner = config.position ?? 'bottom-right';
  const motionQuery = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const touch = win.matchMedia?.('(hover: none)').matches ?? false;
  const anim = new CharacterAnimator({ reducedMotion: motionQuery?.matches ?? false });

  const host = h('div', { 'data-wisp-host': '' });
  const shadow = host.attachShadow({ mode: 'open' });
  const renderer = new SvgRenderer(doc);
  const bodyBtn = h('button', { type: 'button', class: 'body-btn', onclick: () => guide.dispatch({ type: 'tap' }) });
  bodyBtn.append(renderer.svg);
  const hideBtn = h('button', { type: 'button', class: 'hide-btn', onclick: () => guide.dispatch({ type: 'hide' }) }, '×');
  const figure = h('div', { class: touch ? 'figure touch' : 'figure' }, bodyBtn, hideBtn);
  const bubble = h('div', { class: 'bubble', role: 'status', 'aria-live': 'polite' });
  const highlight = h('div', { class: 'highlight' });
  const tab = h('button', { type: 'button', class: `tab ${corner === 'bottom-left' ? 'left' : 'right'}`, hidden: true, onclick: () => guide.dispatch({ type: 'show' }) });
  const chat = new ChatView(guide, (v) => guide.dispatch({ type: 'button', value: v }), voice);
  const layer = h('div', { class: 'layer' }, highlight, figure, bubble, chat.el, tab);
  applyTheme(layer, config, def);
  shadow.append(h('style', {}, STYLES), layer);
  (opts.parent ?? doc.body).append(host);
  reader.setHost(host);

  let size = 96;
  let box: Box = { x: 0, y: 0, w: size, h: size };
  let state = guide.getState();
  let bubbleId = -1;
  let raf = 0;
  let last = performance.now();
  let layoutQueued = false;

  const resolve = (target: string | null): Element | null => {
    if (!target) return null;
    if (target.startsWith('ref:')) return reader.element(target.slice(4));
    const bySection = doc.querySelector(`[data-wisp-section="${cssEscape(target)}"],[data-wisp-target="${cssEscape(target)}"]`);
    return bySection ?? safeQueryAll(doc, target)[0] ?? null;
  };

  const layout = () => {
    layoutQueued = false;
    const vw = doc.documentElement.clientWidth || win.innerWidth;
    const vh = win.innerHeight;
    size = resolveSize(config.size, isPhone(vw));
    layer.style.setProperty('--wisp-size', `${size}px`);
    const targetEl = state.chatOpen ? null : resolve(state.anchor);
    const placed = state.chatOpen
      ? { box: dockBox(corner, size, vw, vh), mini: false }
      : placeGuide({
          corner,
          size,
          vw,
          vh,
          target: targetEl?.getBoundingClientRect() ?? null,
          covers: (b) => coversInteractive(b, doc, host),
        });
    box = placed.box;
    figure.classList.toggle('mini', placed.mini && !state.chatOpen);
    figure.style.width = figure.style.height = `${box.w}px`;
    figure.style.transform = `translate(${box.x}px, ${box.y}px)`;
    if (!figure.classList.contains('placed')) requestAnimationFrame(() => figure.classList.add('placed'));
    placeBubble(vw, vh);
    placeChat(vw, vh);
  };
  const queueLayout = () => {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(layout);
  };

  const placeBubble = (vw: number, vh: number) => {
    if (!bubble.classList.contains('show')) return;
    const bw = bubble.offsetWidth || 260;
    const bh = bubble.offsetHeight || 80;
    const above = box.y - bh - 10 >= 8;
    const y = above ? box.y - bh - 10 : Math.min(vh - bh - 8, box.y + box.h + 10);
    const x = clamp(box.x + box.w / 2 - bw / 2 + (box.x > vw / 2 ? -bw / 3 : bw / 3), 12, vw - bw - 12);
    bubble.style.transform = `translate(${x}px, ${y}px)`;
  };

  const placeChat = (vw: number, vh: number) => {
    if (chat.el.hidden) return;
    const s = chat.el.style;
    const bottom = vh - box.y + 8;
    s.bottom = `${bottom}px`;
    // A big character pushes the panel up; cap its height so the header never goes off-screen.
    s.maxHeight = `${Math.max(200, vh - bottom - 12)}px`;
    if (isPhone(vw)) {
      s.left = '12px';
      s.right = 'auto';
    } else if (corner === 'bottom-left') {
      s.left = '16px';
      s.right = 'auto';
    } else {
      s.right = '16px';
      s.left = 'auto';
    }
  };

  const renderBubble = (s: GuideState) => {
    const b = s.chatOpen && s.bubble?.kind !== 'tour' ? null : s.bubble;
    if (!b) {
      bubble.classList.remove('show');
      bubbleId = -1;
      return;
    }
    if (b.id === bubbleId) return;
    bubbleId = b.id;
    bubble.replaceChildren(
      b.title ? h('div', { class: 'title' }, b.title) : '',
      h('button', { type: 'button', class: 'x', 'aria-label': guide.t('close'), onclick: () => guide.dispatch(b.kind === 'tour' ? { type: 'button', value: 'tour:end' } : { type: 'dismiss' }) }, '✕'),
      h('div', { class: 'text' }, b.text),
      buttonRow(b.buttons, (v) => guide.dispatch({ type: 'button', value: v })) ?? '',
    );
    bubble.classList.add('show');
  };

  const render = (s: GuideState) => {
    const prev = state;
    state = s;
    if (prev.voice && !s.voice) voice?.stop();
    anim.setMood(s.mood);
    anim.setSpeaking(s.speaking);
    figure.hidden = s.hidden;
    tab.hidden = !s.hidden;
    tab.textContent = guide.t('show');
    bodyBtn.setAttribute('aria-label', `${s.name} — ${guide.t('askMe')}`);
    bodyBtn.setAttribute('aria-expanded', String(s.chatOpen));
    hideBtn.setAttribute('aria-label', guide.t('hide'));
    renderBubble(s);
    chat.update(s);
    if (s.highlight !== prev.highlight && s.highlight) {
      const el = resolve(s.highlight);
      const r = el?.getBoundingClientRect();
      if (el && r && (r.top < 0 || r.bottom > win.innerHeight)) {
        el.scrollIntoView?.({ block: 'center', behavior: motionQuery?.matches ? 'auto' : 'smooth' });
      }
    }
    queueLayout();
  };

  const updateHighlight = () => {
    const el = state.hidden ? null : resolve(state.highlight);
    highlight.classList.toggle('show', !!el);
    if (!el) return;
    const r = el.getBoundingClientRect();
    Object.assign(highlight.style, { left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
    if (!state.chatOpen) anim.lookAt(gazeTo(r.left + r.width / 2), gazeTo(r.top + r.height / 2, true));
  };
  const gazeTo = (p: number, vertical = false) => {
    const c = vertical ? box.y + box.h * 0.45 : box.x + box.w / 2;
    return clamp((p - c) / 260, -1, 1);
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    last = now;
    if (doc.hidden || state.hidden) return;
    updateHighlight();
    renderer.render(buildScene(def, anim.tick(dt), 'wisp'));
  };

  const onCue = (c: Cue) => {
    if (c.type === 'impulse') anim.impulse(c.kind);
    else if (c.type === 'speak') {
      if (state.voice && voice) void voice.speak(c.text, state.lang, c.lineId);
    }
    else if (c.type === 'link') openLink(c.href);
    else if (c.type === 'track') opts.onTrack?.(c.event);
    else if (c.type === 'custom') {
      opts.onAction?.(c.value);
      win.dispatchEvent(new CustomEvent('wisp:action', { detail: { value: c.value } }));
    }
  };
  const openLink = (href: string) => {
    try {
      const url = new URL(href, win.location.href);
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.origin === win.location.origin) win.location.assign(url.href);
      else win.open(url.href, '_blank', 'noopener');
    } catch {
      /* bad link from config: ignore */
    }
  };

  const unsubs = [
    guide.subscribe(render),
    guide.onCue(onCue),
    watchSections(doc, config.sections ?? [], (id) => guide.dispatch({ type: 'section', id })),
    watchInput(win, Object.keys(config.reactions ?? {}), {
      onActivity: () => guide.dispatch({ type: 'activity' }),
      onPointer: (x, y) => !state.highlight && anim.lookAt(gazeTo(x), gazeTo(y, true)),
      onScroll: (d) => {
        if (!state.highlight) anim.lookAt(0, d * 0.8);
        queueLayout();
      },
      onLeave: () => guide.dispatch({ type: 'leave-intent' }),
      onAppEvent: (name, detail) => guide.dispatch({ type: 'app', name, detail }),
    }),
  ];
  const onResize = () => queueLayout();
  win.addEventListener('resize', onResize);
  const onMotion = (e: MediaQueryListEvent) => anim.setReducedMotion(e.matches);
  motionQuery?.addEventListener?.('change', onMotion);
  const relayout = setInterval(queueLayout, 1500);
  raf = requestAnimationFrame(frame);
  guide.dispatch({ type: 'start' });
  void actions.resume();

  return {
    guide,
    emit: (name, detail) => guide.dispatch({ type: 'app', name, detail }),
    say: (text, mood) => guide.say(text, { mood }),
    read: () => reader.read(),
    run: (instruction) => actions.handle(instruction),
    registerAction: (name, handler) => void driver.handlers.set(name, handler),
    stop: () => actions.stop(),
    openChat: () => guide.dispatch({ type: 'chat-open' }),
    startTour: () => guide.dispatch({ type: 'button', value: 'tour:start' }),
    hide: () => guide.dispatch({ type: 'hide' }),
    show: () => guide.dispatch({ type: 'show' }),
    destroy: () => {
      actions.stop();
      cancelAnimationFrame(raf);
      clearInterval(relayout);
      unsubs.forEach((u) => u());
      win.removeEventListener('resize', onResize);
      motionQuery?.removeEventListener?.('change', onMotion);
      guide.destroy();
      reader.destroy();
      host.remove();
    },
  };
}
