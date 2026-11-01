import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeScene, labCorrection, type SceneStats } from '../engine/analyze';
import { makeCurve } from '../engine/curves';
import { FilmRenderer } from '../engine/pipeline';
import { PROFILES, profileById } from '../engine/profiles';
import { detectSituations, rankProfiles } from '../engine/recommend';
import { SITUATION_LABELS, type LookParams } from '../engine/types';
import { makeTestChart } from './testChart';
import './lab.css';

type Photo = {
  id: string;
  name: string;
  source: HTMLImageElement | HTMLCanvasElement;
  url: string;
  width: number;
  height: number;
  stats: SceneStats;
};

type Slider = { label: string; get: (l: LookParams) => number; set: (l: LookParams, v: number) => LookParams; min: number; max: number; step: number };

const SLIDERS: { group: string; items: Slider[] }[] = [
  {
    group: '노출과 색온도',
    items: [
      { label: '노출 (스톱)', get: (l) => l.exposure, set: (l, v) => ({ ...l, exposure: v }), min: -1.5, max: 1.5, step: 0.05 },
      { label: '색온도', get: (l) => l.temperature, set: (l, v) => ({ ...l, temperature: v }), min: -1, max: 1, step: 0.01 },
      { label: '틴트', get: (l) => l.tint, set: (l, v) => ({ ...l, tint: v }), min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    group: '색',
    items: [
      { label: '채도', get: (l) => l.saturation, set: (l, v) => ({ ...l, saturation: v }), min: 0, max: 1.6, step: 0.01 },
      { label: '그림자 채도 감소', get: (l) => l.shadowDesat, set: (l, v) => ({ ...l, shadowDesat: v }), min: 0, max: 1, step: 0.01 },
      { label: '하이라이트 채도 감소', get: (l) => l.highlightDesat, set: (l, v) => ({ ...l, highlightDesat: v }), min: 0, max: 1, step: 0.01 },
      { label: '그림자 색 양', get: (l) => l.shadows.amount, set: (l, v) => ({ ...l, shadows: { ...l.shadows, amount: v } }), min: 0, max: 0.04, step: 0.001 },
      { label: '그림자 색상(°)', get: (l) => l.shadows.hue, set: (l, v) => ({ ...l, shadows: { ...l.shadows, hue: v } }), min: 0, max: 360, step: 1 },
      { label: '하이라이트 색 양', get: (l) => l.highlights.amount, set: (l, v) => ({ ...l, highlights: { ...l.highlights, amount: v } }), min: 0, max: 0.04, step: 0.001 },
      { label: '하이라이트 색상(°)', get: (l) => l.highlights.hue, set: (l, v) => ({ ...l, highlights: { ...l.highlights, hue: v } }), min: 0, max: 360, step: 1 },
    ],
  },
  {
    group: '빛 번짐',
    items: [
      { label: '할레이션', get: (l) => l.halation.amount, set: (l, v) => ({ ...l, halation: { ...l.halation, amount: v } }), min: 0, max: 1, step: 0.01 },
      { label: '할레이션 시작 밝기', get: (l) => l.halation.threshold, set: (l, v) => ({ ...l, halation: { ...l.halation, threshold: v } }), min: 0.2, max: 1.5, step: 0.01 },
      { label: '번짐 반경', get: (l) => l.halation.radius, set: (l, v) => ({ ...l, halation: { ...l.halation, radius: v } }), min: 0.002, max: 0.05, step: 0.001 },
      { label: '블룸', get: (l) => l.bloom.amount, set: (l, v) => ({ ...l, bloom: { amount: v } }), min: 0, max: 0.3, step: 0.005 },
    ],
  },
  {
    group: '렌즈',
    items: [
      { label: '폰 샤프닝 되돌리기', get: (l) => l.soften, set: (l, v) => ({ ...l, soften: v }), min: 0, max: 1, step: 0.01 },
      { label: '주변부 흐림', get: (l) => l.lens.cornerSoftness, set: (l, v) => ({ ...l, lens: { ...l.lens, cornerSoftness: v } }), min: 0, max: 1, step: 0.01 },
      { label: '색수차', get: (l) => l.lens.aberration, set: (l, v) => ({ ...l, lens: { ...l.lens, aberration: v } }), min: 0, max: 0.004, step: 0.0001 },
      { label: '비네팅', get: (l) => l.vignette.amount, set: (l, v) => ({ ...l, vignette: { ...l.vignette, amount: v } }), min: 0, max: 1, step: 0.01 },
      { label: '비네팅 크기', get: (l) => l.vignette.size, set: (l, v) => ({ ...l, vignette: { ...l.vignette, size: v } }), min: 0.4, max: 2, step: 0.01 },
      { label: '플래시', get: (l) => l.flash, set: (l, v) => ({ ...l, flash: v }), min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    group: '그레인',
    items: [
      { label: '양', get: (l) => l.grain.amount, set: (l, v) => ({ ...l, grain: { ...l.grain, amount: v } }), min: 0, max: 1.2, step: 0.01 },
      { label: '입자 크기', get: (l) => l.grain.size, set: (l, v) => ({ ...l, grain: { ...l.grain, size: v } }), min: 0.3, max: 3, step: 0.05 },
      { label: '컬러 그레인', get: (l) => l.grain.color, set: (l, v) => ({ ...l, grain: { ...l.grain, color: v } }), min: 0, max: 1, step: 0.01 },
    ],
  },
];

const STORAGE_KEY = 'darkroom.overrides.v1';

function loadOverrides(): Record<string, LookParams> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveOverrides(o: Record<string, LookParams>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
  } catch {
    /* storage unavailable: edits live for this session only */
  }
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  return img;
}

function chartPhoto(): Photo {
  const c = makeTestChart();
  return { id: 'chart', name: '테스트 차트', source: c, url: c.toDataURL('image/png'), width: c.width, height: c.height, stats: analyzeScene(c, c.width, c.height) };
}

export default function Lab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<FilmRenderer | null>(null);
  const loadedRef = useRef<string>('');
  const [error, setError] = useState('');

  const [photos, setPhotos] = useState<Photo[]>(() => [chartPhoto()]);
  const [photoId, setPhotoId] = useState('chart');
  const [profileId, setProfileId] = useState(PROFILES[0].id);
  const [overrides, setOverrides] = useState<Record<string, LookParams>>(loadOverrides);
  const [labOn, setLabOn] = useState(true);
  const [strength, setStrength] = useState(1);
  const [split, setSplit] = useState(1);
  const [seed, setSeed] = useState(1);
  const [json, setJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [sheet, setSheet] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const photo = photos.find((p) => p.id === photoId) ?? photos[0];
  const profile = profileById(profileId);
  const look = overrides[profileId] ?? profile.look;
  const edited = !!overrides[profileId];

  const correction = useMemo(() => labCorrection(photo.stats, profile.labWhiteBalance), [photo, profile]);
  const situations = useMemo(() => detectSituations(photo.stats), [photo]);
  const ranked = useMemo(() => rankProfiles(situations).slice(0, 3), [situations]);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      rendererRef.current = new FilmRenderer(canvasRef.current);
    } catch (e) {
      setError((e as Error).message);
    }
    return () => rendererRef.current?.dispose();
  }, []);

  useEffect(() => saveOverrides(overrides), [overrides]);
  useEffect(() => setJson(JSON.stringify(look, null, 2)), [profileId, edited]);

  const render = useCallback(() => {
    const r = rendererRef.current;
    const viewer = viewerRef.current;
    if (!r || !viewer) return;
    if (loadedRef.current !== photo.id) {
      r.setSource(photo.source, photo.width, photo.height);
      loadedRef.current = photo.id;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = viewer.getBoundingClientRect();
    const scale = Math.min(box.width / photo.width, box.height / photo.height);
    const w = Math.min(photo.width, Math.round(photo.width * scale * dpr));
    const h = Math.min(photo.height, Math.round(photo.height * scale * dpr));
    try {
      r.render(look, { labCorrection: labOn, strength, seed }, correction, w, h);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [photo, look, labOn, strength, seed, correction]);

  useEffect(() => {
    const id = requestAnimationFrame(render);
    return () => cancelAnimationFrame(id);
  }, [render]);

  useEffect(() => {
    const onResize = () => requestAnimationFrame(render);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [render]);

  // Contact sheet: every camera on the current photo.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const c = document.createElement('canvas');
      let r: FilmRenderer;
      try {
        r = new FilmRenderer(c);
      } catch {
        return;
      }
      const [w, h] = r.fit(photo.width, photo.height, 420);
      r.setSource(photo.source, photo.width, photo.height);
      const out: Record<string, string> = {};
      for (const p of PROFILES) {
        if (cancelled) break;
        const l = overrides[p.id] ?? p.look;
        r.render(l, { labCorrection: labOn, strength: 1, seed: 3 }, labCorrection(photo.stats, p.labWhiteBalance), w, h);
        out[p.id] = c.toDataURL('image/jpeg', 0.85);
        await new Promise((res) => setTimeout(res, 0));
      }
      r.dispose();
      (r.gl.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext();
      if (!cancelled) setSheet(out);
    };
    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [photo, overrides, labOn]);

  const setLook = (next: LookParams) => {
    setOverrides((o) => ({ ...o, [profileId]: next }));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('사진을 불러오는 중');
    const added: Photo[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const img = await loadImage(f);
        added.push({
          id: `${f.name}-${f.size}-${f.lastModified}`,
          name: f.name,
          source: img,
          url: img.src,
          width: img.naturalWidth,
          height: img.naturalHeight,
          stats: analyzeScene(img, img.naturalWidth, img.naturalHeight),
        });
      } catch {
        setError(`${f.name}을(를) 열 수 없습니다. JPEG 또는 PNG로 바꿔서 다시 올려 주세요.`);
      }
    }
    setBusy('');
    if (added.length) {
      setPhotos((p) => [...p.filter((x) => !added.some((a) => a.id === x.id)), ...added]);
      setPhotoId(added[0].id);
    }
  };

  const exportFull = async () => {
    const r = rendererRef.current;
    if (!r) return;
    setBusy('원본 해상도로 현상 중');
    await new Promise((res) => setTimeout(res, 30));
    r.render(look, { labCorrection: labOn, strength, seed }, correction, photo.width, photo.height);
    const blob = await new Promise<Blob | null>((res) => (r.canvas as HTMLCanvasElement).toBlob(res, 'image/jpeg', 0.93));
    setBusy('');
    render();
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${photo.name.replace(/\.[^.]+$/, '')}-${profile.id}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(json) as LookParams;
      setLook({ ...profile.look, ...parsed });
      setJsonError('');
    } catch (e) {
      setJsonError(`JSON 형식이 올바르지 않습니다: ${(e as Error).message}`);
    }
  };

  const onSplitPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const box = canvasRef.current!.getBoundingClientRect();
    setSplit(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)));
  };

  return (
    <div className="lab">
      <header className="lab-head">
        <h1>현상실</h1>
        <p>필름을 사진에 맞춰 보며 조정하는 곳. 바꾼 값은 이 브라우저에 저장됩니다.</p>
      </header>

      <aside className="lab-films" aria-label="필름 선택">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            className={`film ${p.id === profileId ? 'is-on' : ''}`}
            onClick={() => setProfileId(p.id)}
            aria-pressed={p.id === profileId}
          >
            <span className="film-thumb">{sheet[p.id] ? <img src={sheet[p.id]} alt="" /> : null}</span>
            <span className="film-text">
              <strong>{p.name}</strong>
              <small>ISO {p.iso} · {p.reference.split(' · ')[0]}</small>
              {overrides[p.id] ? <em>수정됨</em> : null}
            </span>
          </button>
        ))}
      </aside>

      <main className="lab-main">
        <div className="lab-photos">
          {photos.map((p) => (
            <button key={p.id} className={`photo ${p.id === photo.id ? 'is-on' : ''}`} onClick={() => setPhotoId(p.id)} title={p.name}>
              <img src={p.url} alt={p.name} />
            </button>
          ))}
          <label className="photo photo-add">
            사진 추가
            <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
          </label>
        </div>

        <div
          className="viewer"
          ref={viewerRef}
          onPointerDown={onSplitPointer}
          onPointerMove={onSplitPointer}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
          <div className="frame">
            <canvas ref={canvasRef} />
            {split < 1 && (
              <>
                <img className="original" src={photo.url} alt="" style={{ clipPath: `inset(0 ${(1 - split) * 100}% 0 0)` }} />
                <div className="split-line" style={{ left: `${split * 100}%` }} />
              </>
            )}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {busy && <p className="busy">{busy}…</p>}
        </div>

        <div className="lab-bar">
          <label className="check">
            <input type="checkbox" checked={labOn} onChange={(e) => setLabOn(e.target.checked)} />
            현상소 보정
          </label>
          <label className="range">
            원본 비교
            <input type="range" min={0} max={1} step={0.01} value={split} onChange={(e) => setSplit(+e.target.value)} />
          </label>
          <label className="range">
            필터 강도
            <input type="range" min={0} max={1} step={0.01} value={strength} onChange={(e) => setStrength(+e.target.value)} />
          </label>
          <button onClick={() => setSeed((s) => s + 1)}>그레인 다시 뿌리기</button>
          <button className="primary" onClick={exportFull}>원본 해상도로 저장</button>
        </div>

        <section className="lab-scene">
          <h2>이 사진의 장면</h2>
          <p>
            {situations.map((s) => SITUATION_LABELS[s]).join(', ')}
            <span className="dim"> — 밝기 {photo.stats.key.toFixed(3)}, 색온도 지표 {photo.stats.warmth.toFixed(2)}, 대비 {photo.stats.contrastStops.toFixed(1)}스톱</span>
          </p>
          <p>
            추천:{' '}
            {ranked.map((r, i) => (
              <button key={r.profile.id} className="link" onClick={() => setProfileId(r.profile.id)}>
                {r.profile.name}
                {i < ranked.length - 1 ? ',' : ''}
              </button>
            ))}
          </p>
          {labOn && (
            <p className="dim">
              현상소 보정: 노출 {correction.ev >= 0 ? '+' : ''}
              {correction.ev.toFixed(2)}스톱, 색 보정 R×{correction.gains[0].toFixed(2)} B×{correction.gains[2].toFixed(2)}
            </p>
          )}
        </section>
      </main>

      <aside className="lab-params" aria-label="필름 조정">
        <div className="film-info">
          <h2>{profile.name}</h2>
          <p>{profile.tagline}</p>
          <p className="dim">어울리는 상황: {Object.entries(profile.situations).sort((a, b) => b[1] - a[1]).map(([s]) => SITUATION_LABELS[s as keyof typeof SITUATION_LABELS]).join(', ')}</p>
          <p className="dim">피할 때: {profile.avoid}</p>
          <p className="dim">참고 필름: {profile.reference}</p>
        </div>

        <CurvePreview look={look} />

        {SLIDERS.map((g) => (
          <fieldset key={g.group}>
            <legend>{g.group}</legend>
            {g.items.map((s) => {
              const v = s.get(look);
              return (
                <label key={s.label} className="slider">
                  <span>{s.label}</span>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={v} onChange={(e) => setLook(s.set(look, +e.target.value))} />
                  <output>{Number(v.toFixed(4))}</output>
                </label>
              );
            })}
          </fieldset>
        ))}

        <fieldset>
          <legend>전체 값 (JSON)</legend>
          <p className="dim">곡선과 색상별 조정은 여기서 직접 고칩니다. 맞춘 값을 복사해서 보내주시면 기본값에 반영할게요.</p>
          <textarea value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} rows={14} />
          {jsonError && <p className="error">{jsonError}</p>}
          <div className="row">
            <button onClick={applyJson}>적용</button>
            <button onClick={() => navigator.clipboard?.writeText(JSON.stringify({ id: profile.id, look }, null, 2))}>복사</button>
            <button
              disabled={!edited}
              onClick={() =>
                setOverrides((o) => {
                  const n = { ...o };
                  delete n[profileId];
                  return n;
                })
              }
            >
              기본값으로 되돌리기
            </button>
          </div>
        </fieldset>
      </aside>
    </div>
  );
}

function CurvePreview({ look }: { look: LookParams }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    const W = (c.width = 240);
    const H = (c.height = 160);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.moveTo(0, H);
    g.lineTo(W, 0);
    g.stroke();
    const master = makeCurve(look.curves.master);
    const chans: [string, ReturnType<typeof makeCurve>][] = [
      ['#ff6b6b', makeCurve(look.curves.r)],
      ['#6bdc7a', makeCurve(look.curves.g)],
      ['#6ba8ff', makeCurve(look.curves.b)],
    ];
    for (const [col, f] of chans) {
      g.strokeStyle = col;
      g.globalAlpha = 0.85;
      g.beginPath();
      for (let i = 0; i <= W; i++) {
        const y = f(master(i / W));
        if (i === 0) g.moveTo(i, H - y * H);
        else g.lineTo(i, H - y * H);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  }, [look.curves]);
  return (
    <figure className="curve">
      <canvas ref={ref} aria-label="톤 커브" />
      <figcaption className="dim">톤 커브: 대각선보다 위에서 시작하면 블랙이 뜨고, 아래에서 끝나면 화이트가 눌립니다.</figcaption>
    </figure>
  );
}
