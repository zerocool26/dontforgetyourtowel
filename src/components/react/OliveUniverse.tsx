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
  SCENE_PALETTE,
  supportsWebGL,
  type HeroVisualMode,
  type QualityTier,
} from './olive-universe-config';

const OliveUniverseCanvas = lazy(() => import('./OliveUniverseCanvas'));

/* ── Static fallback for reduced-motion / no-WebGL ───────────── */

function StaticBackdrop({
  mode,
}: {
  mode: 'loading' | 'reduced' | 'fallback';
}) {
  return (
    <div className={`universe-static-visual universe-static-visual--${mode}`}>
      <div className="universe-static-grid" />
      <div className="universe-static-nebula" />
      <div className="universe-static-core" />
      <div className="universe-static-orbit universe-static-orbit--outer" />
      <div className="universe-static-orbit universe-static-orbit--inner" />
      <div className="universe-static-orbit universe-static-orbit--far" />
      <div className="universe-static-pulse" />
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export default function OliveUniverse() {
  const interactionTimeoutRef = useRef<number | null>(null);
  const burstLockUntilRef = useRef(0);
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

  /* ── Capability sync ─────────────────────────── */

  const syncCapabilities = useCallback(() => {
    if (typeof window === 'undefined') return;
    setQuality(detectQuality());
    setDeviceMemory(getDeviceMemory());
    setMobileLikeDevice(isMobileLikeDevice());
    setIsCompactViewport(window.matchMedia('(max-width: 960px)').matches);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncRM = () => setPrefersReduced(rmq.matches);
    const syncVis = () => setPageVisible(document.visibilityState !== 'hidden');

    syncRM();
    syncCapabilities();
    syncVis();
    setWebglSupported(supportsWebGL());
    setMounted(true);

    window.addEventListener('resize', syncCapabilities);
    window.addEventListener('orientationchange', syncCapabilities);
    document.addEventListener('visibilitychange', syncVis);
    if ('addEventListener' in rmq) rmq.addEventListener('change', syncRM);

    return () => {
      window.removeEventListener('resize', syncCapabilities);
      window.removeEventListener('orientationchange', syncCapabilities);
      document.removeEventListener('visibilitychange', syncVis);
      if ('removeEventListener' in rmq)
        rmq.removeEventListener('change', syncRM);
    };
  }, [syncCapabilities]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const oliveWindow = window as Window & {
      __OLIVE_FORCE_STABILITY_ASSIST__?: boolean;
    };
    if (oliveWindow.__OLIVE_FORCE_STABILITY_ASSIST__) {
      setStabilityAssistActive(true);
    }
  }, []);

  useEffect(
    () => () => {
      if (
        interactionTimeoutRef.current !== null &&
        typeof window !== 'undefined'
      ) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
    },
    []
  );

  /* ── Derived visual mode ─────────────────────── */

  const visualMode = useMemo<HeroVisualMode>(() => {
    if (!webglSupported) return 'fallback';
    if (prefersReduced) return 'reduced';
    return quality === 'low' ? 'lite' : 'immersive';
  }, [prefersReduced, quality, webglSupported]);

  const effectiveVisualMode = useMemo<HeroVisualMode>(() => {
    if (visualMode !== 'immersive') return visualMode;
    return stabilityAssistActive ? 'lite' : visualMode;
  }, [stabilityAssistActive, visualMode]);

  const shouldRenderCanvas =
    effectiveVisualMode === 'immersive' || effectiveVisualMode === 'lite';

  useEffect(() => {
    if (shouldRenderCanvas) return;
    setSceneReady(false);
    setInteractionState('idle');
    setStabilityAssistActive(false);
  }, [shouldRenderCanvas]);

  /* ── Scene profile ───────────────────────────── */

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

  const baseProfile = useMemo(
    () => getSceneProfile(runtimeQuality, effectiveVisualMode),
    [effectiveVisualMode, runtimeQuality]
  );
  const sceneProfile = useMemo(() => {
    if (!mobileOptimized) return baseProfile;
    return optimizeSceneProfileForMobile(baseProfile, {
      lowMemory: lowMemoryDevice,
      compactViewport: isCompactViewport,
    });
  }, [baseProfile, isCompactViewport, lowMemoryDevice, mobileOptimized]);

  const heroSceneState = shouldRenderCanvas
    ? sceneReady
      ? 'interactive'
      : 'booting'
    : effectiveVisualMode === 'fallback'
      ? 'fallback'
      : 'ambient';

  /* ── Interaction ─────────────────────────────── */

  const triggerPulse = useCallback(() => {
    if (!shouldRenderCanvas || typeof window === 'undefined') return;
    burstLockUntilRef.current = window.performance.now() + 420;
    setInteractionPulse(c => c + 1);
    setInteractionState('burst');

    if (interactionTimeoutRef.current !== null)
      window.clearTimeout(interactionTimeoutRef.current);

    interactionTimeoutRef.current = window.setTimeout(() => {
      setInteractionState('idle');
      interactionTimeoutRef.current = null;
    }, 820);
  }, [shouldRenderCanvas]);

  const handleInteractionStateChange = useCallback(
    (next: 'idle' | 'engaged' | 'burst') => {
      if (
        typeof window !== 'undefined' &&
        next !== 'burst' &&
        window.performance.now() < burstLockUntilRef.current
      ) {
        return;
      }

      setInteractionState(cur =>
        cur === 'burst' && next === 'engaged' ? cur : next
      );
    },
    []
  );

  /* ── Render ──────────────────────────────────── */

  const accentRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.accent), []);
  const secondaryRgb = useMemo(
    () => hexToRgbString(SCENE_PALETTE.secondary),
    []
  );
  const tertiaryRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.tertiary), []);
  const warmRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.warm), []);
  const highlightRgb = useMemo(
    () => hexToRgbString(SCENE_PALETTE.highlight),
    []
  );
  const shadowRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.shadow), []);
  const mistRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.mist), []);
  const emberRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.ember), []);
  const signalRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.signal), []);
  const bloomRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.bloom), []);
  const jadeRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.jade), []);
  const orchidRgb = useMemo(() => hexToRgbString(SCENE_PALETTE.orchid), []);

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
          '--universe-warm-rgb': warmRgb,
          '--universe-highlight-rgb': highlightRgb,
          '--universe-shadow-rgb': shadowRgb,
          '--universe-mist-rgb': mistRgb,
          '--universe-ember-rgb': emberRgb,
          '--universe-signal-rgb': signalRgb,
          '--universe-bloom-rgb': bloomRgb,
          '--universe-jade-rgb': jadeRgb,
          '--universe-orchid-rgb': orchidRgb,
        } as CSSProperties
      }
      onPointerDownCapture={triggerPulse}
    >
      {/* Atmospheric layers behind the canvas */}
      <div className="universe-stage-deephaze" aria-hidden="true" />
      <div className="universe-stage-aurora-glow" aria-hidden="true" />
      <div className="universe-stage-specular-veil" aria-hidden="true" />
      <div className="universe-stage-plasma-corona" aria-hidden="true" />
      <div className="universe-stage-ion-storm" aria-hidden="true" />
      <div className="universe-stage-lumen-weave" aria-hidden="true" />
      <div className="universe-stage-temperature" aria-hidden="true" />
      <div className="universe-stage-aura" aria-hidden="true" />
      <div className="universe-stage-nebula" aria-hidden="true" />
      <div className="universe-stage-silk-haze" aria-hidden="true" />
      <div className="universe-stage-drafting-grid" aria-hidden="true" />
      <div className="universe-stage-signal-frame" aria-hidden="true" />
      <div className="universe-stage-aperture" aria-hidden="true" />

      {/* 3D Canvas or fallback */}
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

      {/* Atmospheric layers on top of the canvas */}
      <div className="universe-stage-vignette" aria-hidden="true" />
      <div className="universe-stage-film-grain" aria-hidden="true" />
      <div className="universe-stage-scanlines" aria-hidden="true" />

      {/* Accessible content — screen readers only */}
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
      </div>
    </section>
  );
}
