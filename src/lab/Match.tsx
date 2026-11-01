import { useEffect, useState } from 'react';
import { fitFilmOnly, fitPairs, readPixels, type FitResult } from '../engine/calibrate';
import { FilmRenderer } from '../engine/pipeline';
import { customProfiles, deleteCustomProfile, PROFILES, profileById, saveCustomProfile } from '../engine/profiles';
import type { FilmProfile, LookParams } from '../engine/types';
import { CameraBody } from '../camera/CameraBody';
import { makeTestChart } from './testChart';
import './match.css';

/**
 * "실제 필름과 맞추기": fit a camera to real film photos and save it as one of
 * our cameras. Pairs (phone + film of the same scene) give an accurate fit;
 * film scans alone give an approximate one.
 */

type Img = { name: string; canvas: HTMLCanvasElement; url: string };
type Pair = { phone?: Img; film?: Img };

async function loadImg(file: File): Promise<Img> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  // Keep a working copy at most 1600px; enough for fitting and previews.
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return { name: file.name, canvas: c, url: c.toDataURL('image/jpeg', 0.85) };
}

function render(look: LookParams, src: HTMLCanvasElement, maxSide = 520): string {
  const c = document.createElement('canvas');
  const r = new FilmRenderer(c);
  const [w, h] = r.fit(src.width, src.height, maxSide);
  r.setSource(src, src.width, src.height);
  r.render(look, { labCorrection: false, strength: 1, seed: 4 }, null, w, h);
  const url = c.toDataURL('image/jpeg', 0.88);
  r.dispose();
  (r.gl.getExtension('WEBGL_lose_context') as { loseContext(): void } | null)?.loseContext();
  return url;
}

