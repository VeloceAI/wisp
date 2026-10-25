export interface RecordOptions {
  /** Stop after this much quiet once speech has started. */
  silenceMs?: number;
  maxMs?: number;
  /** Give up if nothing is said within this long. */
  waitMs?: number;
  signal?: AbortSignal;
}

const RATE = 16000;

/**
 * Records one utterance in any modern browser or desktop web view and returns it as 16 kHz mono
 * samples. Stops on its own after a pause, so people just talk. Null when nothing was said.
 */
export async function recordSpeech(opts: RecordOptions = {}): Promise<Float32Array | null> {
  const { silenceMs = 1100, maxMs = 9000, waitMs = 5000, signal } = opts;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (recorder.onstop = () => r()));
  recorder.start(250);

  const buf = new Float32Array(analyser.fftSize);
  const started = performance.now();
  let spokeAt = 0;
  let quietSince = 0;
  let heardAnything = false;
  await new Promise<void>((resolve) => {
    const tick = () => {
      if (signal?.aborted) return resolve();
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const loud = Math.sqrt(sum / buf.length) > 0.02;
      const now = performance.now();
      if (loud) {
        heardAnything = true;
        spokeAt ||= now;
        quietSince = 0;
      } else if (heardAnything) quietSince ||= now;
      if (now - started > maxMs || (!heardAnything && now - started > waitMs) || (quietSince && now - quietSince > silenceMs)) return resolve();
      setTimeout(tick, 60);
    };
    tick();
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  await ctx.close().catch(() => undefined);
  if (!heardAnything || signal?.aborted) return null;
  return toMono16k(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer());
}

async function toMono16k(encoded: ArrayBuffer): Promise<Float32Array> {
  const decoder = new AudioContext();
  const audio = await decoder.decodeAudioData(encoded);
  await decoder.close().catch(() => undefined);
  const offline = new OfflineAudioContext(1, Math.ceil(audio.duration * RATE), RATE);
  const src = offline.createBufferSource();
  src.buffer = audio;
  src.connect(offline.destination);
  src.start();
  return (await offline.startRendering()).getChannelData(0);
}

/** 16-bit little-endian PCM: half the size of floats, plenty for speech. */
export function toPcm16(samples: Float32Array): ArrayBuffer {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i]! * 32767)));
  return out.buffer;
}
