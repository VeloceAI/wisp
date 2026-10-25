// Re-mixes the last recording without recording again, e.g. to add music: WISP_MUSIC=path/to/track.mp3 npm run docs:remux
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { muxVideo, type Clip } from './narration';

const { clips, starts } = JSON.parse(readFileSync('docs/.build/timeline.json', 'utf8')) as { clips: Clip[]; starts: number[] };
muxVideo('docs/.build/raw.webm', clips, starts, 'docs/wisp-demo.mp4', process.env.WISP_MUSIC);
execFileSync(process.env.FFMPEG ?? 'ffmpeg', ['-y', '-loglevel', 'error', '-i', 'docs/wisp-demo.mp4', '-vf', 'fps=10,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer', 'docs/assets/demo.gif']);
console.log('remuxed docs/wisp-demo.mp4');
