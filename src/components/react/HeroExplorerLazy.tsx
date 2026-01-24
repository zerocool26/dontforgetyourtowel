/** @jsxImportSource react */
/** @jsxRuntime automatic */
import { lazy, Suspense } from 'react';

const HeroExplorer = lazy(() => import('./HeroExplorer.tsx'));

const Loading = () => (
  <div
    style={{
      minHeight: '100svh',
      background:
        'radial-gradient(120% 80% at 50% 8%, rgba(99,102,241,0.12), transparent 60%), #040712',
      display: 'flex',
      alignItems: 'flex-end',
      padding: '20px',
      color: '#94a3b8',
      fontSize: '0.95rem',
      letterSpacing: '0.08em',
    }}
  >
    Booting 3D hero…
  </div>
);

const NoWebGL = () => (
  <div
    style={{
      minHeight: '100svh',
      background:
        'radial-gradient(120% 80% at 50% 8%, rgba(34,211,238,0.16), transparent 58%), radial-gradient(90% 70% at 70% 18%, rgba(99,102,241,0.16), transparent 62%), #040712',
      display: 'grid',
      alignContent: 'end',
      gap: '10px',
      padding: '20px',
      color: '#cbd5e1',
    }}
    role="status"
    aria-live="polite"
  >
    <div style={{ letterSpacing: '0.22em', textTransform: 'uppercase' }}>
      WebGL unavailable
    </div>
    <div style={{ maxWidth: 560, color: '#94a3b8' }}>
      Your browser/device is blocking 3D rendering. The rest of the site works
      normally.
    </div>
  </div>
);

const hasWebGL = () => {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
};

const HeroExplorerLazy = () =>
  hasWebGL() ? (
    <Suspense fallback={<Loading />}>
      <HeroExplorer showPost={false} mode="landing" />
    </Suspense>
  ) : (
    <NoWebGL />
  );

export default HeroExplorerLazy;
