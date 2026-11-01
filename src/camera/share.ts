/**
 * Things made to be shared: a roll's contact sheet as one image, and a short
 * slideshow film of the roll. Plus the bits of MediaRecorder plumbing that the
 * camera's video mode shares with the slideshow.
 */

/** Best recordable type: MP4 where supported (iPhone, recent Chrome), WebM otherwise. */
export function pickVideoType(): string {
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const t of types) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t;
  return '';
}

export const extFor = (type: string) => (type.includes('mp4') ? 'mp4' : type.includes('webm') ? 'webm' : 'jpg');

/** Share files through the system sheet; fall back to downloads. */
export async function shareFiles(files: File[]) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  for (const file of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    await new Promise((res) => setTimeout(res, 250));
  }
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function cover(g: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k;
  const sh = h / k;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function sprockets(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.fillStyle = '#eae5da';
  const hw = h * 0.36;
  const hh = h * 0.5;
  for (let px = x + hw; px < x + w - hw; px += hw * 2.3) {
    g.beginPath();
    g.roundRect(px, y + (h - hh) / 2, hw, hh, hw * 0.25);
    g.fill();
  }
}

export interface SheetFrame {
  blob: Blob;
  frame?: number;
}

/**
 * A contact sheet: strips of six frames on photo paper, sprocket holes and
 * frame numbers, with the roll name written in the top margin.
 */
export async function contactSheetImage(frames: SheetFrame[], title: string, subtitle: string): Promise<Blob> {
  const perRow = 4;
  const cellW = 520;
  const cellH = 780;
  const gap = 14;
  const band = 64;
  const margin = 90;
  const rows = Math.ceil(frames.length / perRow);
  const stripH = band * 2 + cellH;
  const W = margin * 2 + perRow * cellW + (perRow - 1) * gap + 40;
  const H = margin * 2 + 150 + rows * stripH + (rows - 1) * 46;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f3f0e8';
  g.fillRect(0, 0, W, H);

  // Grease-pencil title.
  g.fillStyle = '#2d2620';
  g.font = `64px 'Gowun Batang', serif`;
  g.textBaseline = 'alphabetic';
  g.fillText(title, margin, margin + 70);
  g.fillStyle = '#7a6f62';
  g.font = `32px 'Pretendard Variable', Pretendard, system-ui, sans-serif`;
  g.fillText(subtitle, margin, margin + 122);

  for (let r = 0; r < rows; r++) {
    const y = margin + 150 + r * (stripH + 46);
    g.fillStyle = '#14100c';
    g.fillRect(margin, y, W - margin * 2, stripH);
    sprockets(g, margin, y, W - margin * 2, band);
    sprockets(g, margin, y + band + cellH, W - margin * 2, band);
    for (let i = 0; i < perRow; i++) {
      const f = frames[r * perRow + i];
      if (!f) continue;
      const x = margin + 20 + i * (cellW + gap);
      const bmp = await loadBitmap(f.blob);
      cover(g, bmp, x, y + band, cellW, cellH);
      bmp.close();
      g.fillStyle = '#e8923c';
      g.font = `700 26px system-ui, sans-serif`;
      g.fillText(`▸${f.frame ?? r * perRow + i + 1}`, x + 6, y + band + cellH + 40);
    }
  }
  g.fillStyle = '#9a8f80';
  g.font = `26px system-ui, sans-serif`;
  g.textAlign = 'right';
  g.fillText('ourfilm', W - margin, H - margin / 2);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('이미지를 만들지 못했습니다.'))), 'image/jpeg', 0.9));
}

/**
 * A 9:16 slideshow film of a roll: a title card, each frame advancing like
 * film through a gate (with a little weave, flicker and grain), and an end
 * card. Recorded in real time from a canvas.
 */
