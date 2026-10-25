import { describe, expect, it, vi } from 'vitest';
import { mockProvider } from '@veloceai/wisp-core';
import { createWispHandler } from '../src/index';

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://shop.test/wisp/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://shop.test', 'x-wisp-visitor': 'v1', ...headers },
    body: JSON.stringify(body),
  });

describe('wisp proxy', () => {
  it('answers chat from server-side knowledge', async () => {
    const handler = createWispHandler({
      provider: mockProvider(),
      knowledge: { content: [{ title: 'Story', text: 'We began in Jaipur in 2021.' }] },
    });
    const res = await handler(post('chat', { question: 'when did you begin in jaipur?', lang: 'en' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: 'We began in Jaipur in 2021.', found: true });
  });

  it('blocks other origins unless allowed', async () => {
    const handler = createWispHandler({ provider: mockProvider(), allowedOrigins: ['https://ok.test'] });
    expect((await handler(post('chat', { question: 'hi' }, { origin: 'https://evil.test' }))).status).toBe(403);
    const ok = await handler(post('chat', { question: 'hi' }, { origin: 'https://ok.test' }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://ok.test');
  });

  it('caps AI calls per visitor', async () => {
    const handler = createWispHandler({ provider: mockProvider(), perVisitor: 2 });
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await handler(post('chat', { question: 'hi' }))).status);
    expect(codes).toEqual([200, 200, 429]);
  });

  it('rejects bad input and hides provider errors', async () => {
    const broken = createWispHandler({ provider: { id: 'x', chat: async () => Promise.reject(new Error('secret key invalid')) } });
    expect((await broken(post('chat', {}))).status).toBe(400);
    const res = await broken(post('chat', { question: 'hi' }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain('secret');
  });

  it('speaks with a cache so repeated lines are free', async () => {
    const provider = mockProvider();
    const speak = vi.spyOn(provider, 'speak');
    const handler = createWispHandler({ provider, voice: { enabled: true }, perVisitor: 1 });
    const first = await handler(post('tts', { text: 'Welcome back!' }));
    const second = await handler(post('tts', { text: 'Welcome back!' }));
    expect([first.status, second.status]).toEqual([200, 200]);
    expect(second.headers.get('content-type')).toBe('audio/mpeg');
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('keeps voice off unless enabled', async () => {
    const handler = createWispHandler({ provider: mockProvider() });
    expect((await handler(post('tts', { text: 'hi' }))).status).toBe(404);
    const health = await handler(new Request('http://shop.test/wisp/health'));
    expect(await health.json()).toMatchObject({ ok: true, voice: false });
  });

  it('redacts secrets before they reach the AI', async () => {
    const seen: string[] = [];
    const handler = createWispHandler({ provider: mockProvider((r) => (seen.push(r.messages[0]!.content), '{"answer":"ok","found":true}')) });
    await handler(post('chat', { question: 'my card is 4111 1111 1111 1111, help' }));
    expect(seen[0]).toContain('[card hidden]');
  });
});
