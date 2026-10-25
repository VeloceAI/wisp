export const MOODS = [
  'idle',
  'waking',
  'thinking',
  'talking',
  'happy',
  'excited',
  'celebrate',
  'confused',
  'worried',
  'sleepy',
  'sleeping',
  'shy',
] as const;
export type Mood = (typeof MOODS)[number];

export type EyeShape = 'open' | 'happy' | 'closed';
export type MouthShape = 'curve' | 'o' | 'wave' | 'cat';
export type Effect = 'none' | 'zzz' | 'sparkles' | 'question' | 'sweat' | 'confetti' | 'dots' | 'heart' | 'exclaim';

/** Numbers here are blended smoothly when the mood changes; the rest switch at once. */
export interface FaceNumbers {
  /** Per-eye lid openness, 0 closed .. 1.15 wide. */
  eyeOpenL: number;
  eyeOpenR: number;
  pupil: number;
  /** -1 frown .. 1 big smile */
  mouthCurve: number;
  mouthOpen: number;
  mouthWidth: number;
  blush: number;
  /** Brow lift above the eye and inner-end tilt (positive = worried). */
  browLift: number;
  browTiltL: number;
  browTiltR: number;
  browShow: number;
  tilt: number;
  bobAmp: number;
  bobSpeed: number;
  sink: number;
  /** Forced gaze, blended with the live cursor gaze by gazeLock. */
  gazeX: number;
  gazeY: number;
  gazeLock: number;
}

export interface MoodFace extends FaceNumbers {
  eyes: EyeShape;
  mouth: MouthShape;
  effect: Effect;
}

const base: MoodFace = {
  eyeOpenL: 1,
  eyeOpenR: 1,
  pupil: 1,
  mouthCurve: 0.35,
  mouthOpen: 0,
  mouthWidth: 1,
  blush: 0.3,
  browLift: 0,
  browTiltL: 0,
  browTiltR: 0,
  browShow: 0,
  tilt: 0,
  bobAmp: 3,
  bobSpeed: 1,
  sink: 0,
  gazeX: 0,
  gazeY: 0,
  gazeLock: 0,
  eyes: 'open',
  mouth: 'curve',
  effect: 'none',
};

const face = (over: Partial<MoodFace>): MoodFace => ({ ...base, ...over });

export const MOOD_FACES: Record<Mood, MoodFace> = {
  idle: face({}),
  waking: face({ eyeOpenL: 0.55, eyeOpenR: 0.65, mouth: 'o', mouthOpen: 0.55, browShow: 0.6, browLift: 4, bobAmp: 1, effect: 'exclaim' }),
  thinking: face({
    mouthCurve: 0,
    mouthWidth: 0.6,
    browShow: 1,
    browLift: 2,
    browTiltL: -0.25,
    browTiltR: 0.35,
    tilt: -6,
    bobAmp: 1.5,
    bobSpeed: 0.7,
    gazeX: 0.7,
    gazeY: -0.8,
    gazeLock: 0.85,
    effect: 'dots',
  }),
  talking: face({ mouthCurve: 0.4, blush: 0.35 }),
  happy: face({ eyes: 'happy', mouthCurve: 0.85, mouthOpen: 0.35, blush: 0.6, bobAmp: 4 }),
  excited: face({
    eyeOpenL: 1.12,
    eyeOpenR: 1.12,
    pupil: 1.15,
    mouthCurve: 1,
    mouthOpen: 0.7,
    blush: 0.7,
    bobAmp: 8,
    bobSpeed: 2.2,
    effect: 'sparkles',
  }),
  celebrate: face({ eyes: 'happy', mouthCurve: 1, mouthOpen: 0.85, blush: 0.75, bobAmp: 10, bobSpeed: 2.5, effect: 'confetti' }),
  confused: face({
    eyeOpenL: 0.7,
    eyeOpenR: 1.08,
    mouth: 'wave',
    mouthWidth: 0.8,
    browShow: 1,
    browLift: 3,
    browTiltL: -0.35,
    browTiltR: 0.4,
    tilt: 8,
    bobAmp: 1.5,
    effect: 'question',
  }),
  worried: face({
    eyeOpenL: 1.1,
    eyeOpenR: 1.1,
    pupil: 0.7,
    mouthCurve: -0.55,
    mouthWidth: 0.8,
    blush: 0.15,
    browShow: 1,
    browLift: 2,
    browTiltL: 0.5,
    browTiltR: 0.5,
    bobAmp: 1.2,
    bobSpeed: 2.6,
    effect: 'sweat',
  }),
  sleepy: face({
    eyeOpenL: 0.32,
    eyeOpenR: 0.36,
    mouth: 'o',
    mouthOpen: 0.2,
    mouthWidth: 0.6,
    blush: 0.2,
    tilt: -4,
    bobAmp: 2,
    bobSpeed: 0.45,
    sink: 3,
  }),
  sleeping: face({
    eyes: 'closed',
    mouth: 'o',
    mouthOpen: 0.25,
    mouthWidth: 0.5,
    blush: 0.25,
    tilt: -7,
    bobAmp: 1.5,
    bobSpeed: 0.35,
    sink: 7,
    effect: 'zzz',
  }),
  shy: face({
    eyeOpenL: 0.8,
    eyeOpenR: 0.8,
    mouth: 'cat',
    mouthWidth: 0.7,
    blush: 1,
    tilt: -9,
    bobAmp: 2,
    gazeX: -0.8,
    gazeY: 0.6,
    gazeLock: 0.9,
    effect: 'heart',
  }),
};

export const NUMERIC_FACE_KEYS = Object.keys(base).filter(
  (k) => typeof base[k as keyof MoodFace] === 'number',
) as (keyof FaceNumbers)[];

export const isMood = (v: unknown): v is Mood => typeof v === 'string' && (MOODS as readonly string[]).includes(v);
