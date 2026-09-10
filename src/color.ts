import { interpolate, samples, converter } from 'culori';

type RGBA = { r: number; g: number; b: number; a: number };

const L_LIGHT = 0.98;
const L_DARK = 0.10;

/** The 19 tone steps of a palette, lightest (50) to darkest (950). */
export const TONE_STEPS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950] as const;

const toOklch = converter('oklch');
const toRgb = converter('rgb');

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function toFigmaRgba(color: ReturnType<typeof toRgb>): RGBA {
  return {
    r: clamp(color?.r ?? 0),
    g: clamp(color?.g ?? 0),
    b: clamp(color?.b ?? 0),
    a: 1,
  };
}

/**
 * Generates a 19-step tonal palette from a base color.
 *
 * The base is converted to OKLCH, then interpolated toward a near-white
 * anchor (steps 50–450) and a near-black anchor (steps 550–950), both with
 * zero chroma and the base hue. Step 500 is the base color exactly.
 *
 * @param baseRgba Base color in Figma RGBA format (channels 0–1).
 * @returns Map of tone step to RGBA, all channels clamped to [0, 1] and alpha 1.
 */
export function generatePalette(baseRgba: RGBA): Record<number, RGBA> {
  const baseOklch = toOklch({ mode: 'rgb', r: baseRgba.r, g: baseRgba.g, b: baseRgba.b });
  const h = baseOklch?.h ?? 0;

  const lightEnd = { mode: 'oklch' as const, l: L_LIGHT, c: 0, h };
  const darkEnd = { mode: 'oklch' as const, l: L_DARK, c: 0, h };

  const lightInterp = interpolate([lightEnd, baseOklch!], 'oklch');
  const darkInterp = interpolate([baseOklch!, darkEnd], 'oklch');

  const lightColors = samples(10).map((t: number) => toRgb(lightInterp(t)));
  const darkColors = samples(10).map((t: number) => toRgb(darkInterp(t)));

  const result: Record<number, RGBA> = {};

  // Steps 50–450: lightColors[0..8]
  for (let i = 0; i < 9; i++) {
    result[TONE_STEPS[i]] = toFigmaRgba(lightColors[i]);
  }

  // Step 500: base exactly
  result[500] = { ...baseRgba, a: 1 };

  // Steps 550–950: darkColors[1..9]
  for (let i = 1; i < 10; i++) {
    result[TONE_STEPS[9 + i]] = toFigmaRgba(darkColors[i]);
  }

  return result;
}
