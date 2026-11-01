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
  const rootRef = useRef<HTMLDivElement>(null);
  const pick = (id: string) => {
    setFocus(id);
    // Bring the preview back into view so the change is seen.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rootRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
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
    <div className="bag" role="dialog" aria-label="카메라 고르기" ref={rootRef}>
      <section className="bag-hero">
        {previews[focus] ? <img key={focus} className="bag-photo" src={previews[focus]} alt={`${profile.name}로 본 지금 장면`} /> : <div className="bag-photo is-empty" />}
        <div className="bag-hero-shade" />
        <button className="bag-close" onClick={onClose}>닫기</button>
        <div className="bag-hero-text">
          <p className="bag-film">
            <span>{profile.film} 느낌</span>
            <span>ISO {profile.iso}</span>
          </p>
          <h2>{profile.name}</h2>
          <p className="bag-tagline">{profile.tagline}</p>
        </div>
        <CameraBody profileId={focus} className="bag-hero-body" />
      </section>

      <section className="bag-detail">
        <p>
          <span className="bag-label">잘 어울려요</span>
          {best.join(', ')}
        </p>
        <p>
          <span className="bag-label">피해 주세요</span>
          {profile.avoid}
        </p>
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

      <section className="bag-slots" aria-label="가방 속 카메라">
        {PROFILES.map((p) => (
          <button key={p.id} className={`slot ${p.id === focus ? 'is-focus' : ''}`} aria-pressed={p.id === focus} onClick={() => pick(p.id)}>
            <CameraBody profileId={p.id} className="slot-body" />
            <span className="slot-name">{p.name}</span>
            <span className="slot-meta">
              {p.id === current ? '지금 들고 있음' : recommended.includes(p.id) ? '지금 장면에 추천' : `ISO ${p.iso}`}
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
