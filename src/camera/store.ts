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
}

const DB = 'film-camera';
const STORE = 'shots';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(STORE, { keyPath: 'id' });
      s.createIndex('createdAt', 'createdAt');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      resolve(req.result);
      db.close();
    };
    t.onerror = () => reject(t.error);
  });
}

export const saveShot = (shot: Shot) => tx('readwrite', (s) => s.put(shot));
export const deleteShot = (id: string) => tx('readwrite', (s) => s.delete(id));

export async function listShots(): Promise<Shot[]> {
  const all = await tx<Shot[]>('readonly', (s) => s.getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** Ask the browser not to evict our photos under storage pressure. */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}

/**
 * Hands the photo to the system: on iPhone the share sheet has "Save Image",
 * on Android it offers Gallery/Photos. Falls back to a download.
 */
export async function exportShot(shot: Shot) {
  const name = `FILM_${new Date(shot.createdAt).toISOString().replace(/[-:T]/g, '').slice(0, 14)}.jpg`;
  const file = new File([shot.developed], name, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
