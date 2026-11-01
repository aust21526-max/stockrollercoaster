/**
 * GLSL ES 3.00 shaders for the film pipeline.
 *
 * Intermediate textures hold *linear* light. When float render targets are
 * unavailable we fall back to RGBA8 with a sqrt encoding (headroom ×4), see enc()/dec().
 */

export const VERT = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  // Fullscreen triangle.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform bool uEncoded;
vec3 enc(vec3 c) { return uEncoded ? sqrt(clamp(c, 0.0, 4.0) * 0.25) : c; }
vec3 dec(vec3 c) { return uEncoded ? c * c * 4.0 : c; }
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
`;

/** Pass 1: linear-light corrections at output resolution. */
export const PREP = /* glsl */ `${COMMON}
uniform sampler2D uSrc;      // SRGB8_ALPHA8: sampling returns linear
uniform float uExposure;     // linear multiplier
uniform vec3 uWB;            // linear multipliers
uniform mat3 uCross;
uniform vec3 uMono;
uniform bool uIsMono;
uniform float uFlash;
uniform float uAspect;       // width / height
uniform vec4 uCrop;          // source uv rect: x, y, w, h
void main() {
  vec3 c = texture(uSrc, uCrop.xy + vUv * uCrop.zw).rgb;
  c *= uWB * uExposure;
  if (uFlash > 0.0) {
    vec2 d = vUv - vec2(0.5, 0.54);
    d.x *= uAspect;
    float r = length(d) / (0.5 * sqrt(uAspect * uAspect + 1.0));
    float f = 1.0 / (1.0 + pow(r / 0.42, 2.0));
    c *= 1.0 + uFlash * (2.0 * f - 0.55);
    c *= mix(vec3(1.0), vec3(0.96, 1.0, 1.07), uFlash);
  }
  c = max(uCross * c, 0.0);
  if (uIsMono) c = vec3(dot(c, uMono));
  outColor = vec4(enc(c), 1.0);
}`;

/** Bright-pass for halation and bloom, rendered at quarter resolution. */
export const EXTRACT = /* glsl */ `${COMMON}
uniform sampler2D uPrep;
uniform vec2 uTexel;         // source texel size
uniform float uThreshold;
void main() {
  vec3 c = 0.25 * (
    dec(texture(uPrep, vUv + uTexel * vec2(-1.0, -1.0)).rgb) +
    dec(texture(uPrep, vUv + uTexel * vec2( 1.0, -1.0)).rgb) +
    dec(texture(uPrep, vUv + uTexel * vec2(-1.0,  1.0)).rgb) +
    dec(texture(uPrep, vUv + uTexel * vec2( 1.0,  1.0)).rgb));
  float l = dot(c, LUMA);
  float k = smoothstep(uThreshold * 0.6, uThreshold * 1.4, l);
  outColor = vec4(enc(c * k), 1.0);
}`;

/** Separable 13-tap gaussian. */
export const BLUR = /* glsl */ `${COMMON}
uniform sampler2D uTex;
uniform vec2 uStep;          // direction * texel * spread
const float W[7] = float[7](0.1974, 0.1747, 0.1210, 0.0656, 0.0278, 0.0092, 0.0024);
void main() {
  vec3 acc = dec(texture(uTex, vUv).rgb) * W[0];
  for (int i = 1; i < 7; i++) {
    vec2 o = uStep * float(i);
    acc += dec(texture(uTex, vUv + o).rgb) * W[i];
    acc += dec(texture(uTex, vUv - o).rgb) * W[i];
  }
  outColor = vec4(enc(acc / 0.9988), 1.0);
}`;

/** Final pass: optics, tone, color, grain. Writes display sRGB. */
export const FINAL = /* glsl */ `${COMMON}
uniform sampler2D uSrc;      // original (linear via sRGB sampler) for strength blend
uniform sampler2D uPrep;
uniform sampler2D uSoft;
uniform sampler2D uGlow;
uniform sampler2D uLut;
uniform float uLutSize;

