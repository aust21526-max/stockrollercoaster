/** A short mechanical shutter: two filtered noise clicks (open, close). No audio files. */
let ctx: AudioContext | null = null;

export function shutterSound() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const click = (at: number, freq: number, gain: number) => {
      const len = Math.floor(ctx!.sampleRate * 0.03);
      const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      const src = ctx!.createBufferSource();
      src.buffer = buf;
      const f = ctx!.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = 1.2;
      const g = ctx!.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(ctx!.destination);
      src.start(at);
    };
    click(now, 2600, 0.9);
    click(now + 0.075, 1700, 0.7);
  } catch {
    /* audio not available */
  }
}

export function haptic(ms = 12) {
  navigator.vibrate?.(ms);
}
