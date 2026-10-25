# Wisp — plan

One package that adds a living character guide to any website, mobile app or desktop app.
Named **Wisp** by the user on 2026-10-25 (was "Veloce Guide"). Repo `VeloceAI/wisp`; folder stays `C:\VeloceAI\veloce-guide`.
Packages `@veloceai/wisp-*`, global `window.Wisp`, DOM events `wisp:*`.
MIT, our own code. Never use `@bible-strong/avatar-*` (AGPL).

## Layout (npm workspaces, TypeScript)

| Package | What it holds |
|---|---|
| `packages/core` (`@veloceai/wisp-core`) | No UI. Character definition + moods + face geometry, animator, guide brain (events → mood/line/anchor), tours, lines (en/hi/hinglish), FAQ chat, AI providers, cost cap, safety, page model, action planner, memory |
| `packages/web` (`@veloceai/wisp-web`) | DOM shell in shadow DOM: SVG renderer, bubble, chat panel, placement, watchers, page reader, action executor, browser voice. Builds `wisp.js` for a one-line script tag |
| `packages/react`, `packages/vue` | Thin component wrappers around the web mount |
| `packages/proxy` (`@veloceai/wisp-proxy`) | Tiny owner-hosted server that keeps AI keys server-side; per-visitor cap, timeout, redaction |
| `packages/native` | Expo / React Native renderer (step 5) |
| `apps/demo` | Demo shop page on port 5180 (Vite) with the proxy mounted on a mock provider |

The character is drawn from pure geometry computed in core, so web (SVG DOM) and native (react-native-svg) renderers stay thin.

## Step 1 — core + web: character, moods, guiding, non-AI chat, demo
- [x] Repo init, workspace, tsconfig, vitest, build
- [x] core: character definition schema + defaults + 3 sample characters
- [x] core: 12 moods → face params; geometry builder; animator (blink, breathe, gaze, giggle, reduced motion)
- [x] core: lines bank (en/hi/hinglish), language detection, templating
- [x] core: guide brain — welcome, tour, section tips, app events (success/error/loading/idle), sleepy/sleeping, wake, tap/giggle, hide
- [x] core: FAQ/content search index (BM25, Hindi + Hinglish synonyms) + non-AI chat with tap-to-answer buttons
- [x] core: memory store (prefs: hidden, language, help level, tour progress, visits)
- [x] web: shadow-DOM shell, SVG renderer, bubble with buttons, chat panel, hide tab
- [x] web: placement — dock in corner, hop beside the section being read, never cover buttons on phones
- [x] web: watchers — sections in view, cursor gaze, idle, leave nudge, `wisp:*` DOM events
- [x] web: script-tag auto entry (`data-config`), IIFE build
- [x] react + vue wrappers
- [x] demo page on 5180
- [x] tests (core + web jsdom), browser check, README, push

## Step 2 — AI providers + voice
- [x] Provider interface; OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama, Mock, Proxy client
- [x] Budget: per-visitor call cap, timeout, prewritten fallback
- [x] Proxy package (node http + web-standard handler for Next.js); redaction; CORS/origin allowlist
- [x] AI chat grounded on site content, in the visitor's language
- [x] Voice: browser speechSynthesis/recognition; AI TTS/STT via proxy; recorded clips for fixed lines + clip cache; off by default

## Step 3 — page understanding
- [x] DOM/a11y reader → compact page model (headings, landmarks, buttons, links, forms, text), mutation re-read
- [x] Sensitive-field masking, blocked areas, `data-guide-*` labels
- [x] Explain page, find + point (scroll, highlight, guide moves beside), answer from page text (AI and non-AI)

## Step 4 — actions
- [x] Site-declared actions (tool-style) + generic DOM actions (click, type, select, scroll, navigate, press)
- [x] Rule planner (no AI) + AI planner (JSON plan)
- [x] Executor: step-by-step narration, highlight, Stop button, confirm before final steps, refuse sensitive fields/blocked areas, resume after navigation

