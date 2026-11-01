import { makeCurve } from './curves';
import { HUE_BANDS, type CurvePoint, type HueAdjust, type HueBand, type LookParams } from './types';

/**
 * Fit a film look to real film photos.
 *
 * Pair mode: a phone photo and a film scan of the same scene. We align them
 * roughly (scale + shift search), blur away detail so small misalignment does
 * not matter, then read off how each phone value maps to the film value:
 * per-channel tone curves, then saturation and per-hue shifts on top.
 * If alignment fails we fall back to histogram (quantile) matching, which
 * needs no alignment at all.
 *
 * Film-only mode: no phone photo. We measure where black and white land per
 * channel and the cast in shadows/mids/highlights, and bend a base camera's
 * curves to match.
 */

export interface Pixels {
  w: number;
  h: number;
  /** sRGB 0..1, RGB interleaved. */
  d: Float32Array;
}

export function readPixels(src: CanvasImageSource, srcW: number, srcH: number, maxSide = 320): Pixels {
  const k = Math.min(1, maxSide / Math.max(srcW, srcH));
  const w = Math.max(8, Math.round(srcW * k));
  const h = Math.max(8, Math.round(srcH * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(src, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const d = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    d[i * 3] = px[i * 4] / 255;
    d[i * 3 + 1] = px[i * 4 + 1] / 255;
    d[i * 3 + 2] = px[i * 4 + 2] / 255;
  }
  return { w, h, d };
}

/** Separable box blur, applied twice (≈ gaussian). */
function blur(p: Pixels, r: number): Pixels {
  let src = p.d;
  const { w, h } = p;
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(src.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 3; c++) {
          let s = 0;
          let n = 0;
          for (let k = -r; k <= r; k++) {
            const xx = Math.min(w - 1, Math.max(0, x + k));
            s += src[(y * w + xx) * 3 + c];
            n++;
          }
          tmp[(y * w + x) * 3 + c] = s / n;
        }
    const out = new Float32Array(src.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 3; c++) {
          let s = 0;
          let n = 0;
          for (let k = -r; k <= r; k++) {
            const yy = Math.min(h - 1, Math.max(0, y + k));
            s += tmp[(yy * w + x) * 3 + c];
            n++;
          }
          out[(y * w + x) * 3 + c] = s / n;
        }
    src = out;
  }
  return { w, h, d: src };
}

function sample(p: Pixels, x: number, y: number, out: number[]) {
  const x0 = Math.max(0, Math.min(p.w - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(p.h - 1, Math.floor(y)));
  const x1 = Math.min(p.w - 1, x0 + 1);
  const y1 = Math.min(p.h - 1, y0 + 1);
  const fx = Math.min(1, Math.max(0, x - x0));
  const fy = Math.min(1, Math.max(0, y - y0));
  for (let c = 0; c < 3; c++) {
    const a = p.d[(y0 * p.w + x0) * 3 + c];
    const b = p.d[(y0 * p.w + x1) * 3 + c];
    const cc = p.d[(y1 * p.w + x0) * 3 + c];
    const d = p.d[(y1 * p.w + x1) * 3 + c];
    out[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy;
  }
}

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Where does film pixel (u, v) (normalized 0..1) come from in the phone photo?
 * Both are assumed centered on the same subject; film = phone zoomed by `s`
 * about the center and shifted by (tx, ty).
 */
interface Fit {
  s: number;
  tx: number;
  ty: number;
  score: number;
  /** width / height of film and phone, so a 3:2 scan and a 4:3 phone photo map without stretching. */
  af: number;
  ap: number;
}
/** Coordinates are in units of image height around the center. */
const toPhone = (f: Fit, u: number, v: number): [number, number] => {
  const X = (u - 0.5) * f.af;
  const Y = v - 0.5;
  return [((X - f.tx) / f.s) / f.ap + 0.5, (Y - f.ty) / f.s + 0.5];
};

/** Brute-force search for scale and shift that best correlates the two luminance images. */
function align(phone: Pixels, film: Pixels): Fit {
  const W = 64;
  const H = Math.round((W * film.h) / film.w);
  const fl = new Float32Array(W * H);
  const tmp = [0, 0, 0];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      sample(film, ((x + 0.5) / W) * film.w - 0.5, ((y + 0.5) / H) * film.h - 0.5, tmp);
      fl[y * W + x] = luma(tmp[0], tmp[1], tmp[2]);
    }
  const norm = (a: Float32Array) => {
    let m = 0;
    for (const v of a) m += v;
    m /= a.length;
    let s = 0;
    for (let i = 0; i < a.length; i++) {
      a[i] -= m;
      s += a[i] * a[i];
    }
    s = Math.sqrt(s) || 1;
    for (let i = 0; i < a.length; i++) a[i] /= s;
  };
  norm(fl);
  const af = film.w / film.h;
  const ap = phone.w / phone.h;
  // Start scale so the film frame fits inside the phone frame.
  const s0 = Math.max(1, af / ap);
  let best: Fit = { s: s0, tx: 0, ty: 0, score: -1, af, ap };
  const ph = new Float32Array(W * H);
  for (let k = 0.8; k <= 1.25; k += 0.05)
    for (let tx = -0.12; tx <= 0.121; tx += 0.02)
      for (let ty = -0.12; ty <= 0.121; ty += 0.02) {
        const f: Fit = { s: s0 * k, tx, ty, score: 0, af, ap };
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const [u, v] = toPhone(f, (x + 0.5) / W, (y + 0.5) / H);
            sample(phone, u * phone.w - 0.5, v * phone.h - 0.5, tmp);
            ph[y * W + x] = luma(tmp[0], tmp[1], tmp[2]);
          }
        norm(ph);
        let sc = 0;
        for (let i = 0; i < ph.length; i++) sc += ph[i] * fl[i];
        if (sc > best.score) best = { ...f, score: sc };
      }
  return best;
}

// ---- Oklab (CPU) ----
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (c: number) => {
  c = Math.min(1, Math.max(0, c));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
};
export function oklab(r: number, g: number, b: number): [number, number, number] {
  const R = toLin(r);
  const G = toLin(g);
  const B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklab(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const HUE_C = [25, 55, 100, 140, 195, 255, 295, 335];
function bandOf(h: number): HueBand {
  let best = 0;
  let dist = 999;
  HUE_C.forEach((c, i) => {
    const d = Math.min(Math.abs(h - c), 360 - Math.abs(h - c));
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  return HUE_BANDS[best];
}

const median = (a: number[]) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const quantile = (sorted: Float32Array | number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];

/** Make a curve monotone and tidy: non-decreasing outputs, unique sorted inputs. */
function tidy(points: CurvePoint[]): CurvePoint[] {
  const pts = points.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((a, b) => a[0] - b[0]);
  const out: CurvePoint[] = [];
  for (const [x, y] of pts) {
    if (out.length && x - out[out.length - 1][0] < 0.02) continue;
    const prev = out.length ? out[out.length - 1][1] : 0;
    out.push([round(x), round(Math.min(1, Math.max(prev, y)))]);
  }
  if (out[0][0] > 0) out.unshift([0, out[0][1]]);
  if (out[out.length - 1][0] < 1) out.push([1, out[out.length - 1][1]]);
  return out;
}
const round = (v: number) => Math.round(v * 1000) / 1000;

export interface PairInput {
  phone: Pixels;
  film: Pixels;
}

export interface FitResult {
  look: LookParams;
  /** Mean color difference (Oklab ×100) before and after, on aligned pairs. */
  before: number;
  after: number;
  /** How well each pair could be aligned, 0..1. Low = histogram matching was used. */
  alignment: number[];
}

/** Fit a look from phone/film pairs, keeping the base camera's optics, grain and so on. */
export function fitPairs(pairs: PairInput[], base: LookParams): FitResult {
  const samples: { p: [number, number, number]; f: [number, number, number] }[] = [];
  const quantPhone: number[][] = [[], [], []];
  const quantFilm: number[][] = [[], [], []];
  const alignment: number[] = [];
  const tmp = [0, 0, 0];

  for (const { phone, film } of pairs) {
    const fit = align(phone, film);
    alignment.push(Math.max(0, fit.score));
    // Pixel pairs only from well-aligned photos.
    if (fit.score > 0.6) {
      const pb = blur(phone, 3);
      const fb = blur(film, 3);
      const step = Math.max(1, Math.floor(Math.min(fb.w, fb.h) / 90));
      for (let y = step; y < fb.h - step; y += step)
        for (let x = step; x < fb.w - step; x += step) {
          const [u, v] = toPhone(fit, x / fb.w, y / fb.h);
          if (u < 0.03 || u > 0.97 || v < 0.03 || v > 0.97) continue;
          sample(pb, u * pb.w, v * pb.h, tmp);
          const p: [number, number, number] = [tmp[0], tmp[1], tmp[2]];
          const i = (y * fb.w + x) * 3;
          samples.push({ p, f: [fb.d[i], fb.d[i + 1], fb.d[i + 2]] });
        }
    }
    // Quantiles always (fallback and endpoints).
    for (let c = 0; c < 3; c++) {
      for (let i = c; i < phone.d.length; i += 3) quantPhone[c].push(phone.d[i]);
      for (let i = c; i < film.d.length; i += 3) quantFilm[c].push(film.d[i]);
    }
  }

  // ---- tone curves per channel ----
  const qs = [0.005, 0.02, 0.06, 0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.88, 0.94, 0.98, 0.995];
  const curves: Record<'r' | 'g' | 'b', CurvePoint[]> = { r: [], g: [], b: [] };
  (['r', 'g', 'b'] as const).forEach((ch, c) => {
    const sp = Float32Array.from(quantPhone[c]).sort();
    const sf = Float32Array.from(quantFilm[c]).sort();
    let pts: CurvePoint[];
    if (samples.length > 400) {
      // Binned medians of aligned pairs.
      const bins: number[][] = Array.from({ length: 14 }, () => []);
      const xs: number[][] = Array.from({ length: 14 }, () => []);
      for (const s of samples) {
        const b = Math.min(13, Math.floor(s.p[c] * 14));
        bins[b].push(s.f[c]);
        xs[b].push(s.p[c]);
      }
      pts = bins.map((b, i) => (b.length >= 15 ? ([median(xs[i]), median(b)] as CurvePoint) : null)).filter((p): p is CurvePoint => !!p);
      // Ends from the tails of the distributions so blacks/whites are right.
      pts.push([quantile(sp, 0.003), quantile(sf, 0.003)], [quantile(sp, 0.997), quantile(sf, 0.997)]);
    } else {
      pts = qs.map((q) => [quantile(sp, q), quantile(sf, q)] as CurvePoint);
    }
    curves[ch] = tidy(pts);
  });

  // ---- saturation and per-hue shifts on top of the curves ----
  const cr = makeCurve(curves.r);
  const cg = makeCurve(curves.g);
  const cb = makeCurve(curves.b);
  const after = (p: [number, number, number]) => [cr(p[0]), cg(p[1]), cb(p[2])] as [number, number, number];
  const ratios: number[] = [];
  const bandHue: Record<string, number[]> = {};
  const bandRatio: Record<string, number[]> = {};
  for (const s of samples) {
    const a = oklab(...after(s.p));
    const f = oklab(...s.f);
    const ca = Math.hypot(a[1], a[2]);
    const cf = Math.hypot(f[1], f[2]);
    if (ca < 0.03 || cf < 0.02) continue;
    ratios.push(cf / ca);
    const ha = (Math.atan2(a[2], a[1]) * 180) / Math.PI;
    const hf = (Math.atan2(f[2], f[1]) * 180) / Math.PI;
    let dh = hf - ha;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    const band = bandOf((ha + 360) % 360);
    (bandHue[band] ??= []).push(dh);
    (bandRatio[band] ??= []).push(cf / ca);
  }
  const sat = ratios.length > 50 ? Math.min(1.6, Math.max(0.4, median(ratios))) : base.saturation;
  const hues: Partial<Record<HueBand, HueAdjust>> = {};
  for (const band of HUE_BANDS) {
    if ((bandHue[band]?.length ?? 0) < 40) continue;
    hues[band] = {
      hue: Math.round(Math.max(-18, Math.min(18, median(bandHue[band]))) * 10) / 10,
      sat: Math.round(Math.max(-0.35, Math.min(0.35, median(bandRatio[band]) / sat - 1)) * 100) / 100,
    };
  }

  const look: LookParams = {
    ...base,
    exposure: 0,
    temperature: 0,
    tint: 0,
    crosstalk: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    curves: { master: [[0, 0], [1, 1]], ...curves },
    saturation: Math.round(sat * 100) / 100,
    shadowDesat: 0,
    highlightDesat: 0,
    hues,
    shadows: { hue: 0, amount: 0 },
    highlights: { hue: 0, amount: 0 },
    skinProtect: 0.3,
  };

  // ---- score: how much closer did we get? ----
  const predict = (p: [number, number, number]) => {
    const a = oklab(...after(p));
    let C = Math.hypot(a[1], a[2]);
    let h = (Math.atan2(a[2], a[1]) * 180) / Math.PI;
    const adj = hues[bandOf((h + 360) % 360)];
    h += adj?.hue ?? 0;
    C *= (1 + (adj?.sat ?? 0)) * look.saturation;
    return [a[0], C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
  };
  let before = 0;
  let afterErr = 0;
  let n = 0;
  for (const s of samples) {
    const f = oklab(...s.f);
    const p0 = oklab(...s.p);
    const p1 = predict(s.p);
    before += Math.hypot(f[0] - p0[0], f[1] - p0[1], f[2] - p0[2]);
    afterErr += Math.hypot(f[0] - p1[0], f[1] - p1[1], f[2] - p1[2]);
    n++;
  }
  return { look, before: n ? (before / n) * 100 : NaN, after: n ? (afterErr / n) * 100 : NaN, alignment };
}

/**
 * Film-only fit: keep the base camera's grey-scale contrast, but move black and
 * white per channel to the measured points and add the measured casts.
 * Scene colors leak into the measurement, so casts are applied at 60%.
 */
export function fitFilmOnly(films: Pixels[], base: LookParams): { look: LookParams; summary: string } {
  const ch: number[][] = [[], [], []];
  const bands = { shadow: [0, 0, 0], mid: [0, 0, 0], high: [0, 0, 0] };
  for (const f of films)
    for (let i = 0; i < f.d.length; i += 3) {
      const r = f.d[i];
      const g = f.d[i + 1];
      const b = f.d[i + 2];
      ch[0].push(r);
      ch[1].push(g);
      ch[2].push(b);
      const [L, A, B] = oklab(r, g, b);
      const band = L < 0.4 ? bands.shadow : L < 0.72 ? bands.mid : bands.high;
      band[0] += A;
      band[1] += B;
      band[2] += 1;
    }
  const sorted = ch.map((a) => Float32Array.from(a).sort());
  const black = sorted.map((s) => quantile(s, 0.005));
  const white = sorted.map((s) => quantile(s, 0.995));
  const tint = (b: number[]) => (b[2] > 50 ? [(b[0] / b[2]) * 0.6, (b[1] / b[2]) * 0.6] : [0, 0]);
  const T = { shadow: tint(bands.shadow), mid: tint(bands.mid), high: tint(bands.high) };

  const master = makeCurve(base.curves.master);
  const xs = [0, 0.2, 0.46, 0.75, 1];
  const curves: Record<'r' | 'g' | 'b', CurvePoint[]> = { r: [], g: [], b: [] };
  for (const x of xs) {
    let rgb: number[];
    if (x === 0) rgb = black;
    else if (x === 1) rgb = white;
    else {
      // Base contrast, rescaled between the measured black and white.
      const y = master(x);
      const lo = (black[0] + black[1] + black[2]) / 3;
      const hi = (white[0] + white[1] + white[2]) / 3;
      const grey = lo + (hi - lo) * y;
      const L = oklab(grey, grey, grey)[0];
      const t = L < 0.5 ? T.shadow.map((v, i) => v + (T.mid[i] - v) * Math.max(0, (L - 0.3) / 0.2)) : T.mid.map((v, i) => v + (T.high[i] - v) * Math.min(1, (L - 0.5) / 0.3));
      rgb = fromOklab(L, t[0], t[1]);
    }
    (['r', 'g', 'b'] as const).forEach((k, i) => curves[k].push([x, round(rgb[i])]));
  }
  const look: LookParams = {
    ...base,
    exposure: 0,
    curves: { master: [[0, 0], [1, 1]], r: tidy(curves.r), g: tidy(curves.g), b: tidy(curves.b) },
    shadows: { hue: 0, amount: 0 },
    highlights: { hue: 0, amount: 0 },
  };
  const f = (v: number) => Math.round(v * 255);
  return {
    look,
    summary: `블랙 ${black.map(f).join('/')}, 화이트 ${white.map(f).join('/')}`,
  };
}
