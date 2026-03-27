/** @jsxImportSource react */
/** @jsxRuntime automatic */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import '@/styles/olive-universe.css';
import { withBasePath } from '@/utils/helpers';
import {
  detectQuality,
  getDeviceMemory,
  getSceneProfile,
  HERO_COPY,
  HERO_MODE_NOTES,
  hexToRgbString,
  IMMERSIVE_LINKS,
  isMobileLikeDevice,
  optimizeSceneProfileForMobile,
  prefersReducedMotion,
  SCENE_PALETTE,
  supportsWebGL,
  type HeroVisualMode,
  type QualityTier,
} from './olive-universe-config';

const OliveUniverseCanvas = lazy(() => import('./OliveUniverseCanvas'));

function StaticBackdrop({
  mode,
}: {
  mode: 'loading' | 'reduced' | 'fallback';
}) {
  return (
    <div className={`universe-static-visual universe-static-visual--${mode}`}>
      <div className="universe-static-grid" />
      <div className="universe-static-core" />
      <div className="universe-static-orbit universe-static-orbit--outer" />
      <div className="universe-static-orbit universe-static-orbit--inner" />
      <div className="universe-static-pulse" />
    </div>
  );
}

export default function OliveUniverse() {
  const interactionTimeoutRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [quality, setQuality] = useState<QualityTier>('medium');
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [deviceMemory, setDeviceMemory] = useState<number | null>(null);
  const [mobileLikeDevice, setMobileLikeDevice] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [stabilityAssistActive, setStabilityAssistActive] = useState(false);
  const [interactionPulse, setInteractionPulse] = useState(0);
  const [interactionState, setInteractionState] = useState<
    'idle' | 'engaged' | 'burst'
  >('idle');

  const syncCapabilities = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setQuality(detectQuality());
    setDeviceMemory(getDeviceMemory());
    setMobileLikeDevice(isMobileLikeDevice());
    setIsCompactViewport(window.matchMedia('(max-width: 960px)').matches);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );
    const syncReducedMotion = () =>
      setPrefersReduced(reducedMotionQuery.matches);
    const syncPageVisibility = () => {
      setPageVisible(document.visibilityState !== 'hidden');
    };

    syncReducedMotion();
    syncCapabilities();
    syncPageVisibility();
    setWebglSupported(supportsWebGL());
    setMounted(true);

    window.addEventListener('resize', syncCapabilities);
    window.addEventListener('orientationchange', syncCapabilities);
    document.addEventListener('visibilitychange', syncPageVisibility);

    if ('addEventListener' in reducedMotionQuery) {
      reducedMotionQuery.addEventListener('change', syncReducedMotion);
    }

    return () => {
      window.removeEventListener('resize', syncCapabilities);
      window.removeEventListener('orientationchange', syncCapabilities);
      document.removeEventListener('visibilitychange', syncPageVisibility);

      if ('removeEventListener' in reducedMotionQuery) {
        reducedMotionQuery.removeEventListener('change', syncReducedMotion);
      }
    };
  }, [syncCapabilities]);

  useEffect(() => {
    return () => {
      if (
        interactionTimeoutRef.current !== null &&
        typeof window !== 'undefined'
      ) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  const visualMode = useMemo<HeroVisualMode>(() => {
    if (!webglSupported) {
      return 'fallback';
    }

    if (prefersReduced) {
      return 'reduced';
    }

    return quality === 'low' ? 'lite' : 'immersive';
  }, [prefersReduced, quality, webglSupported]);

  const effectiveVisualMode = useMemo<HeroVisualMode>(() => {
    if (visualMode !== 'immersive') {
      return visualMode;
    }

    return stabilityAssistActive ? 'lite' : visualMode;
  }, [stabilityAssistActive, visualMode]);

  const shouldRenderCanvas =
    effectiveVisualMode === 'immersive' || effectiveVisualMode === 'lite';

  useEffect(() => {
    if (shouldRenderCanvas) {
      return;
    }

    setSceneReady(false);
    setInteractionState('idle');
    setStabilityAssistActive(false);
  }, [shouldRenderCanvas]);

  const lowMemoryDevice =
    deviceMemory !== null
      ? deviceMemory <= 4
      : mobileLikeDevice && quality === 'low';
  const mobileOptimized =
    isCompactViewport ||
    mobileLikeDevice ||
    lowMemoryDevice ||
    quality === 'low';
  const runtimeQuality: QualityTier = stabilityAssistActive ? 'low' : quality;
  const baseSceneProfile = useMemo(
    () => getSceneProfile(runtimeQuality, effectiveVisualMode),
    [effectiveVisualMode, runtimeQuality]
  );
  const sceneProfile = useMemo(() => {
    if (!mobileOptimized) {
      return baseSceneProfile;
    }

    return optimizeSceneProfileForMobile(baseSceneProfile, {
      lowMemory: lowMemoryDevice,
      compactViewport: isCompactViewport,
    });
  }, [baseSceneProfile, isCompactViewport, lowMemoryDevice, mobileOptimized]);

  const heroSceneState = shouldRenderCanvas
    ? sceneReady
      ? 'interactive'
      : 'booting'
    : effectiveVisualMode === 'fallback'
      ? 'fallback'
      : 'ambient';

  const triggerPulse = useCallback(() => {
    if (!shouldRenderCanvas || typeof window === 'undefined') {
      return;
    }

    setInteractionPulse(current => current + 1);
    setInteractionState('burst');

    if (interactionTimeoutRef.current !== null) {
      window.clearTimeout(interactionTimeoutRef.current);
    }

    interactionTimeoutRef.current = window.setTimeout(() => {
      setInteractionState('idle');
      interactionTimeoutRef.current = null;
    }, 1200);
  }, [shouldRenderCanvas]);

  const handleInteractionStateChange = useCallback(
    (nextState: 'idle' | 'engaged' | 'burst') => {
      setInteractionState(currentState =>
        currentState === 'burst' && nextState === 'engaged'
          ? currentState
          : nextState
      );
    },
    []
  );

  const accentRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.accent), []);
  const secondaryRgb = useMemo(
    () => hexToRgbString(SCENE_PALETTE.secondary),
    []
  );
  const tertiaryRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.tertiary), []);

  return (
    <section
      className="universe-wrapper"
      aria-label="Immersive landing experience"
      aria-busy={shouldRenderCanvas && !sceneReady}
      data-olive-universe={mounted ? 'ready' : 'booting'}
      data-current-chapter="singularity"
      data-olive-runtime={stabilityAssistActive ? 'stability' : 'default'}
      data-olive-scene={heroSceneState}
      data-olive-mode={effectiveVisualMode}
      data-olive-mobile-3d={mobileOptimized ? 'optimized' : 'standard'}
      data-olive-motion-preference={prefersReduced ? 'calm' : 'auto'}
      data-olive-interaction={interactionState}
      data-olive-atmosphere="singularity"
      data-olive-preload={
        sceneReady ? 'ready' : shouldRenderCanvas ? 'warming' : 'idle'
      }
      style={
        {
          '--universe-accent': SCENE_PALETTE.accent,
          '--universe-accent-rgb': accentRgb,
          '--universe-secondary-rgb': secondaryRgb,
          '--universe-tertiary-rgb': tertiaryRgb,
        } as CSSProperties
      }
      onPointerDown={triggerPulse}
    >
      <div className="universe-stage-aura" aria-hidden="true" />

      {shouldRenderCanvas ? (
        <Suspense fallback={<StaticBackdrop mode="loading" />}>
          <OliveUniverseCanvas
            quality={runtimeQuality}
            sceneProfile={sceneProfile}
            shouldAnimate={pageVisible}
            mobileOptimized={mobileOptimized}
            stabilityAssistActive={stabilityAssistActive}
            interactionPulse={interactionPulse}
            onInteractionStateChange={handleInteractionStateChange}
            onPerformanceBudgetExceeded={() => setStabilityAssistActive(true)}
            onReady={() => setSceneReady(true)}
          />
        </Suspense>
      ) : (
        <StaticBackdrop
          mode={effectiveVisualMode === 'fallback' ? 'fallback' : 'reduced'}
        />
      )}

      <div className="universe-stage-vignette" aria-hidden="true" />
      <div className="universe-stage-grain" aria-hidden="true" />
      <div className="universe-stage-scanlines" aria-hidden="true" />

      <div className="universe-a11y-copy sr-only" data-olive-links>
        <h1>{HERO_COPY.title}</h1>
        <p>{HERO_COPY.description}</p>
        <p>{HERO_COPY.accessibilityNote}</p>
        <p>{HERO_MODE_NOTES[effectiveVisualMode]}</p>
        <nav aria-label="Primary destinations">
          <ul>
            {IMMERSIVE_LINKS.map(link => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <a href={withBasePath('services/')}>Enter the services experience</a>
      </div>
    </section>
  );
}
