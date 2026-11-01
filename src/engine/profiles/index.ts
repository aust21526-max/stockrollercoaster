import type { FilmProfile, LookParams } from '../types';

/**
 * Starting points, tuned from published stock characteristics (datasheet curves,
 * known scanner behaviour) and typical lab scans. Every profile is meant to be
 * refined in the darkroom page (/lab) against real photos.
 *
 * Conventions for curves: sRGB-encoded in/out. A lifted first point = milky
 * negative-film blacks after scanning; a lowered last point = no pure paper white.
 */

const base: LookParams = {
  exposure: 0.2,
  temperature: 0,
  tint: 0,
  crosstalk: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  curves: { master: [[0, 0], [1, 1]] },
  saturation: 1,
  shadowDesat: 0.2,
  highlightDesat: 0.3,
  hues: {},
  shadows: { hue: 200, amount: 0 },
  highlights: { hue: 60, amount: 0 },
  halation: { amount: 0.04, threshold: 0.85, radius: 0.012, color: [1, 0.32, 0.08] },
  bloom: { amount: 0.02 },
  soften: 0.1,
  lens: { cornerSoftness: 0.05, aberration: 0.0006 },
  vignette: { amount: 0.18, size: 1.1 },
  flash: 0,
  grain: { amount: 0.35, size: 0.9, color: 0.35 },
};

const look = (o: Partial<LookParams>): LookParams => ({ ...base, ...o });

/**
 * Tone a measured look down: move every curve point a fraction `k` of the way
 * from neutral (y = x) to the measured value. The reference scans were strong
 * on purpose; at full strength everyday photos looked overdone.
 */
const measured = (curves: LookParams['curves'], k = 0.75): LookParams['curves'] => {
  const ease = (pts?: [number, number][]) => pts?.map(([x, y]) => [x, +(x + (y - x) * k).toFixed(3)] as [number, number]);
  return { master: curves.master, r: ease(curves.r), g: ease(curves.g), b: ease(curves.b) };
};

/** Mild dye crosstalk: each layer bleeds a little into its neighbours (lowers purity, like real film). */
const softCross = (k: number) => [1 - 2 * k, k, k, k, 1 - 2 * k, k, k, k, 1 - 2 * k];

