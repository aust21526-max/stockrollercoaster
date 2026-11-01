import type { CurvePoint, ToneCurves } from './types';

export const LUT_SIZE = 1024;

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through control points.
 * Monotone so a tone curve can never invert or ring.
 */
export function makeCurve(points: CurvePoint[] | undefined): (x: number) => number {
  if (!points || points.length < 2) return (x) => x;
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Bakes master ∘ channel curves into an RGBA float LUT (A unused). */
export function bakeToneLut(curves: ToneCurves): Float32Array {
  const master = makeCurve(curves.master);
  const r = makeCurve(curves.r);
  const g = makeCurve(curves.g);
  const b = makeCurve(curves.b);
  const out = new Float32Array(LUT_SIZE * 4);
  for (let i = 0; i < LUT_SIZE; i++) {
    const x = i / (LUT_SIZE - 1);
    const m = clamp01(master(x));
    out[i * 4] = clamp01(r(m));
    out[i * 4 + 1] = clamp01(g(m));
    out[i * 4 + 2] = clamp01(b(m));
    out[i * 4 + 3] = 1;
  }
  return out;
}
