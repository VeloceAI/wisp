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
- [ ] Repo init, workspace, tsconfig, vitest, build
- [ ] core: character definition schema + defaults + 3 sample characters
- [ ] core: 12 moods → face params; geometry builder; animator (blink, breathe, gaze, giggle, reduced motion)
- [ ] core: lines bank (en/hi/hinglish), language detection, templating
- [ ] core: guide brain — welcome, tour, section tips, app events (success/error/loading/idle), sleepy/sleeping, wake, tap/giggle, hide
- [ ] core: FAQ/content search index (BM25, Hindi + Hinglish synonyms) + non-AI chat with tap-to-answer buttons
- [ ] core: memory store (prefs: hidden, language, help level, tour progress, visits)
- [ ] web: shadow-DOM shell, SVG renderer, bubble with buttons, chat panel, hide tab
- [ ] web: placement — dock in corner, hop beside the section being read, never cover buttons on phones
- [ ] web: watchers — sections in view, cursor gaze, idle, leave nudge, `wisp:*` DOM events
- [ ] web: script-tag auto entry (`data-config`), IIFE build
- [ ] react + vue wrappers
- [ ] demo page on 5180
- [ ] tests (core + web jsdom), browser check, README, push

## Step 2 — AI providers + voice
- [ ] Provider interface; OpenAI, Anthropic, Gemini, Groq, OpenRouter, Ollama, Mock, Proxy client
- [ ] Budget: per-visitor call cap, timeout, prewritten fallback
- [ ] Proxy package (node http + web-standard handler for Next.js); redaction; CORS/origin allowlist
- [ ] AI chat grounded on site content, in the visitor's language
- [ ] Voice: browser speechSynthesis/recognition; AI TTS/STT via proxy; recorded clips for fixed lines + clip cache; off by default

## Step 3 — page understanding
- [ ] DOM/a11y reader → compact page model (headings, landmarks, buttons, links, forms, text), mutation re-read
- [ ] Sensitive-field masking, blocked areas, `data-guide-*` labels
- [ ] Explain page, find + point (scroll, highlight, guide moves beside), answer from page text (AI and non-AI)

## Step 4 — actions
- [ ] Site-declared actions (tool-style) + generic DOM actions (click, type, select, scroll, navigate, press)
- [ ] Rule planner (no AI) + AI planner (JSON plan)
- [ ] Executor: step-by-step narration, highlight, Stop button, confirm before final steps, refuse sensitive fields/blocked areas, resume after navigation

## Step 5 — Expo / React Native renderer
## Step 6 — adaptive memory + owner report
## Step 7 — browser extension (later)

## Review
(filled in at the end of each step)