export async function rollFilm(frames: Blob[], title: string, subtitle: string, onProgress: (p: number) => void): Promise<Blob> {
  const type = pickVideoType();
  if (!type) throw new Error('이 브라우저에서는 영상을 만들 수 없습니다.');
  const W = 1080;
  const H = 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const bmps = await Promise.all(frames.slice(0, 24).map(loadBitmap));

  // Pre-render a few grain tiles to flicker between.
  const grain = Array.from({ length: 4 }, () => {
    const t = document.createElement('canvas');
    t.width = t.height = 256;
    const tg = t.getContext('2d')!;
    const d = tg.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 18;
    }
    tg.putImageData(d, 0, 0);
    return t;
  });

  const TITLE = 1.8;
  const PER = 1.15;
  const ADV = 0.22; // film advance between frames
  const END = 1.6;
  const total = TITLE + bmps.length * PER + END;

  const stream = c.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((res) => (rec.onstop = () => res(new Blob(chunks, { type: type.split(';')[0] }))));

  const card = (big: string, small: string, alpha: number) => {
    g.fillStyle = '#0d0b09';
    g.fillRect(0, 0, W, H);
    g.globalAlpha = alpha;
    g.fillStyle = '#f1ebe0';
    g.textAlign = 'center';
    g.font = `84px 'Gowun Batang', serif`;
    g.fillText(big, W / 2, H / 2);
    g.fillStyle = '#a89b88';
    g.font = `36px system-ui, sans-serif`;
    g.fillText(small, W / 2, H / 2 + 80);
    g.globalAlpha = 1;
  };

  const drawAt = (t: number) => {
    if (t < TITLE) {
      card(title, subtitle, Math.min(1, t / 0.5, (TITLE - t) / 0.4));
    } else if (t < TITLE + bmps.length * PER) {
      const k = t - TITLE;
      const i = Math.floor(k / PER);
      const local = k - i * PER;
      g.fillStyle = '#0d0b09';
      g.fillRect(0, 0, W, H);
      // Frame area: a 2:3 print with a black rebate, centered.
      const fw = W * 0.86;
      const fh = fw * 1.5;
      const fx = (W - fw) / 2;
      let fy = (H - fh) / 2;
      // Advance: the next frame pulls in from below during the first ADV seconds.
      const adv = local < ADV ? 1 - local / ADV : 0;
      const eased = adv * adv;
      fy += eased * H * 0.9;
      const weaveX = Math.sin(t * 23) * 2;
      const weaveY = Math.cos(t * 17) * 2;
      g.fillStyle = '#16120e';
      g.fillRect(fx - 18 + weaveX, fy - 70 + weaveY, fw + 36, fh + 140);
      sprockets(g, fx - 18 + weaveX, fy - 70 + weaveY, fw + 36, 54);
      sprockets(g, fx - 18 + weaveX, fy + fh + 16 + weaveY, fw + 36, 54);
      cover(g, bmps[i], fx + weaveX, fy + weaveY, fw, fh);
      if (i > 0 && adv > 0) {
        // The previous frame leaving at the top.
        cover(g, bmps[i - 1], fx + weaveX, fy - H * 0.9 + weaveY, fw, fh);
      }
      g.fillStyle = '#e8923c';
      g.font = `700 30px system-ui, sans-serif`;
      g.textAlign = 'left';
      g.fillText(`▸${i + 1}`, fx + weaveX, fy + fh + 54 + weaveY);
      // Projector flicker.
      const flick = 0.04 + 0.04 * Math.sin(t * 61) * Math.sin(t * 7);
      g.fillStyle = `rgba(0,0,0,${Math.max(0, flick)})`;
      g.fillRect(0, 0, W, H);
    } else {
      const k = t - TITLE - bmps.length * PER;
      card('ourfilm', `${title}, ${bmps.length}장`, Math.min(1, k / 0.4, (END - k) / 0.4));
    }
    // Grain over everything.
    const tile = grain[Math.floor(t * 24) % grain.length];
    for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) g.drawImage(tile, x, y);
  };

  drawAt(0);
  rec.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (t >= total) {
        resolve();
        return;
      }
      drawAt(t);
      onProgress(t / total);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  bmps.forEach((b) => b.close());
  return done;
}