export const PROFILES: FilmProfile[] = [
  {
    id: 'portrait400',
    name: 'Dear Skin',
    film: 'Kodak Portra 400',
    reference: 'Kodak Portra 400 · Frontier scan',
    iso: 400,
    tagline: '피부가 가장 예쁘게 나오는 카메라. 부드럽고 따뜻해요.',
    situations: { portrait: 2, golden: 2, overcast: 2, window: 2, sunny: 1, tungsten: 1, sea: 1, green: 1 },
    avoid: '쨍하고 진한 색을 원할 때는 심심하게 느껴질 수 있어요.',
    labWhiteBalance: 0.8,
    look: look({
      exposure: 0.2,
      temperature: 0.32,
      tint: 0.05,
      crosstalk: softCross(0.05),
      curves: {
        master: [[0, 0.035], [0.12, 0.13], [0.5, 0.52], [0.82, 0.83], [1, 0.965]],
        r: [[0, 0.01], [0.5, 0.505], [1, 1]],
        b: [[0, 0.03], [0.5, 0.49], [1, 0.97]],
      },
      saturation: 0.9,
      highlightDesat: 0.4,
      hues: {
        red: { hue: 4, sat: -0.08 },
        orange: { hue: 2, sat: 0.05, lum: 0.01 },
        yellow: { hue: -6, sat: -0.12 },
        green: { hue: -10, sat: -0.28, lum: 0.01 },
        aqua: { hue: -6, sat: -0.15 },
        blue: { hue: -6, sat: -0.1 },
      },
      shadows: { hue: 210, amount: 0.006 },
      highlights: { hue: 65, amount: 0.008 },
      skinProtect: 0.85,
      grain: { amount: 0.3, size: 0.9, color: 0.35 },
    }),
  },
  {
    id: 'gold200',
    name: 'Sunday Gold',
    film: 'Kodak Gold 200',
    reference: 'Kodak Gold 200 · Noritsu scan',
    iso: 200,
    tagline: '노란 햇살이 내려앉은 듯한 일상. 맑은 날 산책용.',
    situations: { sunny: 2, golden: 2, window: 1, sea: 1, green: 1, portrait: 1 },
    avoid: '흐린 날이나 형광등 아래에서는 누렇게 뜰 수 있어요.',
    labWhiteBalance: 0.5,
    look: look({
      exposure: 0.25,
      temperature: 0.4,
      tint: 0.02,
      crosstalk: softCross(0.04),
      curves: {
        master: [[0, 0.03], [0.2, 0.18], [0.5, 0.52], [0.8, 0.85], [1, 0.975]],
        r: [[0, 0.02], [0.5, 0.52], [1, 1]],
        g: [[0, 0.01], [0.5, 0.505], [1, 0.99]],
        b: [[0, 0.04], [0.5, 0.46], [1, 0.9]],
      },
      saturation: 1.08,
      hues: {
        red: { hue: 6, sat: 0.05 },
        orange: { hue: 4, sat: 0.08 },
        yellow: { hue: -4, sat: 0.12, lum: 0.02 },
        green: { hue: -16, sat: -0.12 },
        blue: { hue: -4, sat: -0.05 },
      },
      shadows: { hue: 50, amount: 0.006 },
      highlights: { hue: 75, amount: 0.014 },
      grain: { amount: 0.3, size: 0.8, color: 0.4 },
    }),
  },
  {
    id: 'superia400',
    name: 'City Green',
    film: 'Fujifilm Superia 400',
    reference: 'Fujifilm Superia X-TRA 400 · Frontier scan',
    iso: 400,
    tagline: '초록과 파랑이 맑게 살아나는 후지의 일상 색감.',
    situations: { sunny: 2, sea: 2, green: 2, golden: 1, overcast: 1, window: 1, night: 1, portrait: 1 },
    avoid: '피부가 약간 차갑게 보일 수 있어요. 인물만 찍는 날엔 Dear Skin을 추천해요.',
    labWhiteBalance: 0.8,
    look: look({
      exposure: 0.2,
      temperature: -0.08,
      tint: -0.1,
      crosstalk: softCross(0.03),
      curves: {
        master: [[0, 0.025], [0.15, 0.13], [0.5, 0.5], [0.8, 0.84], [1, 0.98]],
        g: [[0, 0.03], [0.5, 0.505], [1, 1]],
        b: [[0, 0.045], [0.4, 0.41], [1, 0.97]],
        r: [[0, 0], [0.5, 0.49], [1, 1]],
      },
      saturation: 1.06,
      hues: {
        red: { hue: -4, sat: 0.04 },
        orange: { sat: -0.04 },
        yellow: { hue: 6, sat: -0.04 },
        green: { hue: 14, sat: 0.06, lum: -0.01 },
        aqua: { hue: 6, sat: 0.1 },
        blue: { hue: -8, sat: 0.08, lum: -0.02 },
        magenta: { hue: -6 },
      },
      shadows: { hue: 175, amount: 0.012 },
      highlights: { hue: 80, amount: 0.004 },
      grain: { amount: 0.38, size: 1.0, color: 0.4 },
    }),
  },
  {
    id: 'pastel400',
    name: 'Cloud Pastel',
    film: 'Fujifilm Pro 400H',
    reference: 'Fujifilm Pro 400H · overexposed, Frontier scan',
    iso: 400,
    tagline: '한 스톱 밝게 찍은 듯 뽀얀 파스텔. 흐린 날이 오히려 예뻐요.',
    situations: { overcast: 2, window: 2, green: 2, portrait: 2, sunny: 1, golden: 1, sea: 1 },
    avoid: '밤이나 어두운 실내에서는 뿌옇게 떠 보일 수 있어요.',
    labWhiteBalance: 0.9,
    look: look({
      exposure: 0.6,
      temperature: -0.02,
      tint: -0.06,
      crosstalk: softCross(0.06),
      curves: {
        master: [[0, 0.06], [0.2, 0.22], [0.5, 0.56], [0.8, 0.86], [1, 0.96]],
        g: [[0, 0.01], [0.5, 0.505], [1, 1]],
        b: [[0, 0.02], [0.5, 0.505], [1, 0.985]],
      },
      saturation: 0.82,
      shadowDesat: 0.35,
      highlightDesat: 0.5,
      hues: {
        red: { hue: -4, sat: -0.06 },
        orange: { sat: -0.06, lum: 0.02 },
        yellow: { hue: 8, sat: -0.2 },
        green: { hue: 18, sat: -0.05, lum: 0.02 },
        aqua: { hue: 4, sat: 0.05 },
        blue: { hue: -10, sat: -0.05 },
      },
      shadows: { hue: 185, amount: 0.01 },
      highlights: { hue: 110, amount: 0.004 },
      grain: { amount: 0.26, size: 0.85, color: 0.3 },
    }),
  },
  {
    id: 'ektar100',
    name: 'Vivid Trip',
    film: 'Kodak Ektar 100',
    reference: 'Kodak Ektar 100',
    iso: 100,
    tagline: '세상에서 가장 고운 입자와 진한 색. 여행 풍경용.',
    situations: { sunny: 2, golden: 2, sea: 2, green: 2 },
    avoid: '피부가 붉게 나오기 쉬워서 인물 클로즈업에는 맞지 않아요.',
    labWhiteBalance: 0.7,
    look: look({
      exposure: 0.1,
      temperature: 0.06,
      crosstalk: [1.06, -0.04, -0.02, -0.03, 1.05, -0.02, -0.02, -0.05, 1.07],
      curves: {
        master: [[0, 0.015], [0.18, 0.13], [0.5, 0.51], [0.82, 0.88], [1, 0.985]],
        r: [[0, 0], [0.5, 0.51], [1, 1]],
        b: [[0, 0.02], [0.5, 0.49], [1, 0.99]],
      },
      saturation: 1.12,
      shadowDesat: 0.1,
      highlightDesat: 0.2,
      hues: {
        red: { hue: -2, sat: 0.06, lum: -0.01 },
        orange: { hue: 2, sat: -0.04, lum: 0.01 },
        yellow: { sat: 0.02 },
        green: { hue: -4, sat: 0.05, lum: -0.02 },
        blue: { hue: -6, sat: 0.12, lum: -0.03 },
        aqua: { hue: 4, sat: 0.1 },
      },
      shadows: { hue: 230, amount: 0.006 },
      highlights: { hue: 60, amount: 0.004 },
      soften: 0.06,
      grain: { amount: 0.2, size: 0.6, color: 0.3 },
    }),
  },
  {
    id: 'flash800',
    name: 'Party Flash',
    film: '일회용 카메라와 플래시',
    reference: 'Disposable camera (Fuji QuickSnap / Kodak FunSaver), flash on',
    iso: 800,
    tagline: '정면 플래시, 진한 비네팅, 날짜 각인까지. 그날의 분위기 그대로.',
    situations: { flash: 2, tungsten: 1, night: 1, portrait: 1, sunny: 1 },
    avoid: '풍경이나 넓은 장면은 플래시가 닿지 않아 어둡게 나와요.',
    labWhiteBalance: 0.6,
    look: look({
      exposure: 0.15,
      temperature: 0.05,
      tint: -0.12,
      crosstalk: softCross(0.04),
      curves: {
        master: [[0, 0.03], [0.15, 0.1], [0.5, 0.53], [0.78, 0.86], [1, 0.97]],
        g: [[0, 0.03], [0.5, 0.51], [1, 0.99]],
        b: [[0, 0.05], [0.5, 0.48], [1, 0.95]],
      },
      saturation: 1.1,
      shadowDesat: 0.15,
      hues: {
        red: { sat: 0.08 },
        orange: { hue: 2, sat: 0.04, lum: 0.02 },
        green: { hue: 10, sat: 0.05 },
        aqua: { sat: 0.08 },
      },
      shadows: { hue: 155, amount: 0.014 },
      highlights: { hue: 70, amount: 0.008 },
      halation: { amount: 0.06, threshold: 0.8, radius: 0.012, color: [1, 0.35, 0.1] },
      soften: 0.12,
      lens: { cornerSoftness: 0.16, aberration: 0.0018 },
      vignette: { amount: 0.55, size: 0.85 },
      flash: 0.55,
      effects: { leak: 0.25, dust: 0.2 },
      grain: { amount: 0.55, size: 1.25, color: 0.5 },
    }),
  },
  {
    id: 'tungsten800',
    name: 'Neon Night',
    film: 'CineStill 800T',
    reference: 'CineStill 800T (Kodak Vision3 500T, remjet removed)',
    iso: 800,
    tagline: '불빛마다 붉은 번짐이 생기는 영화 같은 밤.',
    situations: { night: 2, tungsten: 2, flash: 1, portrait: 1 },
    avoid: '맑은 낮에는 푸르게 나와요. 현상소 보정을 끄면 진짜 텅스텐 필름처럼 더 푸르러져요.',
    labWhiteBalance: 0.35,
    look: look({
      exposure: 0.25,
      temperature: -0.55,
      tint: -0.05,
      crosstalk: softCross(0.04),
      curves: {
        master: [[0, 0.03], [0.15, 0.12], [0.5, 0.5], [0.8, 0.83], [1, 0.97]],
        r: [[0, 0], [0.5, 0.5], [1, 1]],
        g: [[0, 0.02], [0.5, 0.5], [1, 0.99]],
        b: [[0, 0.06], [0.4, 0.42], [1, 0.97]],
      },
      saturation: 1.02,
      shadowDesat: 0.25,
      hues: {
        red: { hue: 6, sat: 0.08 },
        orange: { hue: 4 },
        yellow: { hue: -10, sat: -0.1 },
        green: { hue: 20, sat: -0.1 },
        aqua: { hue: 4, sat: 0.12 },
        blue: { hue: 6, sat: 0.08 },
      },
      shadows: { hue: 200, amount: 0.018 },
      highlights: { hue: 50, amount: 0.006 },
      halation: { amount: 0.35, threshold: 0.6, radius: 0.016, color: [1, 0.18, 0.05] },
      bloom: { amount: 0.05 },
      grain: { amount: 0.42, size: 1.2, color: 0.4 },
    }),
  },
  {
    id: 'mono400',
    name: 'Silver 400',
    film: 'Ilford HP5, Kodak Tri-X',
    reference: 'Ilford HP5 Plus / Kodak Tri-X 400',
    iso: 400,
    tagline: '거친 입자와 깊은 그림자의 흑백. 표정과 빛이 남아요.',
    situations: { golden: 2, overcast: 2, night: 2, portrait: 2, sunny: 1, window: 1, tungsten: 1, flash: 1 },
    avoid: '색이 주인공인 장면(꽃, 노을의 색)에는 아쉬워요.',
    labWhiteBalance: 0,
    look: look({
      exposure: 0.2,
      // Panchromatic film is a bit less red-sensitive than the eye: skies darker than a phone B&W.
      mono: [0.26, 0.62, 0.12],
      curves: {
        master: [[0, 0.03], [0.12, 0.07], [0.35, 0.3], [0.5, 0.5], [0.75, 0.8], [1, 0.97]],
      },
      saturation: 0,
      shadows: { hue: 250, amount: 0.002 },
      highlights: { hue: 70, amount: 0.004 },
      halation: { amount: 0.02, threshold: 0.9, radius: 0.01, color: [1, 1, 1] },
      soften: 0.08,
      vignette: { amount: 0.25, size: 1 },
      grain: { amount: 0.65, size: 1.15, color: 0 },
    }),
  },
  // ---- Looks derived from measured scans (tools/derive_curves.py) ----
  {
    id: 'instant',
    name: 'Mellow Instant',
    film: '인스턴트 필름',
    reference: 'Instant print (Instax/Polaroid-style), flash on, measured from reference scans',
    iso: 800,
    tagline: '뽀얗게 바랜 인스턴트 사진. 밤 산책과 플래시에 잘 어울려요.',
    situations: { night: 2, flash: 2, portrait: 2, window: 1, overcast: 1, tungsten: 1 },
    avoid: '쨍한 풍경 사진은 너무 바래 보일 수 있어요.',
    labWhiteBalance: 0.7,
    look: look({
      exposure: 0.2,
      temperature: -0.05,
      crosstalk: softCross(0.06),
      curves: measured({ master: [[0, 0], [1, 1]], r: [[0.0, 0.09], [0.2, 0.24], [0.46, 0.471], [0.75, 0.757], [1.0, 0.915]], g: [[0.0, 0.135], [0.2, 0.281], [0.46, 0.474], [0.75, 0.711], [1.0, 0.87]], b: [[0.0, 0.13], [0.2, 0.266], [0.46, 0.437], [0.75, 0.672], [1.0, 0.825]] }),
      saturation: 0.72,
      shadowDesat: 0.2,
      highlightDesat: 0.35,
      hues: { red: { sat: 0.1 }, orange: { sat: 0.15, lum: 0.01 }, green: { hue: 10, sat: -0.15 }, blue: { hue: -6 } },
      skinProtect: 0.7,
      halation: { amount: 0.05, threshold: 0.8, radius: 0.014, color: [1, 0.4, 0.15] },
      soften: 0.1,
      lens: { cornerSoftness: 0.12, aberration: 0.0012 },
      vignette: { amount: 0.35, size: 0.9 },
      flash: 0.3,
      effects: { dust: 0.15 },
      grain: { amount: 0.32, size: 1.1, color: 0.3 },
    }),
  },
  {
    id: 'bright',
    name: 'Seaside 35',
    film: '과노출 컴팩트 카메라',
    reference: 'Point-and-shoot, ~1 stop overexposed consumer 200/400, lab scan; measured from reference scans',
    iso: 200,
    tagline: '한 스톱 넘치게 찍은 듯 환하고 바랜 여행 사진. 날짜 각인과 잘 어울려요.',
    situations: { sunny: 2, sea: 2, overcast: 1, window: 1, portrait: 1, golden: 1 },
    avoid: '밤이나 어두운 곳에서는 뿌옇게만 나와요.',
    labWhiteBalance: 0.7,
    look: look({
      exposure: 0.55,
      temperature: -0.04,
      crosstalk: softCross(0.05),
      curves: measured({ master: [[0, 0], [1, 1]], r: [[0.0, 0.19], [0.2, 0.329], [0.46, 0.602], [0.75, 0.849], [1.0, 1.0]], g: [[0.0, 0.24], [0.2, 0.37], [0.46, 0.626], [0.75, 0.864], [1.0, 1.0]], b: [[0.0, 0.24], [0.2, 0.372], [0.46, 0.626], [0.75, 0.864], [1.0, 0.99]] }),
      saturation: 0.86,
      shadowDesat: 0.25,
      highlightDesat: 0.45,
      hues: { red: { sat: 0.12 }, orange: { sat: 0.06 }, yellow: { hue: 6, sat: -0.1 }, blue: { hue: -6, sat: 0.1 } },
      skinProtect: 0.6,
      halation: { amount: 0.06, threshold: 0.85, radius: 0.014, color: [1, 0.35, 0.1] },
      soften: 0.12,
      lens: { cornerSoftness: 0.1, aberration: 0.0009 },
      vignette: { amount: 0.15, size: 1.1 },
      grain: { amount: 0.34, size: 1.0, color: 0.35 },
    }),
  },
  {
    id: 'golden',
    name: 'Late Sun',
    film: '따뜻한 컨슈머 필름',
    reference: 'Warm consumer 200 in late sun, contrasty scan; measured from reference scans',
    iso: 200,
    tagline: '늦은 오후 햇살처럼 진하고 따뜻한 금빛. 역광 인물에 강해요.',
    situations: { golden: 2, portrait: 2, sunny: 2, window: 1, green: 1 },
    avoid: '형광등 아래에서는 누렇게 뜰 수 있어요.',
    labWhiteBalance: 0.45,
    look: look({
      exposure: 0.15,
      temperature: 0.15,
      crosstalk: softCross(0.03),
      curves: measured({ master: [[0, 0], [1, 1]], r: [[0.0, 0.03], [0.2, 0.176], [0.46, 0.504], [0.75, 0.841], [1.0, 0.99]], g: [[0.0, 0.03], [0.2, 0.162], [0.46, 0.461], [0.75, 0.792], [1.0, 0.945]], b: [[0.0, 0.03], [0.2, 0.151], [0.46, 0.43], [0.75, 0.734], [1.0, 0.88]] }),
      saturation: 1.1,
      shadowDesat: 0.25,
      highlightDesat: 0.25,
      hues: { red: { hue: 4, sat: 0.05 }, orange: { hue: 3, sat: 0.06 }, yellow: { hue: -6, sat: 0.05 }, green: { hue: -14, sat: -0.15 }, blue: { hue: -4, sat: -0.05 } },
      skinProtect: 0.6,
      halation: { amount: 0.1, threshold: 0.8, radius: 0.014, color: [1, 0.3, 0.08] },
      soften: 0.1,
      grain: { amount: 0.3, size: 0.85, color: 0.35 },
    }),
  },
  {
    id: 'summer',
    name: 'Summer Walk',
    film: '쨍한 여름 필름',
    reference: 'Saturated consumer 400 in hard summer light, olive shadows; measured from reference scans',
    iso: 400,
    tagline: '쨍한 여름 골목. 초록과 파랑이 또렷하고 그림자엔 올리브빛이 돌아요.',
    situations: { sunny: 2, green: 2, sea: 1, golden: 1, portrait: 1 },
    avoid: '흐린 날에는 초록 기가 강하게 느껴질 수 있어요.',
    labWhiteBalance: 0.7,
    look: look({
      exposure: 0.15,
      crosstalk: softCross(0.03),
      curves: measured({ master: [[0, 0], [1, 1]], r: [[0.0, 0.05], [0.2, 0.179], [0.46, 0.501], [0.75, 0.812], [1.0, 0.955]], g: [[0.0, 0.095], [0.2, 0.212], [0.46, 0.502], [0.75, 0.781], [1.0, 0.91]], b: [[0.0, 0.035], [0.2, 0.166], [0.46, 0.479], [0.75, 0.79], [1.0, 0.94]] }),
      saturation: 1.1,
      shadowDesat: 0.15,
      hues: { orange: { sat: 0.04 }, yellow: { hue: 4, sat: 0.06 }, green: { hue: -4, sat: 0.18 }, aqua: { sat: 0.1 }, blue: { hue: -6, sat: 0.12, lum: -0.02 } },
      skinProtect: 0.6,
      grain: { amount: 0.34, size: 1.0, color: 0.4 },
    }),
  },
];

