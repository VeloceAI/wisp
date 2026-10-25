import { InMemoryStore, type KeyValueStore } from '@veloceai/wisp-core';

/** localStorage (or sessionStorage) when the browser allows it, otherwise memory for this page view. */
export function browserStore(kind: 'localStorage' | 'sessionStorage' = 'localStorage'): KeyValueStore {
  const fallback = new InMemoryStore();
  return {
    get(key) {
      try {
        return window[kind].getItem(key) ?? fallback.get(key);
      } catch {
        return fallback.get(key);
      }
    },
    set(key, value) {
      fallback.set(key, value);
      try {
        window[kind].setItem(key, value);
      } catch {
        /* private mode or blocked storage */
      }
    },
  };
}
