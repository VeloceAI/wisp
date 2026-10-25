import type { GuideConfig } from '@veloceai/wisp-core';
import { mount, type WispInstance } from './mount';

declare global {
  interface Window {
    WispConfig?: GuideConfig;
    Wisp?: { mount: typeof mount; instance: WispInstance | null; ready: Promise<WispInstance | null> };
  }
}

/**
 * Script-tag entry: `<script src="wisp.js" data-config="/wisp.json" defer></script>`.
 * Config comes from `data-config` (a JSON URL), else `window.WispConfig`.
 */
const script = document.currentScript as HTMLScriptElement | null;

async function boot(): Promise<WispInstance | null> {
  if (script?.dataset.auto === 'false') return null;
  let config: GuideConfig = window.WispConfig ?? {};
  const url = script?.dataset.config;
  if (url) {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok) config = { ...(await res.json()), ...window.WispConfig };
    } catch (err) {
      console.warn('[wisp] could not load config', err);
    }
  }
  if (script?.dataset.character) config = { ...config, character: script.dataset.character };
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
  const instance = mount(config);
  window.Wisp!.instance = instance;
  return instance;
}

window.Wisp = { mount, instance: null, ready: Promise.resolve(null) };
window.Wisp.ready = boot();
