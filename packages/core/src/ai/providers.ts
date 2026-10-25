import { AIError, type AIMessage, type AIProvider, type AIRequest, type ProviderConfig } from './types';

type Fetch = typeof fetch;

const DEFAULTS = {
  openai: { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq: { base: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  openrouter: { base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  anthropic: { base: 'https://api.anthropic.com/v1', model: 'claude-opus-5-5' },
  gemini: { base: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash' },
  ollama: { base: 'http://localhost:11434', model: 'llama3.2' },
} as const;

const ANTHROPIC_VERSION = '2026-10-21';
// Models that accept the server-side refusal fallback in its "default" form.
const ANTHROPIC_FALLBACK_MODELS = /^claude-(opus-5|fable-5|sonnet-5-5)/;

async function postJson(f: Fetch, url: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal): Promise<any> {
  const res = await f(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AIError(`${res.status} ${text.slice(0, 300)}`, res.status);
  }
  return res.json();
}

const withJsonHint = (req: AIRequest) => (req.json ? `${req.system}\n\nReply with one JSON object only.` : req.system);

function openAICompatible(id: string, cfg: ProviderConfig, f: Fetch, base: string, model: string): AIProvider {
  const url = (cfg.baseUrl ?? base).replace(/\/$/, '');
  const auth: Record<string, string> = cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {};
  const tokenField = id === 'openai' ? 'max_completion_tokens' : 'max_tokens';
  return {
    id,
    async chat(req) {
      const data = await postJson(
        f,
        `${url}/chat/completions`,
        auth,
        {
          model: cfg.model ?? model,
          messages: [{ role: 'system', content: withJsonHint(req) }, ...req.messages],
          [tokenField]: req.maxTokens ?? 600,
          ...(id === 'openai' ? {} : { temperature: req.temperature ?? 0.4 }),
          ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        },
        req.signal,
      );
      return String(data?.choices?.[0]?.message?.content ?? '');
    },
    async speak(text, opts) {
      const res = await f(`${url}/audio/speech`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...auth },
        body: JSON.stringify({ model: cfg.ttsModel ?? 'gpt-4o-mini-tts', voice: opts.voice ?? cfg.ttsVoice ?? 'alloy', input: text, response_format: 'mp3' }),
        signal: opts.signal,
      });
      if (!res.ok) throw new AIError(`tts ${res.status}`, res.status);
      return { audio: await res.arrayBuffer(), mime: 'audio/mpeg' };
    },
    async transcribe(audio, opts) {
      const form = new FormData();
      form.append('file', audio, 'speech.webm');
      form.append('model', cfg.sttModel ?? (id === 'groq' ? 'whisper-large-v3-turbo' : 'whisper-1'));
      if (opts.lang && /^[a-z]{2}$/.test(opts.lang)) form.append('language', opts.lang);
      const res = await f(`${url}/audio/transcriptions`, { method: 'POST', headers: auth, body: form, signal: opts.signal });
      if (!res.ok) throw new AIError(`stt ${res.status}`, res.status);
      return String((await res.json())?.text ?? '');
    },
  };
}

function anthropic(cfg: ProviderConfig, f: Fetch): AIProvider {
  const url = (cfg.baseUrl ?? DEFAULTS.anthropic.base).replace(/\/$/, '');
  const model = cfg.model ?? DEFAULTS.anthropic.model;
  const fallback = ANTHROPIC_FALLBACK_MODELS.test(model);
  return {
    id: 'anthropic',
    async chat(req) {
      const data = await postJson(
        f,
        `${url}/messages`,
        {
          'x-api-key': cfg.apiKey ?? '',
          'anthropic-version': ANTHROPIC_VERSION,
          ...(fallback ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
        },
        {
          model,
          max_tokens: req.maxTokens ?? 2048,
          system: withJsonHint(req),
          messages: req.messages,
          output_config: { effort: 'low' },
          ...(fallback ? { fallbacks: 'default' } : {}),
        },
        req.signal,
      );
      if (data?.stop_reason === 'refusal') throw new AIError('refused');
      return (data?.content ?? [])
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('');
    },
  };
}

function gemini(cfg: ProviderConfig, f: Fetch): AIProvider {
  const url = (cfg.baseUrl ?? DEFAULTS.gemini.base).replace(/\/$/, '');
  const model = cfg.model ?? DEFAULTS.gemini.model;
  return {
    id: 'gemini',
    async chat(req) {
      const data = await postJson(
        f,
        `${url}/models/${encodeURIComponent(model)}:generateContent`,
        { 'x-goog-api-key': cfg.apiKey ?? '' },
        {
          systemInstruction: { parts: [{ text: req.system }] },
          contents: req.messages.map((m: AIMessage) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: {
            maxOutputTokens: req.maxTokens ?? 600,
            temperature: req.temperature ?? 0.4,
            ...(req.json ? { responseMimeType: 'application/json' } : {}),
          },
        },
        req.signal,
      );
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      return parts.map((p: { text?: string }) => p.text ?? '').join('');
    },
  };
}

function ollama(cfg: ProviderConfig, f: Fetch): AIProvider {
  const url = (cfg.baseUrl ?? DEFAULTS.ollama.base).replace(/\/$/, '');
  return {
    id: 'ollama',
    async chat(req) {
      const data = await postJson(
        f,
        `${url}/api/chat`,
        {},
        {
          model: cfg.model ?? DEFAULTS.ollama.model,
          stream: false,
          messages: [{ role: 'system', content: withJsonHint(req) }, ...req.messages],
          options: { temperature: req.temperature ?? 0.4, num_predict: req.maxTokens ?? 600 },
          ...(req.json ? { format: 'json' } : {}),
        },
        req.signal,
      );
      return String(data?.message?.content ?? '');
    },
  };
}

/**
 * Offline stand-in used in tests and demos: answers with the first context line that shares
 * a word with the question, so the whole AI path can be exercised without a key.
 */
export function mockProvider(respond?: (req: AIRequest) => string | Promise<string>): AIProvider {
  return {
    id: 'mock',
    async chat(req) {
      if (respond) return respond(req);
      const question = req.messages.at(-1)?.content.toLowerCase() ?? '';
      const words = new Set(question.match(/[\p{L}\p{N}]{3,}/gu) ?? []);
      const lines = req.system.split('\n').filter((l) => l.startsWith('- '));
      const hit = lines.find((l) => (l.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).some((w) => words.has(w)));
      const text = hit ? hit.slice(2).replace(/^\[[^\]]*\]\s*/, '') : "I don't know that one yet.";
      return req.json ? JSON.stringify({ answer: text, found: !!hit }) : text;
    },
    async speak(text) {
      return { audio: new TextEncoder().encode(`mock-audio:${text}`).buffer as ArrayBuffer, mime: 'audio/mpeg' };
    },
    async transcribe() {
      return 'mock transcript';
    },
  };
}

export function createProvider(cfg: ProviderConfig, f: Fetch = globalThis.fetch.bind(globalThis)): AIProvider {
  switch (cfg.provider) {
    case 'openai':
    case 'groq':
    case 'openrouter': {
      const d = DEFAULTS[cfg.provider];
      return openAICompatible(cfg.provider, cfg, f, d.base, d.model);
    }
    case 'anthropic':
      return anthropic(cfg, f);
    case 'gemini':
      return gemini(cfg, f);
    case 'ollama':
      return ollama(cfg, f);
    case 'mock':
      return mockProvider();
    default:
      throw new AIError(`Unknown provider: ${String((cfg as ProviderConfig).provider)}`);
  }
}
