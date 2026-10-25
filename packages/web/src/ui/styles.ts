export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000;
  font: var(--wisp-font-size, 14px)/1.45 var(--wisp-font, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari", sans-serif);
  color: var(--wisp-ink); --wisp-ink: #1d1b2e; --wisp-paper: #ffffff; --wisp-muted: #6b6880; --wisp-line: rgba(30,20,70,.12); --wisp-radius: 16px; }
.layer[data-mode="dark"] { --wisp-ink: #f2f0ff; --wisp-paper: #1f1d2b; --wisp-muted: #a9a6c0; --wisp-line: rgba(255,255,255,.14); }
@media (prefers-color-scheme: dark) {
  .layer[data-mode="auto"] { --wisp-ink: #f2f0ff; --wisp-paper: #1f1d2b; --wisp-muted: #a9a6c0; --wisp-line: rgba(255,255,255,.14); }
}
.figure { position: absolute; left: 0; top: 0; width: var(--wisp-size); height: var(--wisp-size);
  pointer-events: auto; will-change: transform; }
.figure.placed { transition: transform .55s cubic-bezier(.34,1.3,.64,1), opacity .3s; }
.figure.mini { opacity: .55; }
.figure.mini:hover, .figure.mini:focus-within { opacity: 1; }
.body-btn { all: unset; display: block; width: 100%; height: 100%; cursor: pointer; border-radius: 50%;
  -webkit-tap-highlight-color: transparent; }
.body-btn:focus-visible { outline: 3px solid var(--wisp-accent); outline-offset: 2px; }
.body-btn svg { width: 100%; height: 100%; display: block; overflow: visible; }
.hide-btn { all: unset; position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; border-radius: 50%;
  background: var(--wisp-paper); color: var(--wisp-muted); box-shadow: 0 1px 4px rgba(0,0,0,.2);
  display: grid; place-items: center; font-size: 14px; cursor: pointer; opacity: 0; transition: opacity .2s; }
.figure:hover .hide-btn, .hide-btn:focus-visible, .figure.touch .hide-btn { opacity: 1; }
.hide-btn:focus-visible { outline: 2px solid var(--wisp-accent); }
.tab { all: unset; position: absolute; bottom: 18px; pointer-events: auto; cursor: pointer;
  background: var(--wisp-accent); color: #fff; padding: 8px 12px; font: 600 13px/1 var(--wisp-font, system-ui, sans-serif);
  box-shadow: 0 2px 10px rgba(0,0,0,.2); }
.tab.right { right: 0; border-radius: var(--wisp-radius) 0 0 var(--wisp-radius); }
.tab.left { left: 0; border-radius: 0 var(--wisp-radius) var(--wisp-radius) 0; }
.tab:focus-visible { outline: 3px solid var(--wisp-soft); }
.bubble { position: absolute; left: 0; top: 0; max-width: min(300px, calc(100vw - 24px)); pointer-events: auto;
  background: var(--wisp-paper); color: var(--wisp-ink); border-radius: var(--wisp-radius); padding: 12px 14px;
  box-shadow: 0 8px 30px rgba(20,10,60,.18), 0 0 0 1px var(--wisp-line);
  opacity: 0; scale: .96; visibility: hidden; transition: opacity .2s, scale .25s, visibility 0s .2s; }
.bubble.show { opacity: 1; scale: 1; visibility: visible; transition: opacity .2s, scale .25s; }
.bubble .title { font-size: 12px; font-weight: 600; color: var(--wisp-accent); margin-bottom: 4px; }
.bubble .x { all: unset; position: absolute; top: 6px; right: 8px; color: var(--wisp-muted); cursor: pointer; font-size: 14px; padding: 2px 4px; }
.bubble .text { padding-right: 14px; }
.buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.btn { all: unset; cursor: pointer; padding: 7px 12px; border-radius: calc(var(--wisp-radius) * 4); font-size: 13px; font-weight: 500;
  background: transparent; color: var(--wisp-ink); box-shadow: inset 0 0 0 1px var(--wisp-line); }
.btn:hover { background: var(--wisp-line); }
.btn.primary { background: var(--wisp-accent); color: #fff; box-shadow: none; }
.btn.primary:hover { filter: brightness(1.08); }
.btn:focus-visible { outline: 2px solid var(--wisp-accent); outline-offset: 2px; }
.highlight { position: absolute; pointer-events: none; border-radius: 10px; box-shadow: 0 0 0 3px var(--wisp-accent), 0 0 0 9px var(--wisp-soft);
  opacity: 0; transition: opacity .25s; }
.highlight.show { opacity: 1; animation: wisp-pulse 1.6s ease-in-out infinite; }
@keyframes wisp-pulse { 50% { box-shadow: 0 0 0 3px var(--wisp-accent), 0 0 0 14px transparent; } }
.chat { position: absolute; width: min(var(--wisp-chat-width, 360px), calc(100vw - 24px)); height: min(var(--wisp-chat-height, 520px), calc(100vh - 140px));
  pointer-events: auto; background: var(--wisp-paper); color: var(--wisp-ink); border-radius: calc(var(--wisp-radius) + 4px);
  box-shadow: 0 16px 50px rgba(20,10,60,.25), 0 0 0 1px var(--wisp-line); display: flex; flex-direction: column; overflow: hidden; }
.chat[hidden] { display: none; }
.chat header { display: flex; align-items: center; gap: 8px; padding: 12px 12px 10px 16px; border-bottom: 1px solid var(--wisp-line); }
.chat header .name { font-weight: 650; flex: 1; }
.icon-btn { all: unset; cursor: pointer; width: 30px; height: 30px; display: grid; place-items: center; border-radius: calc(var(--wisp-radius) / 2); color: var(--wisp-muted); }
.icon-btn:hover { background: var(--wisp-line); color: var(--wisp-ink); }
.icon-btn:focus-visible { outline: 2px solid var(--wisp-accent); }
.log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.msg { max-width: 85%; padding: 9px 12px; border-radius: calc(var(--wisp-radius) - 2px); white-space: pre-wrap; word-wrap: break-word; }
.msg.guide { align-self: flex-start; background: var(--wisp-line); border-bottom-left-radius: 4px; }
.msg.user { align-self: flex-end; background: var(--wisp-accent); color: #fff; border-bottom-right-radius: 4px; }
.msg .buttons { margin-top: 8px; }
.typing { align-self: flex-start; color: var(--wisp-muted); font-size: 13px; }
.chat form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--wisp-line); }
.mic.live { color: #fff; background: #e5484d; animation: wisp-pulse 1.2s infinite; }
.chat input { all: unset; flex: 1; padding: 9px 12px; border-radius: calc(var(--wisp-radius) - 4px); box-shadow: inset 0 0 0 1px var(--wisp-line); color: var(--wisp-ink); }
.chat input:focus-visible { box-shadow: inset 0 0 0 2px var(--wisp-accent); }
.settings { padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1; }
.settings label { font-size: 12px; color: var(--wisp-muted); display: block; margin-bottom: 6px; }
.seg { display: flex; flex-wrap: wrap; gap: 6px; }
.seg .btn[aria-pressed="true"] { background: var(--wisp-accent); color: #fff; box-shadow: none; }
@media (max-width: 640px) {
  .chat { height: min(70vh, calc(100vh - 120px)); }
}
@media (prefers-reduced-motion: reduce) {
  .figure, .bubble, .highlight { transition: none; }
  .highlight.show { animation: none; }
}
`;
