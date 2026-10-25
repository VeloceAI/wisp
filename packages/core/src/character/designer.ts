import type { AccessoryKind, BodyShape, CharacterInput, EyeStyle, MouthStyle } from './definition';
import { paletteFrom } from './color';

const COLORS: [RegExp, string][] = [
  [/\b(red|laal|lal|crimson|cherry|tomato)\b|लाल/, '#F0524F'],
  [/\b(orange|narangi|saffron|kesari|tangerine|fox)\b|नारंगी|केसरी/, '#FF8A4C'],
  [/\b(yellow|peela|pila|sunny|lemon|gold(en)?)\b|पीला/, '#FFC83D'],
  [/\b(green|hara|hari|leaf|mint|eco|plant|garden|organic)\b|हरा/, '#4FC98A'],
  [/\b(teal|turquoise|aqua|sea)\b/, '#2EC4B6'],
  [/\b(blue|neela|nila|sky|ocean|water|tech)\b|नीला/, '#3FA9F5'],
  [/\b(purple|violet|baingani|jamuni|lavender|magic)\b|बैंगनी|जामुनी/, '#8B7CFF'],
  [/\b(pink|gulabi|rose|candy|sakura)\b|गुलाबी/, '#FF8FB8'],
  [/\b(brown|bhura|coffee|choco(late)?|teddy|bear)\b|भूरा/, '#B07A52'],
  [/\b(black|kaala|kala|dark|night|ninja)\b|काला/, '#3A3A4A'],
  [/\b(white|safed|snow|cloud|ghost)\b|सफ़ेद|सफेद/, '#E9ECF5'],
  [/\b(grey|gray|silver|steel)\b/, '#9AA3B5'],
];

const SHAPES: [RegExp, BodyShape][] = [
  [/\b(robot|bot|box|square|cube|tech|machine|computer|ai)\b/, 'squircle'],
  [/\b(blob|jelly|slime|cloud|marshmallow|mochi|squishy|soft)\b/, 'blob'],
  [/\b(bean|seed|frog|pea|plant|sprout)\b/, 'bean'],
  [/\b(drop|flame|fire|ghost|spirit|wisp|water|spark)\b/, 'wisp'],
  [/\b(round|ball|circle|moon|planet|sun|bubble)\b/, 'round'],
];

const ACCESSORIES: [RegExp, AccessoryKind][] = [
  [/\b(robot|bot|antenna|tech|ai|radio|alien|space)\b/, 'antenna'],
  [/\b(plant|leaf|sprout|eco|garden|organic|farm|green)\b/, 'sprout'],
  [/\b(cat|fox|dog|bunny|rabbit|bear|kitten|puppy|animal|pet|ears|tiger|panda)\b/, 'ears'],
  [/\b(king|queen|royal|premium|luxury|crown|prince|princess)\b/, 'crown'],
];

const pickFrom = <T>(text: string, table: [RegExp, T][]): T | undefined => table.find(([re]) => re.test(text))?.[1];

/**
 * "A friendly orange fox for a music app" → a character, with no AI. Colours, shape, accessory,
 * eyes and mouth come from words in the description (English, Hindi and Hinglish colour words).
 */
export function designFromText(description: string): CharacterInput {
  const t = description.toLowerCase();
  const base = pickFrom(t, COLORS) ?? '#8B7CFF';
  const p = paletteFrom(base);
  const eyes: EyeStyle = /\b(sparkl\w*|magic|star|shiny|dreamy)\b/.test(t) ? 'sparkle' : /\b(cute|kawaii|baby|tiny|small|little)\b/.test(t) ? 'dot' : 'classic';
  const mouth: MouthStyle = /\b(cat|cheeky|playful|naughty|fox|kitten)\b/.test(t) ? 'cat' : /\b(shy|calm|quiet|minimal|serious)\b/.test(t) ? 'tiny' : 'smile';
  const named = description.match(/\b(?:named|called|naam)\s+([A-Za-zऀ-ॿ][\wऀ-ॿ]{1,20})/i)?.[1];
  const accessory = pickFrom(t, ACCESSORIES) ?? 'none';
  return {
    name: named ? named[0]!.toUpperCase() + named.slice(1) : undefined,
    body: { shape: pickFrom(t, SHAPES) ?? 'round', color: p.color, shade: p.shade, glow: p.glow, belly: /\b(belly|tummy|pet|bear|panda)\b/.test(t) ? p.glow : null },
    eyes: { style: eyes, color: p.ink, size: /\b(big eyes|baby|cute)\b/.test(t) ? 1.2 : 1 },
    mouth: { style: mouth, color: p.ink, inner: p.shade },
    cheeks: { show: !/\b(serious|robot|bot)\b/.test(t), color: p.cheeks },
    accessory: { kind: accessory, color: accessory === 'crown' ? '#FFD166' : accessory === 'sprout' ? '#2E9E5B' : p.shade },
  };
}
