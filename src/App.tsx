import { lazy, Suspense } from 'react';

const Lab = lazy(() => import('./lab/Lab'));

/**
 * Only the darkroom exists so far. The camera screens (camera, roll, album,
 * settings) come next; see docs/STRATEGY.md.
 */
export default function App() {
  return (
    <Suspense fallback={null}>
      <Lab />
    </Suspense>
  );
}
