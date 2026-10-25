import {
  CallLimiter,
  FaqChat,
  Lines,
  answerWithAI,
  createProvider,
  redact,
  withTimeout,
  type AIProvider,
  type ChatRequest,
  type ContentDoc,
  type FaqEntry,
  type ProviderConfig,
} from '@veloceai/wisp-core';
import { MemoryAudioCache, sha256, type AudioCache } from './audio-cache';

export interface WispProxyOptions {
  provider: ProviderConfig | AIProvider;
  /** Origins allowed to call this proxy. Requests from other origins get 403. */
  allowedOrigins?: string[];
  /** AI calls per visitor per day (default 20) and per IP per day (default 60). */
  perVisitor?: number;
  perIp?: number;
  timeoutMs?: number;
  guideName?: string;
  siteName?: string;
  /** Facts kept on the server, so answers don't depend on what the browser sends. */
  knowledge?: { faq?: FaqEntry[]; content?: ContentDoc[] };
  voice?: { enabled: boolean; cache?: AudioCache; maxChars?: number; voice?: string };
  /** Trust x-forwarded-for for the client IP (only behind your own load balancer). */
  trustProxy?: boolean;
  onTrack?: (event: { kind: string; visitor: string; [k: string]: unknown }) => void;
}

export type WispHandler = (req: Request, info?: { ip?: string }) => Promise<Response>;

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

/** A web-standard handler: mount it at any path; it routes on the last segment (chat, tts, stt, health). */
export function createWispHandler(opts: WispProxyOptions): WispHandler {
  const provider = 'chat' in opts.provider ? opts.provider : createProvider(opts.provider);
  const visitors = new CallLimiter(opts.perVisitor ?? 20);
  const ips = new CallLimiter(opts.perIp ?? 60);
  const cache = opts.voice?.cache ?? new MemoryAudioCache();
  const knowledge = opts.knowledge ? new FaqChat(opts.knowledge.faq ?? [], opts.knowledge.content ?? [], new Lines()) : null;

  const cors = (origin: string | null): Record<string, string> =>
    origin && opts.allowedOrigins?.includes(origin)
      ? { 'access-control-allow-origin': origin, vary: 'origin', 'access-control-allow-headers': 'content-type, x-wisp-visitor', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
      : {};

  const originAllowed = (req: Request) => {
    const origin = req.headers.get('origin');
    if (!origin) return true;
    if (opts.allowedOrigins?.includes(origin)) return true;
    return origin === new URL(req.url).origin;
  };

  return async (req, info = {}) => {
    const route = new URL(req.url).pathname.replace(/\/+$/, '').split('/').pop();
    const origin = req.headers.get('origin');
    const headers = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!originAllowed(req)) return json({ error: 'origin' }, 403);
    if (route === 'health' && req.method === 'GET') {
      return json({ ok: true, provider: provider.id, voice: !!(opts.voice?.enabled && provider.speak), listen: !!(opts.voice?.enabled && provider.transcribe) }, 200, headers);
    }
    if (req.method !== 'POST') return json({ error: 'not found' }, 404, headers);

    const visitor = (req.headers.get('x-wisp-visitor') ?? '').slice(0, 64) || 'anon';
    const ip = info.ip ?? (opts.trustProxy ? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() : undefined) ?? 'unknown';
    const spend = () => {
      if (!visitors.take(visitor) || !ips.take(ip)) throw new OverLimit();
    };

    try {
      if (route === 'chat') return json(await chat(await readJson(req), visitor, spend), 200, headers);
      if (route === 'tts' && opts.voice?.enabled && provider.speak) return await tts(await readJson(req), headers, spend);
      if (route === 'stt' && opts.voice?.enabled && provider.transcribe) return await stt(req, headers, spend);
      return json({ error: 'not found' }, 404, headers);
    } catch (err) {
      if (err instanceof OverLimit) return json({ error: 'limit' }, 429, headers);
      const status = err instanceof BadRequest ? 400 : 502;
      return json({ error: status === 400 ? (err as Error).message : 'ai unavailable' }, status, headers);
    }
  };

  async function chat(body: Record<string, unknown>, visitor: string, spend: () => void) {
    const question = str(body.question, 500);
    if (!question) throw new BadRequest('question required');
    spend();
    const lang = str(body.lang, 12) || 'en';
    const sent = Array.isArray(body.context) ? (body.context as ChatRequest['context']) : [];
    const context = [...(knowledge?.retrieve(question, lang) ?? []), ...sent.filter((c) => c && typeof c.text === 'string')];
    const history = Array.isArray(body.history) ? (body.history as ChatRequest['history']) : [];
    const reply = await answerWithAI(
      provider,
      { question, lang, context, history, guideName: opts.guideName, siteName: opts.siteName },
      opts.timeoutMs ?? 8000,
    );
    opts.onTrack?.({ kind: 'ai-question', visitor, question: redact(question), found: reply.found, lang });
    return reply;
  }

  // Cached audio is free: a fixed line is paid for once, then replayed for everyone.
  async function tts(body: Record<string, unknown>, headers: Record<string, string>, spend: () => void) {
    const text = redact(str(body.text, opts.voice?.maxChars ?? 400));
    if (!text) throw new BadRequest('text required');
    const voice = opts.voice?.voice;
    const key = await sha256(`${provider.id}|${voice ?? ''}|${text}`);
    let audio = await cache.get(key);
    if (!audio) {
      spend();
      const out = await withTimeout(opts.timeoutMs ?? 8000, (signal) => provider.speak!(text, { voice, signal }));
      audio = out.audio;
      await cache.set(key, audio);
    }
    return new Response(audio, { headers: { ...headers, 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
  }

  async function stt(req: Request, headers: Record<string, string>, spend: () => void) {
    const lang = new URL(req.url).searchParams.get('lang') ?? undefined;
    const blob = await req.blob();
    if (blob.size === 0 || blob.size > 5_000_000) throw new BadRequest('audio size');
    spend();
    const text = await withTimeout(opts.timeoutMs ?? 8000, (signal) => provider.transcribe!(blob, { lang, signal }));
    return json({ text: redact(text) }, 200, headers);
  }
}

class BadRequest extends Error {}
class OverLimit extends Error {}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 64_000) throw new BadRequest('body too large');
  try {
    const v = JSON.parse(text);
    if (v && typeof v === 'object') return v;
  } catch {
    /* handled below */
  }
  throw new BadRequest('invalid json');
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
