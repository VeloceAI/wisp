import { AiAnswerer, pageFacts, redact, withTimeout, type ChatReply, type ChatTransport, type Guide, type KeyValueStore } from '@veloceai/wisp-core';

/** A random id per browser so the proxy can cap AI calls per visitor. Not linked to the person. */
export function visitorId(store: KeyValueStore): string {
  let id = store.get('wisp:visitor');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    store.set('wisp:visitor', id);
  }
  return id;
}

export function proxyTransport(endpoint: string, visitor: string, timeoutMs = 8000): ChatTransport {
  const base = endpoint.replace(/\/$/, '');
  return (req) =>
    withTimeout(timeoutMs, async (signal) => {
      const res = await fetch(`${base}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-wisp-visitor': visitor },
        body: JSON.stringify({ ...req, question: redact(req.question) }),
        signal,
      });
      if (!res.ok) throw new Error(`proxy ${res.status}`);
      return (await res.json()) as ChatReply;
    });
}

export function connectAI(guide: Guide, store: KeyValueStore): void {
  const ai = guide.config.ai;
  if (!ai?.endpoint) return;
  guide.setAnswerer(
    new AiAnswerer({
      faq: guide.faq,
      send: proxyTransport(ai.endpoint, visitorId(store), ai.timeoutMs),
      guideName: guide.character.name,
      siteName: guide.config.siteName ?? document.title,
      history: () => guide.getState().messages,
      extraContext: (q) => (guide.page ? pageFacts(guide.page.read(), q) : []),
      maxCalls: ai.maxCalls,
    }),
  );
}
