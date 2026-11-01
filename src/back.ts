import { useEffect, useRef } from 'react';

/**
 * Back button closes the top overlay instead of leaving the app.
 *
 * Each open overlay (sheet, camera bag, album, viewer…) pushes a history
 * entry. The system back gesture pops it and we close that overlay. When an
 * overlay is closed from the UI instead, we remove its entry ourselves with
 * history.back() and ignore the resulting popstate.
 */

type Entry = { id: number; close: () => void; hash: string };
const stack: Entry[] = [];
let ignorePops = 0;
let nextId = 1;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops--;
      return;
    }
    const top = stack.pop();
    top?.close();
  });
}

function push(close: () => void): number {
  const id = nextId++;
  stack.push({ id, close, hash: location.hash });
  history.pushState({ overlay: id }, '');
  return id;
}

function release(id: number) {
  const i = stack.findIndex((e) => e.id === id);
  if (i < 0) return; // already popped by the back button
  const [entry] = stack.splice(i, 1);
  // If we navigated to another page meanwhile (e.g. a link inside a sheet),
  // going back would undo that navigation. Leave history alone.
  if (location.hash !== entry.hash) return;
  ignorePops++;
  history.back();
}

/** While `open` is true, the back button calls `onClose`. */
export function useBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = push(() => closeRef.current());
    return () => release(id);
  }, [open]);
}
