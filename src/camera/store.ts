import { extFor, shareFiles } from './share';

/**
 * Shots live in IndexedDB on the device. We keep the original next to the
 * developed photo so it can be re-developed with another film later.
 */

export interface Shot {
  id: string;
  createdAt: number;
  profileId: string;
  width: number;
  height: number;
  developed: Blob;
  original: Blob;
  /** Settings used, so a re-develop can reproduce the frame. */
  meta: Record<string, unknown>;
  /** Roll this frame belongs to. Older shots have none ("지난 사진"). */
  rollId?: string;
  /** Frame number on the roll, 1-based. */
  frame?: number;
  /** An extra print from "다시 현상": not a new frame. */
  reprint?: boolean;
  /** 'video' = a short film clip; `developed` is the video, `poster` its first frame. */
  kind?: 'photo' | 'video';
  poster?: Blob;
  /** Clip length in seconds. */
  duration?: number;
}

/** Still image to show for a shot in grids and thumbnails. */
export const stillOf = (s: Shot) => (s.kind === 'video' ? s.poster ?? s.developed : s.developed);
/** Counts toward a roll's frames (videos and reprints do not). */
export const isFrame = (s: Shot) => !s.reprint && s.kind !== 'video';

/**
 * A roll of film. "instant" shows frames as they are taken; "wait" hides them
 * until the roll is handed to the lab and comes back.
 */
export interface Roll {
  id: string;
  name: string;
  size: 24 | 36;
  mode: 'instant' | 'wait';
  createdAt: number;
  /** Set when handed to the lab ("현상 맡기기"). */
  sentAt?: number;
  /** When the envelope comes back. Frames of a "wait" roll appear from then. */
  readyAt?: number;
  /** First time the developed envelope was opened (for the "새 봉투" badge). */
  openedAt?: number;
}

export type RollState = 'shooting' | 'developing' | 'developed';
export function rollState(roll: Roll, now = Date.now()): RollState {
  if (!roll.sentAt) return 'shooting';
  return (roll.readyAt ?? 0) <= now ? 'developed' : 'developing';
}
/** Can the frames of this roll be looked at yet? */
export const rollVisible = (roll: Roll | undefined, now = Date.now()) =>
  !roll || roll.mode === 'instant' || rollState(roll, now) === 'developed';

const DB = 'film-camera';
const SHOTS = 'shots';
const ROLLS = 'rolls';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (e.oldVersion < 1) {
        const s = db.createObjectStore(SHOTS, { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
      }
      if (e.oldVersion < 2) db.createObjectStore(ROLLS, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => {
      resolve(req.result);
      db.close();
    };
    t.onerror = () => reject(t.error);
  });
}

export const saveShot = (shot: Shot) => tx(SHOTS, 'readwrite', (s) => s.put(shot));
export const deleteShot = (id: string) => tx(SHOTS, 'readwrite', (s) => s.delete(id));
export const saveRoll = (roll: Roll) => tx(ROLLS, 'readwrite', (s) => s.put(roll));

export async function listShots(): Promise<Shot[]> {
  const all = await tx<Shot[]>(SHOTS, 'readonly', (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function listRolls(): Promise<Roll[]> {
  const all = await tx<Roll[]>(ROLLS, 'readonly', (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export function newRoll(size: Roll['size'], mode: Roll['mode'], name?: string): Roll {
  const now = new Date();
  return {
    id: `roll-${now.getTime()}`,
    name: name?.trim() || `${now.getMonth() + 1}월 ${now.getDate()}일의 롤`,
    size,
    mode,
    createdAt: now.getTime(),
  };
}

/** Next morning at 8:00 — "내일 아침에 받기". */
export function nextMorning(now = new Date()): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d.getTime();
}

/** Ask the browser not to evict our photos under storage pressure. */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}

/**
 * Hands photos and clips to the system: on iPhone the share sheet has "Save",
 * on Android it offers Gallery/Photos. Falls back to downloads.
 */
export async function exportShots(shots: Shot[]) {
  const files = shots.map((shot) => {
    const ext = extFor(shot.developed.type);
    const name = `FILM_${new Date(shot.createdAt).toISOString().replace(/[-:T]/g, '').slice(0, 14)}_${shot.id.slice(-5)}.${ext}`;
    return new File([shot.developed], name, { type: shot.developed.type || 'image/jpeg' });
  });
  await shareFiles(files);
}
