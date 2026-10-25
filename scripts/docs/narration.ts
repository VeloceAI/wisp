// Voiceover for the demo video. Free and natural by default: Kokoro, an open-source voice that runs locally
// (WISP_KOKORO_VOICE, default af_bella, a brighter voice; WISP_VOICE_SPEED, default 1.08; first run downloads a ~90 MB model). WISP_TTS_PROVIDER=openai with
// WISP_API_KEY uses a paid AI voice instead; without Kokoro, Windows' built-in voice is the fallback.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createProvider, type ProviderName } from '../../packages/core/src/index';

export interface Clip {
  file: string;
  ms: number;
}

const FFPROBE = process.env.FFPROBE ?? 'ffprobe';
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

function durationMs(file: string): number {
  const out = execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim();
  return Math.round(Number(out) * 1000);
}

function windowsVoice(text: string, file: string): void {
  const script = [
    'Add-Type -AssemblyName System.Speech',
    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    `try { $s.SelectVoice($env:WISP_SAPI_VOICE) } catch {}`,
    '$s.Rate = 0',
    '$s.SetOutputToWaveFile($env:WISP_OUT)',
    '$s.Speak($env:WISP_TEXT)',
    '$s.Dispose()',
  ].join('; ');
  execFileSync('powershell', ['-NoProfile', '-Command', script], {
    env: { ...process.env, WISP_TEXT: text, WISP_OUT: file, WISP_SAPI_VOICE: process.env.WISP_SAPI_VOICE ?? 'Microsoft Zira Desktop' },
  });
}

type Kokoro = { generate(text: string, opts: { voice: string; speed?: number }): Promise<{ save(path: string): void | Promise<void> }> };

async function loadKokoro(): Promise<Kokoro | null> {
  try {
    const { KokoroTTS } = await import('kokoro-js');
    return (await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' })) as unknown as Kokoro;
  } catch {
    return null;
  }
}

export async function makeClips(lines: string[], dir: string): Promise<Clip[]> {
  mkdirSync(dir, { recursive: true });
  const ai = process.env.WISP_TTS_PROVIDER;
  const provider = ai ? createProvider({ provider: ai as ProviderName, apiKey: process.env.WISP_API_KEY, ttsVoice: process.env.WISP_TTS_VOICE ?? 'nova' }) : null;
  const kokoro = provider ? null : await loadKokoro();
  const voice = process.env.WISP_KOKORO_VOICE ?? 'af_bella';
  const speed = Number(process.env.WISP_VOICE_SPEED ?? 1.08);
  const clips: Clip[] = [];
  for (const [i, text] of lines.entries()) {
    if (!text) {
      clips.push({ file: '', ms: 0 });
      continue;
    }
    let file: string;
    if (provider?.speak) {
      file = join(dir, `line${i}.mp3`);
      writeFileSync(file, Buffer.from((await provider.speak(text, {})).audio));
    } else if (kokoro) {
      file = join(dir, `line${i}.wav`);
      // save() writes in the background in some versions; wait for it before measuring the clip.
      await (await kokoro.generate(text, { voice, speed })).save(file);
    } else if (process.platform === 'win32') {
      file = join(dir, `line${i}.wav`);
      windowsVoice(text, file);
    } else {
      clips.push({ file: '', ms: 0 });
      continue;
    }
    clips.push({ file, ms: durationMs(file) });
  }
  return clips;
}

/**
 * Converts the screen recording to mp4 and lays each voice clip at the moment its scene began.
 * With `music`, a royalty-free track plays underneath and dips while the voice speaks.
 */
export function muxVideo(rawVideo: string, clips: Clip[], startsMs: number[], out: string, music?: string): void {
  const voiced = clips.map((c, i) => ({ ...c, at: startsMs[i] ?? 0 })).filter((c) => c.file);
  const args = ['-y', '-loglevel', 'error', '-i', rawVideo];
  for (const c of voiced) args.push('-i', c.file);
  const video = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', '-preset', 'slow', '-movflags', '+faststart', '-vf', 'scale=1280:-2'];
  if (!voiced.length) {
    execFileSync(FFMPEG, [...args, ...video, '-an', out]);
    return;
  }
  const delays = voiced.map((c, i) => `[${i + 1}:a]aresample=44100,adelay=${c.at}|${c.at}[a${i}]`).join(';');
  const mix = `${voiced.map((_, i) => `[a${i}]`).join('')}amix=inputs=${voiced.length}:normalize=0,volume=1.3`;
  if (!music) {
    execFileSync(FFMPEG, [...args, '-filter_complex', `${delays};${mix}[voice]`, '-map', '0:v', '-map', '[voice]', ...video, '-c:a', 'aac', '-b:a', '128k', out]);
    return;
  }
  const m = voiced.length + 1;
  const bed = `[${m}:a]aresample=44100,volume=0.22,afade=t=in:d=1.5[bed0];[bed0][vk]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[bed]`;
  const final = `${mix},asplit=2[voice][vk];${bed};[voice][bed]amix=inputs=2:normalize=0:duration=longest[out]`;
  execFileSync(FFMPEG, [...args, '-stream_loop', '-1', '-i', music, '-filter_complex', `${delays};${final}`, '-map', '0:v', '-map', '[out]', ...video, '-c:a', 'aac', '-b:a', '160k', '-shortest', out]);
}
