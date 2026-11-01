import { lazy, Suspense, useEffect, useState } from 'react';

const Camera = lazy(() => import('./camera/Camera'));
const Lab = lazy(() => import('./lab/Lab'));

/** Hash routes keep the PWA working offline without server rewrites. */
function useRoute() {
  const [route, setRoute] = useState(location.hash);
  useEffect(() => {
    const on = () => setRoute(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  return <Suspense fallback={null}>{route === '#/lab' ? <Lab /> : <Camera />}</Suspense>;
}
