import { MOOD_FACES, NUMERIC_FACE_KEYS, type Mood, type MoodFace } from './moods';

export type Impulse = 'squish' | 'hop' | 'shake';

export interface Frame {
  /** Milliseconds since the animator started. */
  t: number;
  mood: Mood;
  face: MoodFace;
  /** 0 open .. 1 shut, on top of the mood's lid openness. */
  blink: number;
  gazeX: number;
  gazeY: number;
  breath: number;
  bobY: number;
  hopY: number;
  squashX: number;
  squashY: number;
  tiltExtra: number;
  /** Extra mouth opening while speaking, 0..1. */
  talk: number;
  /** Seconds since the current effect started. */
  effectT: number;
  reducedMotion: boolean;
}

export interface AnimatorOptions {
  reducedMotion?: boolean;
  random?: () => number;
}

const IMPULSE_MS: Record<Impulse, number> = { squish: 650, hop: 520, shake: 500 };
const LOOK_HOLD_MS = 4000;

const ease = (cur: number, target: number, dt: number, tau: number) => cur + (target - cur) * (1 - Math.exp(-dt / tau));

export class CharacterAnimator {
  private t = 0;
  private mood: Mood = 'idle';
  private face: MoodFace = { ...MOOD_FACES.idle };
  private effectStart = 0;
  private nextBlink: number;
  private blinkStart = -1;
  private gaze = { x: 0, y: 0 };
  private gazeTarget = { x: 0, y: 0 };
  private lastLook = -Infinity;
  private nextWander = 0;
  private impulses: { kind: Impulse; start: number }[] = [];
  private speaking = false;
  private reducedMotion: boolean;
  private random: () => number;

  constructor(opts: AnimatorOptions = {}) {
    this.reducedMotion = opts.reducedMotion ?? false;
    this.random = opts.random ?? Math.random;
    this.nextBlink = 1500 + this.random() * 2500;
  }

  get currentMood(): Mood {
    return this.mood;
  }

  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    const target = MOOD_FACES[mood];
    this.face.eyes = target.eyes;
    this.face.mouth = target.mouth;
    this.face.effect = target.effect;
    this.effectStart = this.t;
  }

  /** Point to look at, in -1..1 relative to the character's centre; null lets the eyes wander. */
  lookAt(x: number | null, y = 0): void {
    if (x === null) {
      this.lastLook = -Infinity;
      return;
    }
    this.gazeTarget = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    this.lastLook = this.t;
  }

  impulse(kind: Impulse): void {
    if (this.reducedMotion) return;
    this.impulses = this.impulses.filter((i) => i.kind !== kind);
    this.impulses.push({ kind, start: this.t });
  }

  setSpeaking(on: boolean): void {
    this.speaking = on;
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    if (on) this.impulses = [];
  }

  tick(dt: number): Frame {
    const step = Math.max(0, Math.min(dt, 100));
    this.t += step;
    const t = this.t;
    const target = MOOD_FACES[this.mood];
    for (const k of NUMERIC_FACE_KEYS) this.face[k] = ease(this.face[k], target[k], step, 110);

    const blink = this.updateBlink(t);
    this.updateGaze(t, step);
    const f = this.face;
    const gx = this.gaze.x + (f.gazeX - this.gaze.x) * f.gazeLock;
    const gy = this.gaze.y + (f.gazeY - this.gaze.y) * f.gazeLock;

    const still = this.reducedMotion;
    const bobPeriod = 2400 / Math.max(0.1, f.bobSpeed);
    const bobY = still ? 0 : -f.bobAmp * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / bobPeriod));
    const breath = still ? 0 : Math.sin((2 * Math.PI * t) / 3600);

    let hopY = 0;
    let squashX = 1;
    let squashY = 1;
    let tiltExtra = 0;
    this.impulses = this.impulses.filter((imp) => t - imp.start < IMPULSE_MS[imp.kind]);
    for (const imp of this.impulses) {
      const p = (t - imp.start) / IMPULSE_MS[imp.kind];
      if (imp.kind === 'squish') {
        const s = 0.17 * Math.exp(-4.5 * p) * Math.cos(15 * p);
        squashY *= 1 - s;
        squashX *= 1 + s * 0.8;
      } else if (imp.kind === 'hop') {
        hopY += -24 * Math.sin(Math.PI * p);
        const land = p < 0.12 ? 1 - p / 0.12 : p > 0.85 ? (p - 0.85) / 0.15 : 0;
        squashY *= 1 - 0.1 * land;
        squashX *= 1 + 0.08 * land;
      } else {
        tiltExtra += 7 * Math.sin(p * Math.PI * 6) * (1 - p);
      }
    }

    const talk = this.speaking
      ? 0.25 + 0.4 * Math.abs(Math.sin(t * 0.017)) * (0.6 + 0.4 * Math.sin(t * 0.0053))
      : 0;

    return {
      t,
      mood: this.mood,
      face: { ...f },
      blink,
      gazeX: gx,
      gazeY: gy,
      breath,
      bobY,
      hopY,
      squashX,
      squashY,
      tiltExtra,
      talk,
      effectT: (t - this.effectStart) / 1000,
      reducedMotion: still,
    };
  }

  private updateBlink(t: number): number {
    if (this.face.eyes !== 'open') return 0;
    if (this.blinkStart < 0 && t >= this.nextBlink) this.blinkStart = t;
    if (this.blinkStart < 0) return 0;
    const p = (t - this.blinkStart) / 150;
    if (p >= 1) {
      this.blinkStart = -1;
      const double = this.random() < 0.15;
      const slow = this.mood === 'sleepy' ? 1800 : 0;
      this.nextBlink = t + (double ? 220 : 2200 + slow + this.random() * 4000);
      return 0;
    }
    return Math.sin(Math.PI * p);
  }

  private updateGaze(t: number, dt: number): void {
    if (t - this.lastLook > LOOK_HOLD_MS && t >= this.nextWander) {
      const glance = this.random() < 0.2;
      this.gazeTarget = {
        x: (this.random() * 2 - 1) * (glance ? 0.9 : 0.35),
        y: (this.random() * 2 - 1) * (glance ? 0.6 : 0.25),
      };
      this.nextWander = t + 1800 + this.random() * 3200;
    }
    this.gaze.x = ease(this.gaze.x, this.gazeTarget.x, dt, 70);
    this.gaze.y = ease(this.gaze.y, this.gazeTarget.y, dt, 70);
  }
}
