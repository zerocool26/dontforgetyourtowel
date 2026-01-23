/** @jsxImportSource react */
/** @jsxRuntime automatic */
import { lazy, Suspense } from 'react';

// Lazy load the heavy 3D component
const ImmersiveLabs = lazy(() => import('./ImmersiveLabs.tsx'));

// Loading fallback with skeleton
const LoadingFallback = () => (
  <div className="ih-labs" style={{ minHeight: '600px' }}>
    <div className="ih-labs-grid">
      {[1, 2].map(i => (
        <div
          key={i}
          className="ih-panel animate-pulse"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div
            style={{
              height: '24px',
              width: '70%',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              marginBottom: '12px',
            }}
          />
          <div
            style={{
              height: '16px',
              width: '90%',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              height: '16px',
              width: '85%',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
            }}
          />
        </div>
      ))}
    </div>
  </div>
);

// Main lazy-loaded component wrapper
const ImmersiveLabsLazy = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ImmersiveLabs />
    </Suspense>
  );
};

export default ImmersiveLabsLazy;
