import { InMemoryStore, type KeyValueStore } from '@veloceai/wisp-core';

/** localStorage when the browser allows it, otherwise memory for this page view. */
export function browserStore(): KeyValueStore {
  const fallback = new InMemoryStore();
  return {
    get(key) {
      try {
        return window.localStorage.getItem(key) ?? fallback.get(key);
      } catch {
        return fallback.get(key);
      }
    },
    set(key, value) {
      fallback.set(key, value);
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* private mode or blocked storage */
      }
    },
  };
}