export const profileById = (id: string) => PROFILES.find((p) => p.id === id) ?? PROFILES[0];

// ---------------------------------------------------------------------------
// User cameras and darkroom edits, stored on this device.
// They are merged into PROFILES at startup so every screen sees them.

const CUSTOM_KEY = 'custom.profiles.v1';
const OVERRIDES_KEY = 'darkroom.overrides.v1';

/** Built-in looks as shipped, for "기본값으로 되돌리기". */
const DEFAULT_LOOKS = new Map(PROFILES.map((p) => [p.id, p.look]));
export const defaultLook = (id: string) => DEFAULT_LOOKS.get(id) ?? profileById(id).look;

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: lasts for this session */
  }
}

/** Apply darkroom edits (built-in cameras only) so the camera uses them too. */
export function applyOverrides(overrides: Record<string, LookParams>) {
  for (const p of PROFILES) {
    if (p.custom) continue;
    p.look = overrides[p.id] ?? DEFAULT_LOOKS.get(p.id) ?? p.look;
  }
}

export function customProfiles(): FilmProfile[] {
  return PROFILES.filter((p) => p.custom);
}

export function saveCustomProfile(profile: FilmProfile) {
  const i = PROFILES.findIndex((p) => p.id === profile.id);
  if (i >= 0) PROFILES[i] = profile;
  else PROFILES.push(profile);
  write(CUSTOM_KEY, customProfiles());
}

export function deleteCustomProfile(id: string) {
  const i = PROFILES.findIndex((p) => p.id === id && p.custom);
  if (i >= 0) PROFILES.splice(i, 1);
  write(CUSTOM_KEY, customProfiles());
}

if (typeof window !== 'undefined') {
  for (const p of read<FilmProfile[]>(CUSTOM_KEY, [])) if (p?.id && p.look && !PROFILES.some((x) => x.id === p.id)) PROFILES.push({ ...p, custom: true });
  applyOverrides(read<Record<string, LookParams>>(OVERRIDES_KEY, {}));
}
