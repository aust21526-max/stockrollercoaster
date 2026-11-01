import { bakeToneLut, LUT_SIZE } from './curves';
import { BLUR, EXTRACT, FINAL, PREP, VERT } from './shaders';
import { HUE_BANDS, type DevelopOptions, type LookParams } from './types';
import type { LabCorrection } from './analyze';

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };
type Program = { prog: WebGLProgram; loc: Map<string, WebGLUniformLocation | null> };

const IDENTITY_CROSSTALK = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const FULL_FRAME: [number, number, number, number] = [0, 0, 1, 1];

/**
 * WebGL2 film renderer. One instance per canvas.
 *
 *   const r = new FilmRenderer(canvas);
 *   r.setSource(image, image.naturalWidth, image.naturalHeight);
 *   r.render(profile.look, { labCorrection: true, strength: 1, seed: 1 }, correction, 1600, 1200);
 */
export class FilmRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly floatTargets: boolean;
  readonly maxSize: number;

  private programs: Record<'prep' | 'extract' | 'blur' | 'final', Program>;
  private src: WebGLTexture | null = null;
  private srcW = 0;
  private srcH = 0;
  private lut: WebGLTexture;
  private lutKey = '';
  private targets = new Map<string, Target>();
  private vao: WebGLVertexArrayObject;

  constructor(readonly canvas: HTMLCanvasElement | OffscreenCanvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error('이 기기에서는 WebGL2를 쓸 수 없어서 필터를 적용할 수 없습니다.');
    this.gl = gl;
    this.floatTargets = !!gl.getExtension('EXT_color_buffer_float');
    this.maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    this.programs = {
      prep: this.compile(PREP),
      extract: this.compile(EXTRACT),
      blur: this.compile(BLUR),
      final: this.compile(FINAL),
    };
    this.vao = gl.createVertexArray()!;
    this.lut = gl.createTexture()!;
  }

  /** Fit (w, h) inside the GPU's texture limit, keeping aspect. */
  fit(w: number, h: number, max = this.maxSize): [number, number] {
    const s = Math.min(1, max / Math.max(w, h));
    return [Math.round(w * s), Math.round(h * s)];
  }

  /** Upload a photo or a video frame. Call again each frame for live preview. */
  setSource(source: TexImageSource, width: number, height: number, mipmaps = true) {
    const gl = this.gl;
    // WebGL ignores UNPACK_FLIP_Y for ImageBitmap (and VideoFrame) sources, which
    // would leave decoded photos upside down. Route them through a canvas.
    if ((typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) || (typeof VideoFrame !== 'undefined' && source instanceof VideoFrame)) {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      c.getContext('2d')!.drawImage(source as CanvasImageSource, 0, 0, width, height);
      source = c;
    }
    if (!this.src) this.src = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.srcW = width;
    this.srcH = height;
  }

  get sourceSize() {
    return { width: this.srcW, height: this.srcH };
  }

  render(look: LookParams, opts: DevelopOptions, correction: LabCorrection | null, outW: number, outH: number) {
    if (!this.src) return;
    const gl = this.gl;
    [outW, outH] = this.fit(outW, outH);
    if (this.canvas.width !== outW) this.canvas.width = outW;
    if (this.canvas.height !== outH) this.canvas.height = outH;
    gl.bindVertexArray(this.vao);
    this.updateLut(look);

    const aspect = outW / outH;
    const crop = opts.crop ?? FULL_FRAME;
    const prep = this.target('prep', outW, outH);
    const fast = !!opts.fast;
    const softDiv = fast ? 4 : 2;
    const glowDiv = fast ? 8 : 4;
    const halfW = Math.max(1, Math.round(outW / softDiv));
    const halfH = Math.max(1, Math.round(outH / softDiv));
    const softA = this.target('softA', halfW, halfH);
    const softB = this.target('softB', halfW, halfH);
    const qW = Math.max(1, Math.round(outW / glowDiv));
    const qH = Math.max(1, Math.round(outH / glowDiv));
    const glowA = this.target('glowA', qW, qH);
    const glowB = this.target('glowB', qW, qH);

    // 1. prep
    {
      let ev = look.exposure + (opts.ev ?? 0);
      let wb = whiteBalance(look.temperature, look.tint);
      if (opts.labCorrection && correction) {
        ev += correction.ev;
        wb = wb.map((v, i) => v * correction.gains[i]) as [number, number, number];
      }
      const p = this.use('prep', prep);
      this.bindTex(0, this.src, p, 'uSrc');
      gl.uniform1f(p.loc.get('uExposure')!, Math.pow(2, ev));
      gl.uniform3fv(p.loc.get('uWB')!, wb);
      // GLSL mat3 is column-major; our crosstalk is row-major.
      gl.uniformMatrix3fv(p.loc.get('uCross')!, true, look.crosstalk.length === 9 ? look.crosstalk : IDENTITY_CROSSTALK);
      gl.uniform3fv(p.loc.get('uMono')!, look.mono ?? [0.2126, 0.7152, 0.0722]);
      gl.uniform1i(p.loc.get('uIsMono')!, look.mono ? 1 : 0);
      gl.uniform1f(p.loc.get('uFlash')!, opts.flash ?? look.flash);
      gl.uniform1f(p.loc.get('uAspect')!, aspect);
      gl.uniform4fv(p.loc.get('uCrop')!, crop);
      this.draw();
    }

    // 2a. soft chain (half res) — de-sharpening and lens softness
    // Spread relative to frame height so a preview and a full-res export look alike.
    const softSpread = Math.max(0.35, outH / 2500);
    this.blurPass(prep, softA, [1, 0], softSpread);
    this.blurPass(softA, softB, [0, 1], softSpread / softDiv);

    // 2b. glow chain (quarter res) — halation and bloom
    {
      const p = this.use('extract', glowA);
      this.bindTex(0, prep.tex, p, 'uPrep');
      gl.uniform2f(p.loc.get('uTexel')!, (glowDiv / 4) * 0.5 / prep.w, (glowDiv / 4) * 0.5 / prep.h);
      gl.uniform1f(p.loc.get('uThreshold')!, look.halation.threshold);
      this.draw();
      const radiusPx = Math.max(1, look.halation.radius * qH);
      const spread = Math.max(1, radiusPx / 6 / (fast ? 1 : Math.SQRT2));
      for (let i = 0; i < (fast ? 1 : 2); i++) {
        this.blurPass(glowA, glowB, [1, 0], spread);
        this.blurPass(glowB, glowA, [0, 1], spread);
      }
    }

    // 3. final
    {
      const p = this.use('final', null, outW, outH);
      this.bindTex(0, this.src, p, 'uSrc');
      this.bindTex(1, prep.tex, p, 'uPrep');
      this.bindTex(2, softB.tex, p, 'uSoft');
      this.bindTex(3, glowA.tex, p, 'uGlow');
      this.bindTex(4, this.lut, p, 'uLut');
      const u = (n: string) => p.loc.get(n)!;
      gl.uniform1f(u('uLutSize'), LUT_SIZE);
      gl.uniform1f(u('uAspect'), aspect);
      gl.uniform2f(u('uResolution'), outW, outH);
      gl.uniform1f(u('uSeed'), opts.seed % 1000);
      gl.uniform1f(u('uSoften'), look.soften);
      gl.uniform1f(u('uCornerSoft'), look.lens.cornerSoftness);
      gl.uniform1f(u('uAberration'), look.lens.aberration);
      gl.uniform1f(u('uVigAmount'), look.vignette.amount);
      gl.uniform1f(u('uVigSize'), look.vignette.size);
      gl.uniform1f(u('uHalAmount'), look.halation.amount);
      gl.uniform3fv(u('uHalColor'), look.halation.color);
      gl.uniform1f(u('uBloom'), look.bloom.amount);
      gl.uniform1i(u('uIsMono'), look.mono ? 1 : 0);
      const hues = new Float32Array(24);
      HUE_BANDS.forEach((band, i) => {
        const a = look.hues[band];
        hues[i * 3] = a?.hue ?? 0;
        hues[i * 3 + 1] = a?.sat ?? 0;
        hues[i * 3 + 2] = a?.lum ?? 0;
      });
      gl.uniform3fv(u('uHueAdj'), hues);
      gl.uniform1f(u('uSat'), look.saturation);
      gl.uniform1f(u('uSkin'), look.skinProtect ?? 0.5);
      gl.uniform1f(u('uShadowDesat'), look.shadowDesat);
      gl.uniform1f(u('uHighlightDesat'), look.highlightDesat);
      gl.uniform3fv(u('uShadowTone'), toneVec(look.shadows.hue, look.shadows.amount));
      gl.uniform3fv(u('uHighlightTone'), toneVec(look.highlights.hue, look.highlights.amount));
      gl.uniform1f(u('uGrainAmount'), look.grain.amount);
      gl.uniform1f(u('uGrainSize'), look.grain.size);
      gl.uniform1f(u('uGrainColor'), look.grain.color);
      gl.uniform1f(u('uStrength'), opts.strength);
      gl.uniform4fv(u('uCrop'), crop);
      this.draw();
    }
  }

  /** Free the large textures but keep the compiled programs (call after a full-res render). */
  trim() {
    const gl = this.gl;
    for (const t of this.targets.values()) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    this.targets.clear();
    if (this.src) gl.deleteTexture(this.src);
    this.src = null;
  }

  dispose() {
    const gl = this.gl;
    for (const t of this.targets.values()) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    this.targets.clear();
    if (this.src) gl.deleteTexture(this.src);
    gl.deleteTexture(this.lut);
    Object.values(this.programs).forEach((p) => gl.deleteProgram(p.prog));
  }

  // ---------------------------------------------------------------------------

  private blurPass(from: Target, to: Target, dir: [number, number], spread: number) {
    const gl = this.gl;
    const p = this.use('blur', to);
    this.bindTex(0, from.tex, p, 'uTex');
    gl.uniform2f(p.loc.get('uStep')!, (dir[0] * spread) / from.w, (dir[1] * spread) / from.h);
    this.draw();
  }

  private updateLut(look: LookParams) {
    const key = JSON.stringify(look.curves);
    if (key === this.lutKey) return;
    this.lutKey = key;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.lut);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, LUT_SIZE, 1, 0, gl.RGBA, gl.FLOAT, bakeToneLut(look.curves));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private target(name: string, w: number, h: number): Target {
    const existing = this.targets.get(name);
    if (existing && existing.w === w && existing.h === h) return existing;
    const gl = this.gl;
    if (existing) {
      gl.deleteTexture(existing.tex);
      gl.deleteFramebuffer(existing.fbo);
    }
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (this.floatTargets) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const t = { tex, fbo, w, h };
    this.targets.set(name, t);
    return t;
  }

  private use(name: keyof FilmRenderer['programs'], to: Target | null, w = 0, h = 0): Program {
    const gl = this.gl;
    const p = this.programs[name];
    gl.useProgram(p.prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, to ? to.fbo : null);
    gl.viewport(0, 0, to ? to.w : w, to ? to.h : h);
    gl.uniform1i(p.loc.get('uEncoded')!, this.floatTargets ? 0 : 1);
    return p;
  }

  private bindTex(unit: number, tex: WebGLTexture, p: Program, name: string) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(p.loc.get(name)!, unit);
  }

  private draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  private compile(frag: string): Program {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link error');
    const loc = new Map<string, WebGLUniformLocation | null>();
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i)!;
      const base = info.name.replace(/\[0\]$/, '');
      loc.set(base, gl.getUniformLocation(prog, info.name));
    }
    // Uniforms the compiler optimized away are missing; WebGL ignores a null location.
    return { prog, loc };
  }
}

/** Temperature/tint to luminance-normalized linear gains. */
export function whiteBalance(temperature: number, tint: number): [number, number, number] {
  const r = Math.exp(0.22 * temperature);
  const b = Math.exp(-0.22 * temperature);
  const g = Math.exp(-0.12 * tint);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / lum, g / lum, b / lum];
}

function toneVec(hueDeg: number, amount: number): [number, number, number] {
  const a = (hueDeg * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a), amount];
}
