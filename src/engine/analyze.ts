/**
 * Cheap scene statistics from a tiny thumbnail. Runs on the CPU in < 1 ms.
 * Used for (a) lab correction — per-frame auto exposure / white balance, like a
 * scanner operator — and (b) scene-based camera recommendations.
 */

export interface SceneStats {
  /** Log-average linear luminance. 0.18 = "normal" exposure. */
  key: number;
  /** 99th percentile linear luminance. */
  p99: number;
  /** 5th percentile. */
  p05: number;
  /** Grey-world mean of mid-tone pixels (linear). */
  mean: [number, number, number];
  /** log2(R/B) of the mid-tone mean. > 0.5 ≈ tungsten, < -0.15 ≈ shade/overcast. */
  warmth: number;
  /** Share of pixels that are clearly green / blue (sky, sea). */
  greenShare: number;
  blueShare: number;
  /** Rough contrast in stops (p95 / p05). */
  contrastStops: number;
}

const W = 64;

const toLin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;

export function analyzeScene(src: CanvasImageSource, srcW: number, srcH: number): SceneStats {
  const h = Math.max(8, Math.round((W * srcH) / srcW));
  if (!canvas) canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, h) : document.createElement('canvas');
  canvas.width = W;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  ctx.drawImage(src, 0, 0, W, h);
  const px = ctx.getImageData(0, 0, W, h).data;

  const n = W * h;
  const lums = new Float32Array(n);
  let logSum = 0;
  let mr = 0, mg = 0, mb = 0, mc = 0;
  let green = 0, blue = 0;
  for (let i = 0; i < n; i++) {
    const r = toLin(px[i * 4]);
    const g = toLin(px[i * 4 + 1]);
    const b = toLin(px[i * 4 + 2]);
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lums[i] = l;
    logSum += Math.log(l + 1e-4);
    if (l > 0.02 && l < 0.75) {
      mr += r; mg += g; mb += b; mc++;
    }
    if (l > 0.01) {
      if (g > r * 1.25 && g > b * 1.1) green++;
      if (b > r * 1.4 && b > g * 1.05) blue++;
    }
  }
  const sorted = Array.from(lums).sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.min(n - 1, Math.floor(p * n))];
  const mean: [number, number, number] = mc > 0 ? [mr / mc, mg / mc, mb / mc] : [0.18, 0.18, 0.18];
  const p05 = pct(0.05);
  const p95 = pct(0.95);
  return {
    key: Math.exp(logSum / n),
    p99: pct(0.99),
    p05,
    mean,
    warmth: Math.log2((mean[0] + 1e-4) / (mean[2] + 1e-4)),
    greenShare: green / n,
    blueShare: blue / n,
    contrastStops: Math.log2((p95 + 1e-3) / (p05 + 1e-3)),
  };
}

export interface LabCorrection {
  /** Exposure in stops. */
  ev: number;
  /** Linear RGB gains, luminance-normalized. */
  gains: [number, number, number];
}

/**
 * What a lab scanner operator would do: bring the frame toward a normal key
 * (but keep night shots dark-ish and never blow the highlights), and neutralize
 * a portion of the color cast.
 */
export function labCorrection(stats: SceneStats, wbStrength: number): LabCorrection {
  const target = 0.16;
  let ev = Math.log2(target / Math.max(stats.key, 1e-4)) * 0.65;
  // Night / dark scenes: do not lift to daylight.
  if (stats.key < 0.03) ev *= 0.5;
  // Do not push the brightest 1% far past white.
  const headroom = Math.log2(1.6 / Math.max(stats.p99, 1e-4));
  ev = Math.min(ev, Math.max(headroom, 0));
  ev = Math.max(-1, Math.min(1.25, ev));

  const [r, g, b] = stats.mean;
  // Grey-world is fooled by scenes dominated by one warm or cool color, so only go halfway.
  const k = Math.max(0, Math.min(1, wbStrength)) * 0.5;
  let gains: [number, number, number] = [
    Math.pow(g / Math.max(r, 1e-4), k),
    1,
    Math.pow(g / Math.max(b, 1e-4), k),
  ];
  // Cap so a frame full of one color (a green lawn, blue sea) is not "corrected" away.
  gains = gains.map((v) => Math.max(0.85, Math.min(1.18, v))) as [number, number, number];
  const lum = 0.2126 * gains[0] + 0.7152 * gains[1] + 0.0722 * gains[2];
  return { ev, gains: gains.map((v) => v / lum) as [number, number, number] };
}