export default function Match() {
  const [mode, setMode] = useState<'pairs' | 'film'>('pairs');
  const [pairs, setPairs] = useState<Pair[]>([{}]);
  const [films, setFilms] = useState<Img[]>([]);
  const [baseId, setBaseId] = useState('portrait400');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ look: LookParams; fit?: FitResult; summary?: string; previews: string[][] } | null>(null);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<FilmProfile | null>(null);
  const [mine, setMine] = useState<FilmProfile[]>(customProfiles);

  useEffect(() => setResult(null), [mode, pairs, films, baseId]);

  const ready = mode === 'pairs' ? pairs.some((p) => p.phone && p.film) : films.length > 0;

  const setPairImg = async (i: number, side: 'phone' | 'film', file?: File) => {
    if (!file) return;
    try {
      const img = await loadImg(file);
      setPairs((ps) => ps.map((p, j) => (j === i ? { ...p, [side]: img } : p)));
    } catch {
      setError(`${file.name}을(를) 열 수 없습니다. JPEG 또는 PNG로 바꿔서 다시 올려 주세요.`);
    }
  };

  const run = async () => {
    setError('');
    setBusy('맞추는 중이에요. 사진이 많으면 몇 초 걸려요.');
    await new Promise((r) => setTimeout(r, 50));
    try {
      const base = profileById(baseId).look;
      if (mode === 'pairs') {
        const done = pairs.filter((p): p is Required<Pair> => !!p.phone && !!p.film);
        const fit = fitPairs(
          done.map((p) => ({ phone: readPixels(p.phone.canvas, p.phone.canvas.width, p.phone.canvas.height), film: readPixels(p.film.canvas, p.film.canvas.width, p.film.canvas.height) })),
          base,
        );
        const previews = done.map((p) => [p.phone.url, render(fit.look, p.phone.canvas), p.film.url]);
        setResult({ look: fit.look, fit, previews });
      } else {
        const { look, summary } = fitFilmOnly(
          films.map((f) => readPixels(f.canvas, f.canvas.width, f.canvas.height)),
          base,
        );
        const chart = makeTestChart(900, 600);
        setResult({ look, summary, previews: [[render(base, chart), render(look, chart)]] });
      }
    } catch (e) {
      setError(`맞추지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy('');
    }
  };

  const save = () => {
    if (!result) return;
    const base = profileById(baseId);
    const profile: FilmProfile = {
      id: `custom-${Date.now()}`,
      name: name.trim() || `내 필름 ${mine.length + 1}`,
      film: mode === 'pairs' ? '실제 필름에 맞춘 색' : '필름 사진에서 잰 색',
      reference: mode === 'pairs' ? `Fitted from ${result.previews.length} phone/film pairs on ${base.id}` : `Measured from ${films.length} film scans on ${base.id}`,
      iso: base.iso,
      tagline: mode === 'pairs' ? '우리가 찍은 실제 필름 사진에 맞춰 만든 카메라.' : '좋아하는 필름 사진의 색을 재서 만든 카메라.',
      situations: base.situations,
      avoid: base.avoid,
      labWhiteBalance: 0.3,
      look: result.look,
      custom: true,
      bodyOf: base.bodyOf ?? base.id,
    };
    saveCustomProfile(profile);
    setMine(customProfiles());
    setSaved(profile);
  };

  const pct = result?.fit && Number.isFinite(result.fit.before) ? Math.round((1 - result.fit.after / result.fit.before) * 100) : null;

  return (
    <div className="match">
      <header className="match-head">
        <a href="#/">카메라로</a>
        <h1>실제 필름과 맞추기</h1>
        <a href="#/lab">현상실</a>
      </header>

      <p className="match-lead">
        실제 필름 사진을 올리면 그 색에 맞춰 카메라를 만들어 드려요. 만든 카메라는 카메라 가방에 들어갑니다.
      </p>

      <div className="seg" role="radiogroup" aria-label="맞추는 방식">
        <button role="radio" aria-checked={mode === 'pairs'} className={mode === 'pairs' ? 'is-on' : ''} onClick={() => setMode('pairs')}>
          같은 장면 두 장
        </button>
        <button role="radio" aria-checked={mode === 'film'} className={mode === 'film' ? 'is-on' : ''} onClick={() => setMode('film')}>
          필름 사진만
        </button>
      </div>

      {mode === 'pairs' ? (
        <section className="match-block">
          <p className="hint">
            같은 장소에서 같은 방향으로 필름카메라와 폰으로 한 장씩 찍어 올려 주세요. 폰 사진은 필터 없는 기본 카메라 사진, 필름은 사진관에서 받은 스캔 파일 그대로가 좋아요. 짝이 많을수록 정확해져요.
          </p>
          {pairs.map((p, i) => (
            <div className="pair" key={i}>
              <span className="pair-no">{i + 1}</span>
              <Slot label="폰 사진" img={p.phone} onFile={(f) => setPairImg(i, 'phone', f)} />
              <Slot label="필름 스캔" img={p.film} onFile={(f) => setPairImg(i, 'film', f)} />
              {pairs.length > 1 && (
                <button className="text" onClick={() => setPairs((ps) => ps.filter((_, j) => j !== i))} aria-label={`${i + 1}번 짝 빼기`}>
                  빼기
                </button>
              )}
            </div>
          ))}
          {pairs.length < 6 && (
            <button className="ghost" onClick={() => setPairs((ps) => [...ps, {}])}>
              짝 하나 더 추가
            </button>
          )}
        </section>
      ) : (
        <section className="match-block">
          <p className="hint">
            좋아하는 필름 사진을 여러 장 올려 주세요. 블랙과 화이트가 놓이는 위치, 그림자와 하이라이트의 색을 재서 맞춰요. 장면 색이 섞여 있어서 두 장 맞추기보다는 대략적이에요.
          </p>
          <div className="film-grid">
            {films.map((f, i) => (
              <figure key={i}>
                <img src={f.url} alt={f.name} />
                <button className="text" onClick={() => setFilms((fs) => fs.filter((_, j) => j !== i))}>빼기</button>
              </figure>
            ))}
            <label className="slot add">
              필름 사진 추가
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  const loaded = await Promise.all(files.map(loadImg));
                  setFilms((fs) => [...fs, ...loaded]);
                }}
              />
            </label>
          </div>
        </section>
      )}

      <section className="match-block">
        <h2>질감은 어느 카메라를 따를까요?</h2>
        <p className="hint">색은 사진에서 재고, 그레인과 빛 번짐, 렌즈 느낌은 고른 카메라를 따라요.</p>
        <div className="base-strip">
          {PROFILES.filter((p) => !p.custom).map((p) => (
            <button key={p.id} className={`base ${p.id === baseId ? 'is-on' : ''}`} onClick={() => setBaseId(p.id)} aria-pressed={p.id === baseId}>
              <CameraBody profileId={p.id} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </section>

      <button className="primary-btn" disabled={!ready || !!busy} onClick={run}>
        {busy ? '맞추는 중…' : '맞추기'}
      </button>
      {busy && <p className="hint center">{busy}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <section className="match-block result">
          <h2>결과</h2>
          {result.fit && pct !== null && (
            <p className="score">
              색 차이 {result.fit.before.toFixed(1)} → <strong>{result.fit.after.toFixed(1)}</strong>
              <span>{pct > 0 ? `${pct}% 더 가까워졌어요` : '차이가 줄지 않았어요'}</span>
            </p>
          )}
          {result.fit?.alignment.some((a) => a < 0.6) && (
            <p className="hint">
              {result.fit.alignment.map((a, i) => (a < 0.6 ? `${i + 1}번` : null)).filter(Boolean).join(', ')} 짝은 구도가 많이 달라서 색 분포만으로 맞췄어요. 같은 자리에서 같은 방향으로 찍으면 더 정확해져요.
            </p>
          )}
          {result.summary && <p className="hint">측정한 값: {result.summary}</p>}
          {result.previews.map((row, i) => (
            <div className={`compare cols-${row.length}`} key={i}>
              {row.map((u, j) => (
                <figure key={j}>
                  <img src={u} alt="" />
                  <figcaption>{mode === 'pairs' ? ['폰 원본', '맞춘 결과', '실제 필름'][j] : ['맞추기 전', '맞춘 결과'][j]}</figcaption>
                </figure>
              ))}
            </div>
          ))}

          {saved ? (
            <div className="saved">
              <CameraBody profileId={saved.id} />
              <p>
                <strong>{saved.name}</strong>을 카메라 가방에 넣었어요.
              </p>
              <a className="primary-btn" href="#/">카메라로 가서 찍기</a>
            </div>
          ) : (
            <div className="save-row">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`카메라 이름 (예: 우리 Gold 200)`} maxLength={24} />
              <button className="primary-btn" onClick={save}>내 카메라로 저장</button>
            </div>
          )}
        </section>
      )}

      {mine.length > 0 && (
        <section className="match-block">
          <h2>내가 만든 카메라</h2>
          <ul className="mine">
            {mine.map((p) => (
              <li key={p.id}>
                <CameraBody profileId={p.id} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.film}</small>
                </span>
                <button
                  className="text danger"
                  onClick={() => {
                    if (!confirm(`${p.name}을 지울까요? 이 카메라로 찍은 사진은 그대로 남아요.`)) return;
                    deleteCustomProfile(p.id);
                    setMine(customProfiles());
                  }}
                >
                  지우기
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Slot({ label, img, onFile }: { label: string; img?: Img; onFile: (f?: File) => void }) {
  return (
    <label className={`slot ${img ? 'has-img' : ''}`}>
      {img ? <img src={img.url} alt={label} /> : <span>{label}</span>}
      {img && <small>{label}</small>}
      <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  );
}
