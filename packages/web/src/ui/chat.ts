import type { Guide, GuideState, HelpLevel, Lang } from '@veloceai/wisp-core';
import type { WebVoice } from '../voice';
import type { TalkLoop } from '../talk';
import { buttonRow, h } from './dom';

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'हिन्दी', hinglish: 'Hinglish', ta: 'தமிழ்', te: 'తెలుగు', bn: 'বাংলা', mr: 'मराठी', gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ', ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português', ar: 'العربية',
};

/** The chat panel: messages with tap-to-answer buttons, a text box, and visitor settings. */
export class ChatView {
  readonly el: HTMLElement;
  private log: HTMLElement;
  private input: HTMLInputElement;
  private settings: HTMLElement;
  private form: HTMLFormElement;
  private title: HTMLElement;
  private rendered = -1;
  private showingSettings = false;
  private lastKey = '';
  private mic: HTMLButtonElement;

  constructor(
    private guide: Guide,
    private onButton: (value: string) => void,
    private voice: WebVoice | null = null,
    private talk: TalkLoop | null = null,
  ) {
    this.mic = h('button', { type: 'button', class: 'icon-btn mic', hidden: true, onclick: () => (this.talk ? this.talk.toggle() : void this.listen()) }, '🎤');
    talk?.onChange((on) => {
      this.mic.classList.toggle('live', on);
      this.input.placeholder = on ? this.guide.t('listening') : this.guide.t('placeholder');
    });
    this.title = h('span', { class: 'name' });
    this.log = h('div', { class: 'log', role: 'log', 'aria-live': 'polite' });
    this.input = h('input', { type: 'text', autocomplete: 'off', maxlength: '500' });
    this.form = h('form', { onsubmit: (e: Event) => this.submit(e) }, this.mic, this.input, h('button', { type: 'submit', class: 'btn primary' }));
    this.settings = h('div', { class: 'settings', hidden: true });
    this.el = h(
      'section',
      { class: 'chat', role: 'dialog', hidden: true, onkeydown: (e: Event) => (e as KeyboardEvent).key === 'Escape' && guide.dispatch({ type: 'chat-close' }) },
      h('header', {},
        this.title,
        h('button', { type: 'button', class: 'icon-btn', 'data-act': 'settings', onclick: () => this.toggleSettings() }, '⚙'),
        h('button', { type: 'button', class: 'icon-btn', 'data-act': 'hide', onclick: () => guide.dispatch({ type: 'hide' }) }, '⤓'),
        h('button', { type: 'button', class: 'icon-btn', 'data-act': 'close', onclick: () => guide.dispatch({ type: 'chat-close' }) }, '✕'),
      ),
      this.log,
      this.settings,
      this.form,
    );
  }

  update(s: GuideState): void {
    const wasHidden = this.el.hidden;
    this.el.hidden = !s.chatOpen || s.hidden;
    this.mic.hidden = !(this.voice?.canListen && (s.voice || this.talk));
    const key = `${s.lang}|${s.helpLevel}|${s.voice}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.relabel(s);
      if (this.showingSettings) this.renderSettings(s);
    }
    if (this.rendered !== s.messages.length || s.busy !== this.log.classList.contains('busy')) this.renderLog(s);
    if (wasHidden && !this.el.hidden && !this.showingSettings) queueMicrotask(() => this.input.focus());
  }

  private relabel(s: GuideState): void {
    const g = this.guide;
    this.title.textContent = s.name;
    this.el.setAttribute('aria-label', s.name);
    this.input.placeholder = g.t('placeholder');
    this.input.setAttribute('aria-label', g.t('placeholder'));
    (this.form.lastElementChild as HTMLElement).textContent = g.t('send');
    const label = (act: string, text: string) => {
      const b = this.el.querySelector(`[data-act="${act}"]`);
      b?.setAttribute('aria-label', text);
      b?.setAttribute('title', text);
    };
    label('settings', g.t('settings'));
    label('hide', g.t('hide'));
    label('close', g.t('close'));
    this.mic.setAttribute('aria-label', g.t('speak'));
    this.mic.title = g.t('speak');
  }

  private renderLog(s: GuideState): void {
    this.rendered = s.messages.length;
    this.log.classList.toggle('busy', s.busy);
    this.log.replaceChildren(
      ...s.messages.map((m, i) =>
        h('div', { class: `msg ${m.from}` }, m.text, i === s.messages.length - 1 && m.buttons ? buttonRow(m.buttons, this.onButton) : null),
      ),
      s.busy ? h('div', { class: 'typing' }, '…') : '',
    );
    this.log.scrollTop = this.log.scrollHeight;
  }

  private submit(e: Event): void {
    e.preventDefault();
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';
    this.guide.dispatch({ type: 'chat-send', text });
  }

  private async listen(): Promise<void> {
    if (!this.voice || this.mic.classList.contains('live')) return this.voice?.stopListening();
    this.mic.classList.add('live');
    try {
      const text = (await this.voice.listen(this.guide.getState().lang)).trim();
      if (text) this.guide.dispatch({ type: 'chat-send', text });
    } catch {
      /* microphone blocked: typing still works */
    } finally {
      this.mic.classList.remove('live');
    }
  }

  private toggleSettings(): void {
    this.showingSettings = !this.showingSettings;
    this.settings.hidden = !this.showingSettings;
    this.log.hidden = this.showingSettings;
    this.form.hidden = this.showingSettings;
    if (this.showingSettings) this.renderSettings(this.guide.getState());
  }

  private renderSettings(s: GuideState): void {
    const g = this.guide;
    const seg = (items: [string, string][], current: string, pick: (v: string) => void) =>
      h('div', { class: 'seg' }, ...items.map(([v, label]) =>
        h('button', { type: 'button', class: 'btn', 'aria-pressed': String(v === current), onclick: () => pick(v) }, label),
      ));
    const langs: Lang[] = g.config.languages ?? ['en', 'hi', 'hinglish'];
    const help: [HelpLevel, string][] = [['lots', g.t('helpLots')], ['tips', g.t('helpTips')]];
    this.settings.replaceChildren(
      h('div', {}, h('label', {}, g.t('helpLots') + ' / ' + g.t('helpTips')),
        seg(help, s.helpLevel === 'auto' ? g.help() : s.helpLevel, (v) => g.dispatch({ type: 'set-help', level: v as HelpLevel }))),
      h('div', {}, h('label', {}, g.t('language')),
        seg(langs.map((l) => [l, LANG_NAMES[l] ?? l]), s.lang, (v) => g.dispatch({ type: 'set-lang', lang: v }))),
      this.voice
        ? h('div', {}, h('label', {}, g.t('voice')),
            seg([['on', g.t('on')], ['off', g.t('off')]], s.voice ? 'on' : 'off', (v) => g.dispatch({ type: 'set-voice', on: v === 'on' })))
        : '',
    );
  }
}
