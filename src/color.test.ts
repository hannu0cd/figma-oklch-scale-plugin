type RGBA = { r: number; g: number; b: number; a: number };

import { describe, it, expect } from 'vitest';
import { generatePalette, TONE_STEPS } from './color';

const MID_BLUE: RGBA = { r: 0.114, g: 0.514, b: 0.929, a: 1 };

describe('generatePalette', () => {
  it('returns all 19 tone steps', () => {
    const palette = generatePalette(MID_BLUE);
    expect(Object.keys(palette).map(Number).sort((a, b) => a - b)).toEqual(TONE_STEPS);
  });

  it('step 500 equals the base color exactly', () => {
    const palette = generatePalette(MID_BLUE);
    expect(palette[500]).toEqual(MID_BLUE);
  });

  it('step 50 is lighter than step 500', () => {
    const palette = generatePalette(MID_BLUE);
    const brightness = (c: RGBA) => c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
    expect(brightness(palette[50])).toBeGreaterThan(brightness(palette[500]));
  });

  it('step 950 is darker than step 500', () => {
    const palette = generatePalette(MID_BLUE);
    const brightness = (c: RGBA) => c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
    expect(brightness(palette[950])).toBeLessThan(brightness(palette[500]));
  });

  it('all channel values are clamped to [0, 1]', () => {
    const palette = generatePalette(MID_BLUE);
    for (const rgba of Object.values(palette)) {
      expect(rgba.r).toBeGreaterThanOrEqual(0);
      expect(rgba.r).toBeLessThanOrEqual(1);
      expect(rgba.g).toBeGreaterThanOrEqual(0);
      expect(rgba.g).toBeLessThanOrEqual(1);
      expect(rgba.b).toBeGreaterThanOrEqual(0);
      expect(rgba.b).toBeLessThanOrEqual(1);
    }
  });

  it('alpha is always 1', () => {
    const palette = generatePalette(MID_BLUE);
    for (const rgba of Object.values(palette)) {
      expect(rgba.a).toBe(1);
    }
  });
});
