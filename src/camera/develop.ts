import { analyzeScene, labCorrection } from '../engine/analyze';
import { FilmRenderer } from '../engine/pipeline';
import { cropFor, type FilmProfile } from '../engine/types';

/** Long-side cap for developed photos. Keeps iPhone memory in check. */
const MAX_OUTPUT = 4096;

let renderer: FilmRenderer | null = null;
let canvas: HTMLCanvasElement | null = null;

export interface DevelopRequest {
  source: TexImageSource & CanvasImageSource;
  width: number;
  height: number;
  profile: FilmProfile;
  aspect: number;
  /** Digital zoom (1 when the camera zoomed optically). */
  zoom: number;
  /**
   * Aspect (w/h) of the preview stream the user framed with. A still whose
   * aspect differs (e.g. a 16:9 still from a 4:3 preview) is first centered to
   * this aspect, so the photo matches the viewfinder.
   */
  frameAspect?: number;
  ev: number;
  flash?: number;
  labCorrection: boolean;
  /** 0..1 film strength (blend with the original). */
  strength?: number;
  /** Burned in after developing, or null. */
  stamp: ((g: CanvasRenderingContext2D, w: number, h: number) => void) | null;
}

export async function develop(req: DevelopRequest): Promise<{ blob: Blob; width: number; height: number }> {
  if (!canvas) canvas = document.createElement('canvas');
  if (!renderer) renderer = new FilmRenderer(canvas);
  const r = renderer;

  // Match the preview's frame first, then crop for the ratio and lens.
  const frame = req.frameAspect ? cropFor(req.width, req.height, req.frameAspect) : { rect: [0, 0, 1, 1], width: req.width, height: req.height };
  const inner = cropFor(frame.width, frame.height, req.aspect, req.zoom);
  const [fx, fy, fw, fh] = frame.rect;
  const [ix, iy, iw, ih] = inner.rect;
  const crop = { rect: [fx + ix * fw, fy + iy * fh, iw * fw, ih * fh] as [number, number, number, number], width: inner.width, height: inner.height };
  const [w, h] = r.fit(crop.width, crop.height, Math.min(MAX_OUTPUT, r.maxSize));
  r.setSource(req.source, req.width, req.height, w < crop.width * 0.6);
  const stats = analyzeScene(req.source, req.width, req.height);
  r.render(
    req.profile.look,
    {
      labCorrection: req.labCorrection,
      strength: req.strength ?? 1,
      seed: Math.floor(Math.random() * 1000),
      crop: crop.rect,
      ev: req.ev,
      flash: req.flash,
    },
    labCorrection(stats, req.profile.labWhiteBalance),
    w,
    h,
  );

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const g = out.getContext('2d')!;
  g.drawImage(canvas, 0, 0);
  r.trim();
  req.stamp?.(g, w, h);

  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('사진을 저장하지 못했습니다.'))), 'image/jpeg', 0.92),
  );
  out.width = out.height = 0;
  return { blob, width: w, height: h };
}

/** Decode a photo file/blob upright (EXIF orientation applied). */
export async function decodeBlob(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' });
}

/** Grab the current video frame at full stream resolution. */
export async function grabFrame(video: HTMLVideoElement): Promise<{ canvas: HTMLCanvasElement; blob: Blob }> {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext('2d')!.drawImage(video, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('프레임을 저장하지 못했습니다.'))), 'image/jpeg', 0.95),
  );
  return { canvas: c, blob };
}