uniform float uAspect;
uniform vec2 uResolution;    // output px
uniform float uSeed;

uniform float uSoften;
uniform float uCornerSoft;
uniform float uAberration;
uniform float uVigAmount;
uniform float uVigSize;
uniform float uHalAmount;
uniform vec3 uHalColor;
uniform float uBloom;

uniform bool uIsMono;
uniform vec3 uHueAdj[8];     // (hue deg, sat offset, lum offset)
uniform float uSat;
uniform float uShadowDesat;
uniform float uHighlightDesat;
uniform vec3 uShadowTone;    // (cos, sin, amount) in Oklab ab
uniform vec3 uHighlightTone;
uniform float uSkin;

uniform float uGrainAmount;
uniform float uGrainSize;    // relative to height, x1000
uniform float uGrainColor;
uniform float uStrength;
uniform vec4 uCrop;
uniform float uLeak;
uniform float uDust;
uniform float uStar;
uniform float uPrism;
uniform float uFxSeed;
uniform bool uFast;

vec3 hue2rgb(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}

const float HUE_C[9] = float[9](25.0, 55.0, 100.0, 140.0, 195.0, 255.0, 295.0, 335.0, 385.0);

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 toLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0); m = pow(max(m, 0.0), 1.0 / 3.0); s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}

// Film shoulder: identity below the knee, smooth exponential roll-off to 1.
vec3 shoulder(vec3 x) {
  const float k = 0.78;
  vec3 over = k + (1.0 - k) * (1.0 - exp(-(x - k) / (1.0 - k)));
  return mix(x, over, step(k, x));
}

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}
float grainField(vec2 p) {
  return vnoise(p) * 0.7 + vnoise(p * 2.13 + 17.3) * 0.45;
}

vec3 tone(vec3 s) {
  float n = uLutSize;
  vec3 t = s * ((n - 1.0) / n) + 0.5 / n;
  return vec3(texture(uLut, vec2(t.r, 0.5)).r, texture(uLut, vec2(t.g, 0.5)).g, texture(uLut, vec2(t.b, 0.5)).b);
}

