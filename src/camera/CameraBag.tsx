import { useEffect, useRef, useState } from 'react';
import { analyzeScene, labCorrection } from '../engine/analyze';
import { FilmRenderer } from '../engine/pipeline';
import { PROFILES, profileById } from '../engine/profiles';
import { SITUATION_LABELS, type Situation } from '../engine/types';
import { CameraBody } from './CameraBody';

/**
 * The camera bag: pick tonight's camera like picking one up, not like
 * picking a filter. Every camera previews the scene you are pointing at.
 */
export function CameraBag({
  current,
  snapshot,
  recommended,
  onSelect,
  onClose,
}: {
  current: string;
  /** A small frame of the current scene, or null when the camera is off. */
  snapshot: HTMLCanvasElement | null;
  recommended: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [focus, setFocus] = useState(current);
  const stripRef = useRef<HTMLDivElement>(null);
  const focusIndex = PROFILES.findIndex((p) => p.id === focus);

  /** Center a camera in the strip; the scroll handler then focuses it. */
  const scrollTo = (i: number, smooth = true) => {
    const el = stripRef.current?.children[i] as HTMLElement | undefined;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: smooth && !reduce ? 'smooth' : 'auto' });
  };
  // Start with the camera in hand centered.
  useEffect(() => scrollTo(PROFILES.findIndex((p) => p.id === current), false), []);

  /** Whichever camera sits in the middle of the strip is the one previewed. */
  const onStripScroll = () => {
    const strip = stripRef.current;
    if (!strip) return;
    const mid = strip.scrollLeft + strip.clientWidth / 2;
    let best = 0;
    let dist = Infinity;
    Array.from(strip.children).forEach((c, i) => {
      const el = c as HTMLElement;
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    const id = PROFILES[best].id;
    if (id !== focus) {
      setFocus(id);
      navigator.vibrate?.(4);
    }
  };

  // Swipe the photo itself to step through cameras.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onHeroDown = (e: React.PointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY });
  const onHeroUp = (e: React.PointerEvent) => {
    const s0 = swipe.current;
    swipe.current = null;
    if (!s0) return;
    const dx = e.clientX - s0.x;
    const dy = e.clientY - s0.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const next = Math.min(PROFILES.length - 1, Math.max(0, focusIndex + (dx < 0 ? 1 : -1)));
    scrollTo(next);
  };

  const [previews, setPreviews] = useState<Record<string, string>>({});
  const profile = profileById(focus);

  useEffect(() => {
    if (!snapshot) return;
    let cancelled = false;
    const c = document.createElement('canvas');
    let r: FilmRenderer;
    try {
      r = new FilmRenderer(c);
    } catch {
      return;
    }
    const stats = analyzeScene(snapshot, snapshot.width, snapshot.height);
    r.setSource(snapshot, snapshot.width, snapshot.height);
    // Current camera first so the hero appears immediately.
    const order = [current, ...PROFILES.map((p) => p.id).filter((id) => id !== current)];
    (async () => {
      for (const id of order) {
        if (cancelled) break;
        const p = profileById(id);
        r.render(p.look, { labCorrection: true, strength: 1, seed: 5 }, labCorrection(stats, p.labWhiteBalance), snapshot.width, snapshot.height);
        const url = c.toDataURL('image/jpeg', 0.86);
        setPreviews((prev) => ({ ...prev, [id]: url }));
        await new Promise((res) => setTimeout(res, 0));
      }
      r.dispose();
      (r.gl.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext();
    })();
    return () => {
      cancelled = true;
    };
  }, [snapshot, current]);

  const best = (Object.entries(profile.situations) as [Situation, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([s]) => SITUATION_LABELS[s]);

  return (
    <div className="bag" role="dialog" aria-label="카메라 고르기">
      <section className="bag-hero" onPointerDown={onHeroDown} onPointerUp={onHeroUp} onPointerCancel={() => (swipe.current = null)}>
        {previews[focus] ? <img key={focus} className="bag-photo" src={previews[focus]} alt={`${profile.name}로 본 지금 장면`} draggable={false} /> : <div className="bag-photo is-empty" />}
        <div className="bag-hero-shade" />
        <button className="bag-close" onClick={onClose}>닫기</button>
        <span className="bag-count">{focusIndex + 1}/{PROFILES.length}</span>
        <div className="bag-hero-text">
          <p className="bag-film">
            <span>{profile.film} 느낌</span>
            <span>ISO {profile.iso}</span>
          </p>
          <h2>{profile.name}</h2>
          <p className="bag-tagline">{profile.tagline}</p>
        </div>
      </section>

      <section className="bag-panel">
        <div className="bag-strip" ref={stripRef} onScroll={onStripScroll} aria-label="가방 속 카메라">
          {PROFILES.map((p, i) => (
            <button key={p.id} className={`slot ${p.id === focus ? 'is-focus' : ''}`} aria-pressed={p.id === focus} aria-label={p.name} onClick={() => scrollTo(i)}>
              <CameraBody profileId={p.id} className="slot-body" />
              <span className="slot-meta">{p.id === current ? '들고 있음' : recommended.includes(p.id) ? '추천' : ''}</span>
            </button>
          ))}
        </div>
        <div className="bag-detail">
          <p>
            <span className="bag-label">잘 어울려요</span>
            {best.join(', ')}
          </p>
          <p>
            <span className="bag-label">피해 주세요</span>
            {profile.avoid}
          </p>
        </div>
        <button
          className="bag-pick"
          onClick={() => {
            onSelect(focus);
            onClose();
          }}
        >
          {focus === current ? '이 카메라로 계속 찍기' : `${profile.name} 들기`}
        </button>
      </section>
    </div>
  );
}
