/**
 * Synthetic test chart: tone ramp, hue sweep, skin patches, sky gradient and
 * point lights on black (to judge halation). Lets the darkroom work without photos.
 */
export function makeTestChart(w = 1500, h = 1000): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;

  // Sky gradient, top third.
  const sky = g.createLinearGradient(0, 0, 0, h * 0.34);
  sky.addColorStop(0, '#3f78c4');
  sky.addColorStop(1, '#bcd6ee');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h * 0.34);

  // Foliage band.
  const leaf = g.createLinearGradient(0, 0, w, 0);
  ['#1f3d1c', '#3f6b2a', '#6e9a3a', '#a9c25a', '#4f7f5e'].forEach((col, i, a) => leaf.addColorStop(i / (a.length - 1), col));
  g.fillStyle = leaf;
  g.fillRect(0, h * 0.34, w, h * 0.1);

  // Grey ramp.
  const ramp = g.createLinearGradient(0, 0, w, 0);
  ramp.addColorStop(0, '#000');
  ramp.addColorStop(1, '#fff');
  g.fillStyle = ramp;
  g.fillRect(0, h * 0.44, w, h * 0.1);

  // Hue sweep, full and half saturation.
  for (let x = 0; x < w; x++) {
    const hue = (x / w) * 360;
    g.fillStyle = `hsl(${hue} 85% 50%)`;
    g.fillRect(x, h * 0.54, 1, h * 0.07);
    g.fillStyle = `hsl(${hue} 45% 65%)`;
    g.fillRect(x, h * 0.61, 1, h * 0.07);
  }

  // Skin tones, light to deep.
  const skins = ['#f6dccb', '#efc6a8', '#e0ac88', '#c98e6a', '#a86f4c', '#7d4f35', '#5a3726'];
  const sw = w * 0.6 / skins.length;
  skins.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(i * sw, h * 0.68, sw, h * 0.32);
  });

  // Night panel with point lights.
  g.fillStyle = '#05060a';
  g.fillRect(w * 0.6, h * 0.68, w * 0.4, h * 0.32);
  const lights = ['#fff6e0', '#ffd27a', '#ff6a3d', '#7fd3ff', '#ffffff', '#ff4fa3'];
  lights.forEach((col, i) => {
    const x = w * 0.64 + (i % 3) * w * 0.12;
    const y = h * 0.75 + Math.floor(i / 3) * h * 0.13;
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, 8 + (i % 2) * 6, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = '#f2f2f2';
  g.fillRect(w * 0.93, h * 0.72, w * 0.012, h * 0.24);
  return c;
}
