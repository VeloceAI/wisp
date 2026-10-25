import { describe, expect, it, vi } from 'vitest';
import { mockProvider } from '@veloceai/wisp-core';
import { createWispHandler } from '../src/index';
import { pcm16ToFloat, pcmToWav } from '../src/local-stt';

const pcm = (seconds: number) => new Int16Array(16000 * seconds).fill(1000).buffer;
const post = (body: ArrayBuffer, type = 'audio/pcm;rate=16000') =>
  new Request('http://shop.test/wisp/stt?lang=hinglish', { method: 'POST', headers: { 'content-type': type, 'x-wisp-visitor': 'v' }, body });

describe('free speech to text on the server', () => {
  it('transcribes browser PCM with the local engine and never spends AI calls', async () => {
    const listen = vi.fn(async (audio: Float32Array, lang?: string) => `heard ${audio.length} samples in ${lang}`);
    const provider = mockProvider();
    const transcribe = vi.spyOn(provider as Required<typeof provider>, 'transcribe');
    const handler = createWispHandler({ provider, voice: { enabled: true, listen }, perVisitor: 0 });
    const res = await handler(post(pcm(1)));
    expect(await res.json()).toEqual({ text: 'heard 16000 samples in hinglish' });
    expect(transcribe).not.toHaveBeenCalled();
    const health = await (await handler(new Request('http://shop.test/wisp/health'))).json();
    expect(health.listen).toBe(true);
  });

  it('falls back to the AI provider (as WAV) when there is no local engine', async () => {
    const provider = mockProvider();
    const transcribe = vi.spyOn(provider as Required<typeof provider>, 'transcribe');
    const handler = createWispHandler({ provider, voice: { enabled: true } });
    expect((await handler(post(pcm(1)))).status).toBe(200);
    expect((transcribe.mock.calls[0]![0] as Blob).type).toBe('audio/wav');
  });

  it('refuses overly long audio', async () => {
    const handler = createWispHandler({ provider: mockProvider(), voice: { enabled: true, listen: async () => 'x' } });
    expect((await handler(post(pcm(25)))).status).toBe(400);
  });

  it('converts PCM correctly', () => {
    const f = pcm16ToFloat(new Int16Array([0, 16384, -32768]).buffer);
    expect([...f]).toEqual([0, 0.5, -1]);
    expect(pcmToWav(new ArrayBuffer(10)).size).toBe(54);
  });
});
