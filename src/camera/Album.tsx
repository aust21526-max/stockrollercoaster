import { useEffect, useMemo, useState } from 'react';
import { useBackClose } from '../back';
import { profileById } from '../engine/profiles';
import { contactSheetImage, extFor, rollFilm, shareFiles } from './share';
import { isFrame, nextMorning, rollState, rollVisible, stillOf, type Roll, type Shot } from './store';

/**
 * The album is a stack of lab envelopes, one per roll. Opening one lays the
 * frames out like a contact sheet. The roll still in the camera sits on top.
 */

export const IMPORTED_ROLL = 'imported';
export const CLIPS_ROLL = 'clips';

const fmtDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
};
const fmtReady = (t: number) => {
  const d = new Date(t);
  const sameDay = d.toDateString() === new Date().toDateString();
  return `${sameDay ? '오늘' : '내일'} ${d.getHours()}시 ${String(d.getMinutes()).padStart(2, '0')}분`;
};

type Envelope = { key: string; roll?: Roll; title: string; shots: Shot[] };

export function Album({
  rolls,
  shots,
  activeRoll,
  onClose,
  onView,
  onLoadRoll,
  onSend,
  onOpened,
}: {
  rolls: Roll[];
  shots: Shot[];
  activeRoll: Roll | undefined;
  onClose: () => void;
  onView: (shots: Shot[], index: number) => void;
  onLoadRoll: () => void;
  onSend: (roll: Roll, readyAt: number) => void;
  onOpened: (roll: Roll) => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  useBackClose(open !== null, () => setOpen(null));
  useBackClose(sending, () => setSending(false));

  // Tick while something is at the lab, so envelopes arrive on their own.
  const anyDeveloping = rolls.some((r) => rollState(r, now) === 'developing');
  useEffect(() => {
    if (!anyDeveloping) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyDeveloping]);

  const byRoll = useMemo(() => {
    const m = new Map<string, Shot[]>();
    for (const s of shots) {
      const k = s.rollId ?? 'legacy';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    // Frame order, prints after their frame.
    for (const list of m.values()) list.sort((a, b) => (a.frame ?? 0) - (b.frame ?? 0) || a.createdAt - b.createdAt);
    return m;
  }, [shots]);

  const envelopes: Envelope[] = [
    ...rolls.filter((r) => r.sentAt).map((r) => ({ key: r.id, roll: r, title: r.name, shots: byRoll.get(r.id) ?? [] })),
    ...(byRoll.get(CLIPS_ROLL)?.length ? [{ key: CLIPS_ROLL, title: '필름 영상', shots: byRoll.get(CLIPS_ROLL)! }] : []),
    ...(byRoll.get(IMPORTED_ROLL)?.length ? [{ key: IMPORTED_ROLL, title: '필터 입힌 사진', shots: byRoll.get(IMPORTED_ROLL)! }] : []),
    ...(byRoll.get('legacy')?.length ? [{ key: 'legacy', title: '지난 사진', shots: byRoll.get('legacy')! }] : []),
  ];

  const activeShots = activeRoll ? byRoll.get(activeRoll.id) ?? [] : [];
  const framesTaken = activeShots.filter(isFrame).length;
  const openEnvelope = envelopes.find((e) => e.key === open);

  if (openEnvelope) {
    return <ContactSheet envelope={openEnvelope} onBack={() => setOpen(null)} onView={onView} />;
  }

  return (
    <div className="album" role="dialog" aria-label="앨범">
      <header className="album-head">
        <button className="text" onClick={onClose}>카메라로</button>
        <h2>앨범</h2>
        <span />
      </header>

      <section className="in-camera" aria-label="카메라 안의 롤">
        {activeRoll ? (
          <>
            <div className="canister" aria-hidden>
              <span>{activeRoll.size}</span>
            </div>
            <div className="in-camera-text">
              <p className="in-camera-name">{activeRoll.name}</p>
              <p className="dim">
                {framesTaken}/{activeRoll.size}컷 찍음, {activeRoll.mode === 'wait' ? '현상 전까지 볼 수 없어요' : '바로 보기'}
              </p>
              <div className="frames-bar" aria-hidden>
                {Array.from({ length: activeRoll.size }, (_, i) => (
                  <span key={i} className={i < framesTaken ? 'is-shot' : ''} />
                ))}
              </div>
            </div>
            <div className="in-camera-actions">
              {activeRoll.mode === 'instant' && framesTaken > 0 && (
                <button onClick={() => onView([...activeShots].reverse(), 0)}>사진 보기</button>
              )}
              <button className="primary" disabled={framesTaken === 0} onClick={() => setSending(true)}>
                현상 맡기기
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="canister is-empty" aria-hidden />
            <div className="in-camera-text">
              <p className="in-camera-name">카메라가 비어 있어요</p>
              <p className="dim">새 롤을 넣고 찍기 시작하세요.</p>
            </div>
            <div className="in-camera-actions">
              <button className="primary" onClick={onLoadRoll}>새 롤 넣기</button>
            </div>
          </>
        )}
      </section>

      <section className="envelopes" aria-label="현상소 봉투">
        {envelopes.length === 0 && <p className="dim album-empty">현상을 맡긴 롤이 봉투에 담겨 여기에 쌓여요.</p>}
        {envelopes.map((env) => {
          const state = env.roll ? rollState(env.roll, now) : 'developed';
          const frames = env.shots.filter((s) => !s.reprint);
          const clipsOnly = env.key === CLIPS_ROLL;
          const cameras = [...new Set(env.shots.map((s) => profileById(s.profileId).name))];
          const fresh = env.roll && state === 'developed' && !env.roll.openedAt;
          const first = env.shots[0]?.createdAt;
          const last = env.shots[env.shots.length - 1]?.createdAt;
          return (
            <button
              key={env.key}
              className={`envelope ${state === 'developing' ? 'is-developing' : ''}`}
              disabled={state === 'developing'}
              onClick={() => {
                setOpen(env.key);
                if (env.roll) onOpened(env.roll);
              }}
            >
              <span className="envelope-flap" aria-hidden />
              <span className="envelope-label">
                <span className="lab-name">우리 현상소</span>
                <strong className="env-title">{env.title}</strong>
                <span className="env-row">
                  {first ? (first && last && fmtDate(first) !== fmtDate(last) ? `${fmtDate(first)} ~ ${fmtDate(last)}` : fmtDate(first)) : ''}
                </span>
                <span className="env-row">
                  {frames.length}{clipsOnly ? '편' : '장'}{cameras.length ? `, ${cameras.slice(0, 3).join(', ')}${cameras.length > 3 ? ' 외' : ''}` : ''}
                </span>
              </span>
              <span className={`lab-stamp stamp-${state}`} aria-hidden>
                {state === 'developing' ? '현상 중' : '현상 완료'}
              </span>
              {state === 'developing' && env.roll?.readyAt && (
                <span className="env-ready">{env.roll.readyAt - now < 60000 ? '잠시 후 도착해요' : `${fmtReady(env.roll.readyAt)}에 도착해요`}</span>
              )}
              {fresh && <span className="env-new">새 봉투</span>}
            </button>
          );
        })}
      </section>

      {sending && activeRoll && (
        <div className="sheet-backdrop" onClick={() => setSending(false)}>
          <section className="sheet" role="dialog" aria-label="현상 맡기기" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>현상 맡기기</h2>
              <button className="text" onClick={() => setSending(false)}>닫기</button>
            </div>
            <p className="sheet-note">
              {activeRoll.name}을 현상소에 맡깁니다. {framesTaken < activeRoll.size ? `남은 ${activeRoll.size - framesTaken}컷은 비워 둔 채로 맡겨요. ` : ''}
              맡긴 뒤에는 이 롤로 더 찍을 수 없어요.
            </p>
            <div className="send-options">
              <button
                onClick={() => {
                  onSend(activeRoll, Date.now() + 6000);
                  setSending(false);
                }}
              >
                <strong>바로 받기</strong>
                <small>잠깐 기다리면 봉투가 도착해요.</small>
              </button>
              <button
                onClick={() => {
                  onSend(activeRoll, nextMorning());
                  setSending(false);
                }}
              >
                <strong>내일 아침에 받기</strong>
                <small>진짜 현상소처럼 하룻밤 기다려요. 아침 8시에 도착해요.</small>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ContactSheet({ envelope, onBack, onView }: { envelope: Envelope; onBack: () => void; onView: (shots: Shot[], index: number) => void }) {
  const visible = rollVisible(envelope.roll);
  const urls = useMemo(() => (visible ? envelope.shots.map((s) => URL.createObjectURL(stillOf(s))) : []), [envelope.shots, visible]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  const [making, setMaking] = useState('');
  const rows: Shot[][] = [];
  for (let i = 0; i < envelope.shots.length; i += 3) rows.push(envelope.shots.slice(i, i + 3));

  const photos = envelope.shots.filter((s) => s.kind !== 'video');
  const first = envelope.shots[0]?.createdAt;
  const subtitle = first ? `${fmtDate(first)}, ${photos.length}장` : '';
  const safeName = envelope.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'roll';

  const saveSheet = async () => {
    setMaking('인화지를 만드는 중');
    try {
      const blob = await contactSheetImage(
        envelope.shots.map((s) => ({ blob: stillOf(s), frame: s.frame })),
        envelope.title,
        subtitle,
      );
      await shareFiles([new File([blob], `${safeName}_contact.jpg`, { type: 'image/jpeg' })]);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setMaking('');
    }
  };

  const makeFilm = async () => {
    setMaking('영상을 만드는 중 0%');
    try {
      const blob = await rollFilm(
        photos.map((s) => s.developed),
        envelope.title,
        subtitle,
        (p) => setMaking(`영상을 만드는 중 ${Math.round(p * 100)}%`),
      );
      await shareFiles([new File([blob], `${safeName}_film.${extFor(blob.type)}`, { type: blob.type })]);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setMaking('');
    }
  };

  return (
    <div className="album sheet-open" role="dialog" aria-label={envelope.title}>
      <header className="album-head">
        <button className="text" onClick={onBack}>봉투 목록</button>
        <h2>{envelope.title}</h2>
        <span />
      </header>
      {photos.length > 0 && (
        <div className="share-row">
          <button onClick={saveSheet} disabled={!!making}>인화지 한 장으로 저장</button>
          <button onClick={makeFilm} disabled={!!making}>롤 영상 만들기</button>
        </div>
      )}
      {making && <p className="making" role="status">{making}…</p>}
      <div className="contact" aria-label="밀착 인화지">
        {rows.map((row, r) => (
          <div className="strip" key={r}>
            <div className="sprockets" aria-hidden />
            <div className="strip-frames">
              {row.map((shot, i) => {
                const idx = r * 3 + i;
                return (
                  <button key={shot.id} className="frame" onClick={() => onView(envelope.shots, idx)} aria-label={`${shot.frame ?? idx + 1}번 ${shot.kind === 'video' ? '영상' : '사진'} 보기`}>
                    <img src={urls[idx]} alt="" loading="lazy" />
                    {shot.kind === 'video' && <span className="play" aria-hidden>▶ {shot.duration}s</span>}
                    <span className="edge">
                      ▸{shot.frame ?? idx + 1}
                      {shot.reprint ? 'R' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="sprockets" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Loading a new roll: size, whether to see frames right away, and a name. */
export function RollLoader({ onLoad, onClose, reason }: { onLoad: (size: Roll['size'], mode: Roll['mode'], name: string) => void; onClose: () => void; reason?: string }) {
  const [size, setSize] = useState<Roll['size']>(24);
  const [mode, setMode] = useState<Roll['mode']>('instant');
  const [name, setName] = useState('');
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label="새 롤 넣기" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>새 롤 넣기</h2>
          <button className="text" onClick={onClose}>닫기</button>
        </div>
        {reason && <p className="sheet-note">{reason}</p>}
        <div className="group">
          <h3>컷 수</h3>
          <div className="seg" role="radiogroup" aria-label="컷 수">
            {([24, 36] as const).map((n) => (
              <button key={n} role="radio" aria-checked={size === n} className={size === n ? 'is-on' : ''} onClick={() => setSize(n)}>
                {n}컷
              </button>
            ))}
          </div>
        </div>
        <div className="group">
          <h3>보는 방식</h3>
          <div className="seg" role="radiogroup" aria-label="보는 방식">
            <button role="radio" aria-checked={mode === 'instant'} className={mode === 'instant' ? 'is-on' : ''} onClick={() => setMode('instant')}>
              바로 보기
            </button>
            <button role="radio" aria-checked={mode === 'wait'} className={mode === 'wait' ? 'is-on' : ''} onClick={() => setMode('wait')}>
              다 찍고 현상
            </button>
          </div>
          <p className="sheet-note">
            {mode === 'wait' ? '현상을 맡기기 전까지 찍은 사진을 볼 수 없어요. 봉투를 열 때까지의 설렘이 있어요.' : '찍자마자 사진을 볼 수 있어요.'}
          </p>
        </div>
        <div className="group">
          <h3>롤 이름</h3>
          <input className="roll-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 제주 여행, 100일" maxLength={30} />
        </div>
        <button className="bag-pick" onClick={() => onLoad(size, mode, name)}>
          필름 넣기
        </button>
      </section>
    </div>
  );
}
