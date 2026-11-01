/**
 * Date stamp burned into the photo, like a compact film camera's data back:
 * orange seven-segment digits with a soft glow, bottom right.
 * Drawn with paths so it needs no font file.
 */

// Segments a..g, standard layout.
const DIGITS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcfgd',
  '+': '', '-': 'g', D: 'bcdeg',
};

function segment(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, seg: string) {
  const s = t * 0.55; // slant
  const pts: Record<string, [number, number, number, number]> = {
    a: [x + t, y, x + w - t, y],
    b: [x + w, y + t, x + w, y + h / 2 - t / 2],
    c: [x + w, y + h / 2 + t / 2, x + w, y + h - t],
    d: [x + t, y + h, x + w - t, y + h],
    e: [x, y + h / 2 + t / 2, x, y + h - t],
    f: [x, y + t, x, y + h / 2 - t / 2],
    g: [x + t, y + h / 2, x + w - t, y + h / 2],
  };
  const [x1, y1, x2, y2] = pts[seg];
  const slant = (yy: number) => (y + h - yy) * (s / h) * 2;
  g.beginPath();
  g.moveTo(x1 + slant(y1), y1);
  g.lineTo(x2 + slant(y2), y2);
  g.stroke();
}

function glyph(g: CanvasRenderingContext2D, ch: string, x: number, y: number, w: number, h: number, t: number) {
  if (ch === "'") {
    g.beginPath();
    g.moveTo(x + w * 0.35 + t, y);
    g.lineTo(x + w * 0.2, y + h * 0.28);
    g.stroke();
    return w * 0.5;
  }
  if (ch === ' ') return w * 0.6;
  if (ch === '+') {
    segment(g, x, y, w, h, t, 'g');
    g.beginPath();
    g.moveTo(x + w / 2 + t * 0.4, y + h * 0.28);
    g.lineTo(x + w / 2 - t * 0.2, y + h * 0.72);
    g.stroke();
    return w + t * 2.5;
  }
  for (const seg of DIGITS[ch] ?? '') segment(g, x, y, w, h, t, seg);
  return w + t * 2.5;
}

export function stampText(mode: 'date' | 'dday', date: Date, dday: number | null): string | null {
  if (mode === 'dday') return dday === null ? null : `D+${dday}`;
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  const m = String(date.getMonth() + 1);
  const d = String(date.getDate());
  return `'${yy} ${m} ${d}`;
}

export function drawStamp(g: CanvasRenderingContext2D, text: string, width: number, height: number) {
  const short = Math.min(width, height);
  const h = short * 0.034;
  const w = h * 0.52;
  const t = h * 0.12;
  // Measure.
  let total = 0;
  const dry = { beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} } as unknown as CanvasRenderingContext2D;
  for (const ch of text) total += glyph(dry, ch, 0, 0, w, h, t);
  let x = width - short * 0.06 - total;
  const y = height - short * 0.06 - h;

  g.save();
  g.lineCap = 'round';
  g.lineWidth = t;
  g.globalCompositeOperation = 'lighter';
  // Glow, then core.
  g.strokeStyle = 'rgba(255, 110, 20, 0.55)';
  g.shadowColor = 'rgba(255, 90, 10, 0.9)';
  g.shadowBlur = h * 0.45;
  let cx = x;
  for (const ch of text) cx += glyph(g, ch, cx, y, w, h, t);
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255, 138, 40, 0.95)';
  g.lineWidth = t * 0.75;
  for (const ch of text) x += glyph(g, ch, x, y, w, h, t);
  g.restore();
}
