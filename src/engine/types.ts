/**
 * Film look model.
 *
 * The pipeline runs in this order (see pipeline.ts):
 *   1. prep    (linear light)  exposure, white balance, flash, dye crosstalk, B&W mix
 *   2. optics  (linear light)  halation, bloom, de-sharpening, lens softness, chromatic aberration, vignette
 *   3. tone    (display sRGB)  per-channel characteristic curves (1D LUT from control points)
 *   4. color   (Oklab)         per-hue shifts, saturation roll-off, split toning
 *   5. grain   (display sRGB)  luminance-weighted, size relative to frame height
 *
 * Every size is expressed relative to the frame height, so a 1080px preview and a
 * 4032px capture look the same.
 */

/** A tone curve control point: [input, output], both 0..1 in sRGB-encoded space. */
export type CurvePoint = [number, number];

export interface ToneCurves {
  /** Applied first, to all channels. */
  master: CurvePoint[];
  /** Applied after master. Omit for identity. */
  r?: CurvePoint[];
  g?: CurvePoint[];
  b?: CurvePoint[];
}

/** Hue bands in Oklab hue angle (see HUE_CENTERS in shaders.ts). */
export const HUE_BANDS = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'] as const;
export type HueBand = (typeof HUE_BANDS)[number];

export interface HueAdjust {
  /** Hue rotation in degrees. Positive = counter-clockwise (red → yellow → green). */
  hue?: number;
  /** Chroma multiplier offset. -0.3 = 30% less saturated. */
  sat?: number;
  /** Lightness offset in Oklab L (≈ -0.1..0.1). */
  lum?: number;
}

export interface SplitTone {
  /** Oklab hue angle in degrees. ~40 = warm/orange, ~200 = cyan, ~140 = green, ~330 = magenta. */
  hue: number;
  /** Chroma added, ≈ 0..0.04. */
  amount: number;
}

export interface LookParams {
  /** Exposure bias in stops. Film looks best slightly over. */
  exposure: number;
  /** -1 cool … +1 warm. */
  temperature: number;
  /** -1 green … +1 magenta. */
  tint: number;

  /** Row-major 3x3 matrix in linear RGB. Rows should sum to 1 to keep neutrals neutral. */
  crosstalk: number[];

  /** If set, the image is converted to B&W with these linear-RGB weights (sum ≈ 1). */
  mono?: [number, number, number];

  curves: ToneCurves;

  /** Global chroma multiplier. */
  saturation: number;
  /** 0..1, how much chroma falls off in deep shadows. */
  shadowDesat: number;
  /** 0..1, how much chroma falls off in bright highlights (film shoulder). */
  highlightDesat: number;
  hues: Partial<Record<HueBand, HueAdjust>>;
  shadows: SplitTone;
  highlights: SplitTone;

  halation: {
    amount: number;
    /** Linear-light threshold where halation starts (1.0 = sRGB white). */
    threshold: number;
    /** Glow radius relative to frame height. */
    radius: number;
    /** Linear RGB tint. Real halation is red/orange. */
    color: [number, number, number];
  };
  bloom: { amount: number };

  /** Undo phone over-sharpening. 0..1. */
  soften: number;
  lens: {
    /** Extra blur toward corners, 0..1. */
    cornerSoftness: number;
    /** Lateral chromatic aberration at the corners, in fraction of frame height (≈ 0..0.003). */
    aberration: number;
  };
  vignette: {
    amount: number;
    /** 0.5 = tight, 1.2 = only the very corners. */
    size: number;
  };
  /** Direct on-camera flash: center hot spot, falloff, cooler light. 0..1. */
  flash: number;

  grain: {
    amount: number;
    /** Grain cell size relative to frame height, ×1000. ISO 100 ≈ 0.6, ISO 800 ≈ 1.4. */
    size: number;
    /** 0 = monochrome grain, 1 = fully per-channel color grain. */
    color: number;
  };
}

export type Situation =
  | 'sunny'
  | 'golden'
  | 'overcast'
  | 'window'
  | 'tungsten'
  | 'night'
  | 'flash'
  | 'sea'
  | 'green'
  | 'portrait';

export const SITUATION_LABELS: Record<Situation, string> = {
  sunny: '맑은 낮',
  golden: '골든아워·역광',
  overcast: '흐린 날',
  window: '카페·창가',
  tungsten: '식당·바 조명',
  night: '밤거리',
  flash: '어두운 실내',
  sea: '바다·하늘',
  green: '숲·초록',
  portrait: '인물 클로즈업',
};

export interface FilmProfile {
  id: string;
  /** Camera name shown in the app. Original names, not brands. */
  name: string;
  /** What real stock this is modelled after — for our own reference. */
  reference: string;
  iso: number;
  /** One-line character, written for the user. */
  tagline: string;
  /** Situations, 2 = best, 1 = good. Missing = not recommended. */
  situations: Partial<Record<Situation, 1 | 2>>;
  /** When to avoid it, written for the user. */
  avoid: string;
  /** Lab correction target: how much auto WB to apply (0 keeps the stock's native cast). */
  labWhiteBalance: number;
  look: LookParams;
}

export interface DevelopOptions {
  /** Like a lab scanner operator: per-frame auto exposure and white balance. */
  labCorrection: boolean;
  /** 0..1 blend between original and developed. */
  strength: number;
  /** Seed for grain. Change per frame so grain never repeats. */
  seed: number;
}
