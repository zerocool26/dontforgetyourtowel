/** @jsxImportSource react */
/** @jsxRuntime automatic */
import { lazy, Suspense } from 'react';

const HeroExplorer = lazy(() => import('./HeroExplorer.tsx'));

const Loading = () => (
  <div
    style={{
      minHeight: '90vh',
      background:
        'radial-gradient(120% 80% at 50% 8%, rgba(99,102,241,0.12), transparent 60%), #040712',
      display: 'flex',
      alignItems: 'flex-end',
      padding: '24px',
      color: '#94a3b8',
      fontSize: '0.95rem',
      letterSpacing: '0.08em',
    }}
  >
    Booting immersive hero…
  </div>
);

const HeroExplorerLazy = () => (
  <Suspense fallback={<Loading />}>
    <HeroExplorer />
  </Suspense>
);

export default HeroExplorerLazy;