void main() {
  vec2 uv = vUv;
  vec2 d = uv - 0.5;
  vec2 da = d; da.x *= uAspect;
  float halfDiag = 0.5 * sqrt(uAspect * uAspect + 1.0);
  float r = length(da) / halfDiag;          // 0 center, 1 corner

  // --- optics (linear) ---
  vec3 lin;
  if (uAberration > 0.0) {
    float s = uAberration * r * r * 2.0;
    lin.r = dec(texture(uPrep, 0.5 + d * (1.0 + s)).rgb).r;
    lin.g = dec(texture(uPrep, uv).rgb).g;
    lin.b = dec(texture(uPrep, 0.5 + d * (1.0 - s)).rgb).b;
  } else {
    lin = dec(texture(uPrep, uv).rgb);
  }
  float sw = clamp(uSoften * 0.65 + uCornerSoft * smoothstep(0.3, 1.0, r), 0.0, 1.0);
  lin = mix(lin, dec(texture(uSoft, uv).rgb), sw);

  vec3 glow = dec(texture(uGlow, uv).rgb);
  lin += uHalAmount * uHalColor * dot(glow, LUMA) + uBloom * glow;

  float cosA = cos(atan(r / max(uVigSize, 0.05)));
  lin *= mix(1.0, cosA * cosA * cosA * cosA, uVigAmount);

  // --- lens filters (linear) ---
  if (uStar > 0.0) {
    // Cross-screen filter: four rays from every bright point.
    vec3 st = vec3(0.0);
    float len = 0.14;
    int steps = uFast ? 8 : 26;
    // Jitter the sample positions per pixel so rays are smooth, not dotted.
    float jit = hash(gl_FragCoord.xy + 3.7);
    float ang = 0.35;
    for (int k = 0; k < 2; k++) {
      float a = ang + float(k) * 1.5708;
      vec2 dir = vec2(cos(a) / uAspect, sin(a)) * len;
      for (int i = 1; i <= 26; i++) {
        if (i > steps) break;
        float t = (float(i) - jit) / float(steps);
        float w = (1.0 - t) * (1.0 - t);
        vec2 p1 = uv + dir * t;
        vec2 p2 = uv - dir * t;
        // Only small bright points make rays: subtract the wide highlight blur,
        // which is high over big bright areas (sky, walls) and low around points.
        float b1 = max(dot(dec(texture(uPrep, p1).rgb), LUMA) - 0.7 - 1.2 * dot(dec(texture(uGlow, p1).rgb), LUMA), 0.0);
        float b2 = max(dot(dec(texture(uPrep, p2).rgb), LUMA) - 0.7 - 1.2 * dot(dec(texture(uGlow, p2).rgb), LUMA), 0.0);
        st += vec3(1.0, 0.97, 0.92) * (b1 + b2) * w;
      }
    }
    lin += st * uStar * (uFast ? 2.2 : 0.7);
  }
  if (uPrism > 0.0) {
    // A prism at the lens edge: a displaced, rainbow-tinted ghost on one side.
    float side = step(0.5, fract(uFxSeed * 0.731));
    float ex = side > 0.5 ? 1.0 - uv.x : uv.x;
    float mask = 1.0 - smoothstep(0.0, 0.42, ex);
    vec2 o = vec2((side > 0.5 ? -1.0 : 1.0) * 0.06, 0.01);
    float gl = dot(dec(texture(uPrep, uv + o).rgb), LUMA);
    vec3 rainbow = hue2rgb(fract(uv.y * 1.3 + ex * 2.0 + fract(uFxSeed * 0.37)));
    lin += gl * rainbow * mask * uPrism * 0.7;
  }

  // --- tone (display) ---
  vec3 s = toSrgb(shoulder(max(lin, 0.0)));
  s = tone(s);

  // --- color (Oklab) ---
  vec3 lab = linToOklab(toLinear(s));
  float L = lab.x;
  float C = length(lab.yz);
  float h = degrees(atan(lab.z, lab.y));
  if (!uIsMono) {
    float hh = h < HUE_C[0] ? h + 360.0 : h;
    int i = 0;
    for (int k = 0; k < 8; k++) { if (hh >= HUE_C[k]) i = k; }
    float t = (hh - HUE_C[i]) / (HUE_C[i + 1] - HUE_C[i]);
    vec3 adj = mix(uHueAdj[i], uHueAdj[(i + 1) % 8], smoothstep(0.0, 1.0, t));
    float cw = smoothstep(0.0, 0.06, C);
    h += adj.x * cw;
    C *= 1.0 + adj.y;
    L += adj.z * cw;
    C *= uSat;
    C *= 1.0 - uShadowDesat * (1.0 - smoothstep(0.05, 0.45, L));
    C *= 1.0 - uHighlightDesat * smoothstep(0.72, 1.0, L);
  }
  if (!uIsMono && uSkin > 0.0) {
    // Skin: medium-light, moderately saturated, red-orange-yellow. Pull its hue back
    // into the natural band and keep at least most of its original chroma.
    float h0 = degrees(atan(lab.z, lab.y));
    float c0 = length(lab.yz);
    float inBand = smoothstep(15.0, 35.0, h0) * (1.0 - smoothstep(80.0, 100.0, h0));
    float skinLike = inBand * smoothstep(0.02, 0.05, c0) * (1.0 - smoothstep(0.16, 0.22, c0)) * smoothstep(0.35, 0.5, lab.x);
    float w = uSkin * skinLike;
    h = mix(h, clamp(h, 40.0, 68.0), w);
    C = mix(C, max(C, c0 * 0.9), w);
  }
  vec2 ab = C * vec2(cos(radians(h)), sin(radians(h)));
  float ws = 1.0 - smoothstep(0.0, 0.6, L);
  float wh = smoothstep(0.5, 1.0, L);
  ab += ws * uShadowTone.z * uShadowTone.xy + wh * uHighlightTone.z * uHighlightTone.xy;
  s = toSrgb(oklabToLin(vec3(L, ab)));

  // --- light leak (display, screen blend) ---
  if (uLeak > 0.0) {
    float seed = fract(uFxSeed * 0.618) ;
    float side = step(0.5, fract(seed * 7.13));
    float y0 = 0.15 + 0.7 * fract(seed * 3.71);
    float dx = side > 0.5 ? 1.0 - uv.x : uv.x;
    float dy = uv.y - y0;
    float w = exp(-dx * dx / 0.02) * exp(-dy * dy / 0.18) + 0.45 * exp(-dx * dx / 0.1) * exp(-dy * dy / 0.5);
    w = clamp(w, 0.0, 1.0);
    vec3 col = mix(vec3(0.95, 0.18, 0.05), vec3(1.0, 0.72, 0.32), smoothstep(0.35, 1.0, w));
    s = 1.0 - (1.0 - s) * (1.0 - clamp(col * w * uLeak * 1.3, 0.0, 1.0));
  }

  // --- grain (display) ---
  if (uGrainAmount > 0.0) {
    float cellRaw = uGrainSize * uResolution.y / 1000.0;
    float cell = max(cellRaw, 1.0);
    vec2 p = gl_FragCoord.xy / cell + uSeed * 37.0;
    float gm = grainField(p);
    vec3 gc = vec3(gm, grainField(p + 71.7), grainField(p + 143.1));
    vec3 g = mix(vec3(gm), gc, uIsMono ? 0.0 : uGrainColor);
    float l = dot(s, LUMA);
    float w = clamp(1.0 - pow(abs(l - 0.4) / 0.6, 2.0), 0.18, 1.0);
    s += g * uGrainAmount * w * 0.11 * min(cellRaw, 1.0);
  }

  // --- dust and scratches (display) ---
  if (uDust > 0.0) {
    float cellPx = uResolution.y / 90.0;
    vec2 gp = gl_FragCoord.xy / cellPx;
    vec2 cell = floor(gp);
    vec2 f = fract(gp);
    float h = hash(cell + uFxSeed * 13.0);
    if (h < 0.03 * uDust) {
      vec2 c = vec2(hash(cell + 1.7), hash(cell + 3.1));
      float r = mix(0.05, 0.2, hash(cell + 5.3));
      float speck = 1.0 - smoothstep(r * 0.55, r, length(f - c));
      s = mix(s, vec3(0.93, 0.92, 0.9), speck * 0.8);
    }
    float lx = uv.x * 30.0;
    float lc = floor(lx);
    float lh = hash(vec2(lc, uFxSeed * 3.0 + 1.0));
    if (lh < 0.08 * uDust) {
      float xpos = 0.2 + 0.6 * hash(vec2(lc, 7.0 + uFxSeed));
      float wob = sin(uv.y * 7.0 + lh * 40.0) * 0.04;
      float d = abs(fract(lx) - xpos - wob) * (uResolution.x / 30.0);
      float y0 = hash(vec2(lc, 11.0 + uFxSeed));
      float seg = smoothstep(0.0, 0.05, uv.y - y0 * 0.6) * (1.0 - smoothstep(0.0, 0.05, uv.y - y0 * 0.6 - 0.25 - 0.4 * lh / 0.08));
      s = mix(s, vec3(0.9), (1.0 - smoothstep(0.4, 1.4, d)) * 0.45 * seg);
    }
  }

  // --- strength blend + dither ---
  vec3 orig = toSrgb(texture(uSrc, uCrop.xy + uv * uCrop.zw).rgb);
  s = mix(orig, s, uStrength);
  s += (hash(gl_FragCoord.xy + uSeed) - 0.5) / 255.0;
  outColor = vec4(clamp(s, 0.0, 1.0), 1.0);
}`;