## Step 5 — Expo / React Native renderer
## Step 6 — adaptive memory + owner report
## Step 7 — browser extension (later)

## Review

### Step 1 (2026-10-25)
- Shipped: core brain + drawn character (5 shapes, 12 moods, 5 samples), web widget, script-tag bundle (63 KB, 22 KB gzip), React/Vue wrappers, demo shop, mood gallery, one-line demo page.
- Tests: 43 passing (core flows, chat in en/hi/hinglish, drawing has no NaN, jsdom widget, placement).
- Checked in the browser: welcome, tour with highlight and hops, section tips, Hinglish chat with UI switching language, error fix bubble, phone layout.
- Found and fixed: FAQ matching too strict on small FAQs; character and bubble flew in from the corner on first paint; `hidden` ignored on reset buttons.
- Language support opened up to any language code after the user asked.
- `guide.ts` is 490 lines; split reactions out before it grows.

### Step 2 (2026-10-25)
- Shipped: 6 providers + mock behind one interface (raw fetch, no SDKs), call limiter + timeout, redaction, grounded JSON chat prompt that treats facts and questions as data, AiAnswerer with FAQ-first and fallback, `@veloceai/wisp-proxy` (web handler, Node adapter, CLI, origin allowlist, per-visitor/IP caps, cached TTS, STT), web transport, WebVoice (clips → AI voice → browser voice; browser or recorded mic input), voice toggle in settings.
- Tests: 66 passing. Proxy tested for origin block, caps, 400/502 without leaking errors, TTS cache, redaction.
- Browser check: chat answered through the demo's mock proxy end to end; voice toggle shows, off by default.
- Not tested live: real provider calls (no key used, per the brief). Request shapes are unit-tested against each provider's documented format.
- Split app reactions out of guide.ts (now 448 lines).

### Step 3 (2026-10-25)
- Shipped: core page model, element finder (role words, sections, fuzzy prefix), no-AI page summary, page-text answers and AI facts, page intents in en/hinglish/hi; web PageReader (roles, accessible names, sections, passages, stable refs, mutation re-read), sensitive-field detection, blocked selectors/paths, `data-wisp-*` labels; chat points at what it finds.
- Tests: 76 passing; values of password/card fields proven absent from the model.
- Browser check: "what's on this page?" summary and "password field kahan hai" pointing on the demo.
- Fixed: summary listed product cards as sections; now uses top-level headings only.

### Step 4 (2026-10-25)
- Shipped: action step types, rule planner (en + Hinglish: search with price limit, sort, add to cart, click/open, scroll, type, select, declared actions), AI planner via proxy `/plan` with strict validation against real refs and declared names, ActionRunner (narrate, highlight, Stop, confirm before final, refuse private fields and blocked pages, resume after navigation), DomDriver (framework-safe typing, option matching, search vs real form submits), `registerAction` / `wisp:run`, tap-to-run action buttons.
- Tests: 86 passing, including confirm Yes/No, Stop mid-run, password refusal, declared final action.
- Browser check: the brief's example ran on the demo shop end to end.
- Fixed: demo shop search matched literally; now matches words.
- Next: step 5 (Expo renderer) and step 6 (adaptive memory, owner report) in a later session.

### Voice shopping, phase A (2026-10-26)
- Shipped: shopping parser with word packs (en, hinglish, hi; any other language via a pack), ShopAssistant (find, pick by number/cheapest, amounts turned into pack sizes, lists, more/set/remove, cart, total, checkout that needs a tap), talk mode loop (listen → reply spoken → listen until "done/bas" or two silences), registerShop / `shop` option, Indian speech locales, QuickBasket demo at /grocery.html, word-pack template.
- Tidy: guide.ts split (tips scheduler, command handlers) back to 472 lines.
- Tests: 116 passing. Headless Chrome run of the full conversation on the demo.
- Not covered: live microphone (needs a person; the loop is tested with a scripted voice), barge-in while speaking (tap the mic instead).
- Next (phase B, AI): open-ended lists and recipes, budgets, smarter substitutes, AI intent fallback for languages without a pack.
