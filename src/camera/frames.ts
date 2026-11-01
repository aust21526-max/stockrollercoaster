/**
 * Print frames drawn around a developed photo.
 *
 *  print    a lab print's thin white border
 *  instant  an instant-film card: narrow sides, deep bottom with a caption
 *  edge     the whole negative strip: black rebate, sprocket holes and
 *           edge printing (frame number, film name) in orange
 */
export type FrameStyle = 'none' | 'print' | 'instant' | 'edge';

export const FRAME_LABELS: Record<FrameStyle, string> = {
  none: '없음',
  print: '흰 테두리',
  instant: '인스턴트',
  edge: '필름 테두리',
};

export interface FrameInfo {
  style: FrameStyle;
  caption?: string;
  frameNo?: number;
  filmName?: string;
}

const PAPER = '#f3f0e8';

export function drawFrame(photo: HTMLCanvasElement, info: FrameInfo): HTMLCanvasElement {
  if (info.style === 'none') return photo;
  const w = photo.width;
  const h = photo.height;
  const short = Math.min(w, h);
  const out = document.createElement('canvas');
  const g = () => out.getContext('2d')!;

  if (info.style === 'print') {
    const b = Math.round(short * 0.035);
    out.width = w + b * 2;
    out.height = h + b * 2;
    const c = g();
    c.fillStyle = PAPER;
    c.fillRect(0, 0, out.width, out.height);
    c.drawImage(photo, b, b);
    return out;
  }

  if (info.style === 'instant') {
    const side = Math.round(short * 0.06);
    const top = side;
    const bottom = Math.round(short * 0.24);
    out.width = w + side * 2;
    out.height = h + top + bottom;
    const c = g();
    // Card with a faint paper tooth.
    c.fillStyle = PAPER;
    c.fillRect(0, 0, out.width, out.height);
    const tooth = c.createLinearGradient(0, 0, 0, out.height);
    tooth.addColorStop(0, 'rgba(255,255,255,.35)');
    tooth.addColorStop(1, 'rgba(120,100,70,.06)');
    c.fillStyle = tooth;
    c.fillRect(0, 0, out.width, out.height);
    c.drawImage(photo, side, top);
    // Inner shadow where the image sits under the card.
    c.strokeStyle = 'rgba(0,0,0,.12)';
    c.lineWidth = Math.max(1, short * 0.002);
    c.strokeRect(side, top, w, h);
    if (info.caption?.trim()) {
      const size = Math.round(bottom * 0.2);
      c.fillStyle = '#3a3229';
      c.font = `${size}px 'Gowun Batang', 'Nanum Myeongjo', serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(info.caption.trim(), out.width / 2, top + h + bottom * 0.52, out.width - side * 4);
    }
    return out;
  }

  // Negative-strip edge.
  const band = Math.round(short * 0.11);
  const side = Math.round(short * 0.04);
  out.width = w + side * 2;
  out.height = h + band * 2;
  const c = g();
  c.fillStyle = '#16120e';
  c.fillRect(0, 0, out.width, out.height);
  // Base tint, like a scanned negative rebate.
  c.fillStyle = 'rgba(120,60,20,.18)';
  c.fillRect(0, 0, out.width, out.height);
  c.drawImage(photo, side, band);
  // Sprocket holes: rounded rectangles evenly along both edges.
  const holeW = band * 0.32;
  const holeH = band * 0.42;
  const pitch = holeW * 2.2;
  c.fillStyle = '#e9e4d8';
  for (let x = pitch * 0.4; x < out.width - holeW; x += pitch) {
    for (const y of [band * 0.14, out.height - band * 0.14 - holeH]) {
      roundRect(c, x, y, holeW, holeH, holeW * 0.25);
      c.fill();
    }
  }
  // Edge print.
  const size = Math.round(band * 0.2);
  c.fillStyle = '#e8923c';
  c.font = `700 ${size}px ui-sans-serif, system-ui, sans-serif`;
  c.textBaseline = 'middle';
  const no = info.frameNo ?? 1;
  const yText = band * 0.78;
  c.fillText(`▸ ${no}`, side + size, yText);
  c.fillText(`${no}A`, out.width / 2, yText);
  c.textAlign = 'right';
  c.fillText((info.filmName ?? 'OURFILM').toUpperCase(), out.width - side - size, yText);
  c.textAlign = 'left';
  c.fillText(`${no + 1}`, side + size, out.height - band * 0.78);
  return out;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
