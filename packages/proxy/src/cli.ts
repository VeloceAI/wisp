#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import type { ProviderName } from '@veloceai/wisp-core';
import { fileAudioCache, serve } from './node';

const env = process.env;
const knowledge = env.WISP_KNOWLEDGE ? JSON.parse(readFileSync(env.WISP_KNOWLEDGE, 'utf8')) : undefined;
const port = Number(env.WISP_PORT ?? 5181);
const path = env.WISP_PATH ?? '/wisp';

serve({
  port,
  path,
  provider: {
    provider: (env.WISP_PROVIDER ?? 'mock') as ProviderName,
    apiKey: env.WISP_API_KEY,
    model: env.WISP_MODEL,
    baseUrl: env.WISP_BASE_URL,
  },
  allowedOrigins: env.WISP_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean),
  perVisitor: env.WISP_PER_VISITOR ? Number(env.WISP_PER_VISITOR) : undefined,
  guideName: env.WISP_GUIDE_NAME,
  siteName: env.WISP_SITE_NAME,
  knowledge: knowledge && { faq: knowledge.faq, content: knowledge.content },
  voice: { enabled: env.WISP_VOICE === 'on', cache: fileAudioCache(env.WISP_AUDIO_DIR ?? '.wisp-cache/audio') },
});
console.log(`wisp-proxy on http://localhost:${port}${path} using ${env.WISP_PROVIDER ?? 'mock'}`);
