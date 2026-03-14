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
import { copyText } from '@/utils/clipboard';
import { isShareSupported, share as shareContent } from '@/utils/share';
import { withBasePath } from '@/utils/helpers';
import {
  CHAPTER_ATMOSPHERES,
  CHAPTERS,
  detectQuality,
  getDeviceMemory,
  getSceneProfile,
  HERO_MODE_LABELS,
  HERO_MODE_NOTES,
  hexToRgbString,
  isMobileLikeDevice,
  optimizeSceneProfileForMobile,
  prefersReducedMotion,
  SCENE_LENS_ORDER,
  supportsWebGL,
  type ChapterDef,
  type HeroVisualMode,
  type QualityTier,
  type SceneLensMode,
} from './olive-universe-config';

const preloadOliveUniverseCanvas = () => import('./OliveUniverseCanvas');
const OliveUniverseCanvas = lazy(preloadOliveUniverseCanvas);
const MOBILE_PANEL_ID = 'olive-universe-mobile-panel';
const MOBILE_PANEL_QUERY = '(max-width: 960px)';
const MOTION_PREFERENCE_KEY = 'olive-universe-motion-preference';
const RENDER_PROFILE_KEY = 'olive-universe-render-profile';
const SCENE_LENS_KEY = 'olive-universe-scene-lens';
const AUTO_TOUR_INTERVAL_MS = 2800;
const INTERACTION_BURST_DURATION_MS = 1600;
const SCENE_HANDOFF_DURATION_MS = {
  primed: 1280,
  warming: 1560,
} as const;
const HERO_SCENE_QUERY_KEYS = ['scene', 'hero', 'chapter'] as const;
const HERO_SCENE_HASH_PREFIX = '#hero-';
const GUIDED_TOUR_SPEED_ORDER = ['slow', 'standard', 'fast'] as const;
const RENDER_PROFILE_ORDER = ['adaptive', 'cinematic', 'stable'] as const;

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type SceneRuntimeState =
  | 'staging'
  | 'booting'
  | 'interactive'
  | 'ambient'
  | 'fallback';

type ScenePreloadState = 'idle' | 'warming' | 'ready';

type MotionPreference = 'auto' | 'immersive' | 'calm';

type GuidedTourSpeed = 'slow' | 'standard' | 'fast';

type RenderProfile = (typeof RENDER_PROFILE_ORDER)[number];

type ChapterNavigationSource = 'manual' | 'tour';

const GUIDED_TOUR_SPEEDS: Record<
  GuidedTourSpeed,
  { label: string; intervalMs: number; cadenceLabel: string }
> = {
  slow: { label: 'Slow', intervalMs: 4200, cadenceLabel: '4.2s per scene' },
  standard: {
    label: 'Standard',
    intervalMs: AUTO_TOUR_INTERVAL_MS,
    cadenceLabel: '2.8s per scene',
  },
  fast: { label: 'Fast', intervalMs: 1800, cadenceLabel: '1.8s per scene' },
};

const RENDER_PROFILE_OPTIONS: Record<
  RenderProfile,
  {
    label: string;
    statusLabel: string;
    description: string;
    note: string;
  }
> = {
  adaptive: {
    label: 'Adaptive',
    statusLabel: 'Device-aware auto',
    description: 'Follow device telemetry',
    note: 'Adaptive render profile is active, balancing detail and responsiveness around your device.',
  },
  cinematic: {
    label: 'Cinematic',
    statusLabel: 'High detail focus',
    description: 'Favor bloom and particle depth',
    note: 'Cinematic render profile is active, favoring denser particles, bloom, and bigger transitions.',
  },
  stable: {
    label: 'Stable',
    statusLabel: 'Smooth playback',
    description: 'Keep the lighter 3D stack',
    note: 'Stable render profile is active, keeping the lighter 3D stack on for smoother playback across every chapter.',
  },
};

const SCENE_LENS_OPTIONS: Record<
  SceneLensMode,
  {
    label: string;
    statusLabel: string;
    description: string;
    note: string;
    queuedNote: string;
  }
> = {
  glide: {
    label: 'Glide',
    statusLabel: 'Wide cinematic drift',
    description: 'Softer camera movement',
    note: 'Glide lens is active, keeping the camera wide and polished so each chapter can breathe before the next hit lands.',
    queuedNote:
      'Glide lens is active and will steer the camera the moment immersive scenes are live.',
  },
  orbit: {
    label: 'Orbit',
    statusLabel: 'Layered orbit focus',
    description: 'Circle the chapter core',
    note: 'Orbit lens is active, giving the camera a broader orbital sweep around the active chapter for a more exploratory feel.',
    queuedNote:
      'Orbit lens is active and will add more lateral camera motion once immersive scenes are live.',
  },
  surge: {
    label: 'Surge',
    statusLabel: 'Tight aggressive push',
    description: 'Punch into transitions',
    note: 'Surge lens is active, pushing the camera harder through bursts, handoffs, and chapter jumps for a more aggressive cinematic pace.',
    queuedNote:
      'Surge lens is active and will tighten the camera as soon as immersive scenes are live.',
  },
};

function isMotionPreference(value: string | null): value is MotionPreference {
  return value === 'auto' || value === 'immersive' || value === 'calm';
}

function isRenderProfile(value: string | null): value is RenderProfile {
  return Boolean(
    value && RENDER_PROFILE_ORDER.some(profile => profile === value)
  );
}

function isSceneLensMode(value: string | null): value is SceneLensMode {
  return Boolean(value && SCENE_LENS_ORDER.some(lens => lens === value));
}

function isChapterId(value: string | null): value is ChapterDef['id'] {
  return Boolean(value && CHAPTERS.some(chapter => chapter.id === value));
}

function getRequestedHeroChapter(): ChapterDef['id'] | null {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  for (const key of HERO_SCENE_QUERY_KEYS) {
    const value = url.searchParams.get(key);
    if (isChapterId(value)) {
      return value;
    }
  }

  const hashScene = url.hash.startsWith(HERO_SCENE_HASH_PREFIX)
    ? url.hash.slice(HERO_SCENE_HASH_PREFIX.length)
    : null;

  return isChapterId(hashScene) ? hashScene : null;
}

function shouldIgnoreHeroInteractiveTarget(
  target: EventTarget | null,
  heroInteractiveRoot?: HTMLElement | null
) {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) {
    return true;
  }

  if (heroInteractiveRoot?.contains(target)) {
    return Boolean(
      target.closest('input, textarea, select, [contenteditable="true"]')
    );
  }

  return Boolean(
    target.closest(
      'input, textarea, select, button, a[href], [role="button"], [role="link"], [contenteditable="true"]'
    )
  );
}

function shouldIgnoreSceneInteractionTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      '.universe-content, .universe-story-panel, .universe-progress, .universe-mobile-dock'
    )
  );
}

type StaticBackdropMode =
  | Extract<HeroVisualMode, 'reduced' | 'fallback'>
  | 'loading';

function StaticBackdrop({ mode }: { mode: StaticBackdropMode }) {
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

function ChapterOverlay({
  ch,
  visible,
  isPrimary,
}: {
  ch: ChapterDef;
  visible: boolean;
  isPrimary?: boolean;
}) {
  const HeadingTag = isPrimary ? 'h1' : 'h2';

  return (
    <section
      className={`universe-chapter ${visible ? 'is-visible' : 'is-hidden'}`}
      aria-hidden={!visible}
      aria-labelledby={`${ch.id}-title`}
    >
      <div className="universe-content">
        <span className="universe-kicker" style={{ color: ch.accent }}>
          {ch.kicker}
        </span>
        <HeadingTag id={`${ch.id}-title`} className="universe-title">
          {ch.title.map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </HeadingTag>
        <p className="universe-copy">{ch.copy}</p>
        {ch.metrics && (
          <div className="universe-metrics">
            {ch.metrics.map(metric => (
              <span key={metric} className="universe-metric-chip">
                {metric}
              </span>
            ))}
          </div>
        )}
        <div className="universe-ctas">
          {ch.ctas.map((cta, i) => (
            <a
              key={i}
              href={cta.href}
              className={
                cta.primary ? 'universe-btn-primary' : 'universe-btn-secondary'
              }
              tabIndex={visible ? undefined : -1}
            >
              {cta.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function OliveUniverse() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const shareLinkRef = useRef<HTMLAnchorElement>(null);
  const deepLinkHandledRef = useRef(false);
  const previousChapterIdRef = useRef<ChapterDef['id']>(CHAPTERS[0].id);
  const handoffTimeoutRef = useRef<number | null>(null);
  const interactionBurstTimeoutRef = useRef<number | null>(null);
  const scenePreloadRequestedRef = useRef(false);
  const touchGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
  } | null>(null);
  const progressRef = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [quality, setQuality] = useState<QualityTier>('medium');
  const [motionPreference, setMotionPreference] =
    useState<MotionPreference>('auto');
  const [renderProfile, setRenderProfile] = useState<RenderProfile>('adaptive');
  const [sceneLens, setSceneLens] = useState<SceneLensMode>('glide');
  const [mounted, setMounted] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [sceneActive, setSceneActive] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [sceneBootReady, setSceneBootReady] = useState(false);
  const [sceneResolved, setSceneResolved] = useState(false);
  const [nativeShareSupported, setNativeShareSupported] = useState(false);
  const [deviceMemory, setDeviceMemory] = useState<number | null>(null);
  const [mobileLikeDevice, setMobileLikeDevice] = useState(false);
  const [touchCapable, setTouchCapable] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [stabilityAssistActive, setStabilityAssistActive] = useState(false);
  const [guidedTourPlaying, setGuidedTourPlaying] = useState(false);
  const [guidedTourSpeed, setGuidedTourSpeed] =
    useState<GuidedTourSpeed>('standard');
  const [sceneHandoffActive, setSceneHandoffActive] = useState(false);
  const [sceneHandoffCycle, setSceneHandoffCycle] = useState(0);
  const [sceneReadyCount, setSceneReadyCount] = useState(0);
  const [sceneProgressPercent, setSceneProgressPercent] = useState(0);
  const [scenePreloadState, setScenePreloadState] =
    useState<ScenePreloadState>('idle');
  const [interactionBurstActive, setInteractionBurstActive] = useState(false);
  const [interactionBurstCycle, setInteractionBurstCycle] = useState(0);
  const [shareState, setShareState] = useState<
    'idle' | 'copied' | 'shared' | 'error'
  >('idle');

  const syncDeviceCapabilities = useCallback(() => {
    if (typeof window === 'undefined') return;

    const coarseTouchSession =
      window.matchMedia('(pointer: coarse)').matches ||
      (navigator.maxTouchPoints ?? 0) > 0;

    setQuality(detectQuality());
    setTouchCapable(coarseTouchSession);
    setDeviceMemory(getDeviceMemory());
    setMobileLikeDevice(isMobileLikeDevice());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncReducedMotion = () => setPrefersReduced(motionQuery.matches);

    syncReducedMotion();
    syncDeviceCapabilities();
    setWebglSupported(supportsWebGL());
    setNativeShareSupported(isShareSupported());

    try {
      const storedMotionPreference = window.localStorage.getItem(
        MOTION_PREFERENCE_KEY
      );
      if (isMotionPreference(storedMotionPreference)) {
        setMotionPreference(storedMotionPreference);
      }

      const storedRenderProfile =
        window.localStorage.getItem(RENDER_PROFILE_KEY);
      if (isRenderProfile(storedRenderProfile)) {
        setRenderProfile(storedRenderProfile);
      }

      const storedSceneLens = window.localStorage.getItem(SCENE_LENS_KEY);
      if (isSceneLensMode(storedSceneLens)) {
        setSceneLens(storedSceneLens);
      }
    } catch {
      // Ignore storage access failures; the hero can still run with in-memory state.
    }

    setMounted(true);

    if ('addEventListener' in motionQuery) {
      motionQuery.addEventListener('change', syncReducedMotion);
      return () => motionQuery.removeEventListener('change', syncReducedMotion);
    }

    const legacyMotionQuery = motionQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    legacyMotionQuery.addListener?.(syncReducedMotion);
    return () => legacyMotionQuery.removeListener?.(syncReducedMotion);
  }, [syncDeviceCapabilities]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewportQuery = window.matchMedia(MOBILE_PANEL_QUERY);
    const syncCompactViewport = () => {
      const compactViewport = viewportQuery.matches;

      setIsCompactViewport(compactViewport);
      if (!compactViewport) {
        setMobilePanelOpen(false);
      }
    };

    syncCompactViewport();

    if ('addEventListener' in viewportQuery) {
      viewportQuery.addEventListener('change', syncCompactViewport);
      return () =>
        viewportQuery.removeEventListener('change', syncCompactViewport);
    }

    const legacyViewportQuery = viewportQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    legacyViewportQuery.addListener?.(syncCompactViewport);
    return () => legacyViewportQuery.removeListener?.(syncCompactViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

    syncDeviceCapabilities();
    window.addEventListener('resize', syncDeviceCapabilities);
    window.addEventListener('orientationchange', syncDeviceCapabilities);

    if ('addEventListener' in coarsePointerQuery) {
      coarsePointerQuery.addEventListener('change', syncDeviceCapabilities);

      return () => {
        window.removeEventListener('resize', syncDeviceCapabilities);
        window.removeEventListener('orientationchange', syncDeviceCapabilities);
        coarsePointerQuery.removeEventListener(
          'change',
          syncDeviceCapabilities
        );
      };
    }

    const legacyCoarsePointerQuery = coarsePointerQuery as MediaQueryList & {
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    legacyCoarsePointerQuery.addListener?.(syncDeviceCapabilities);

    return () => {
      window.removeEventListener('resize', syncDeviceCapabilities);
      window.removeEventListener('orientationchange', syncDeviceCapabilities);
      legacyCoarsePointerQuery.removeListener?.(syncDeviceCapabilities);
    };
  }, [syncDeviceCapabilities]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    try {
      if (motionPreference === 'auto') {
        window.localStorage.removeItem(MOTION_PREFERENCE_KEY);
        return;
      }

      window.localStorage.setItem(MOTION_PREFERENCE_KEY, motionPreference);
    } catch {
      // Ignore storage access failures; the live session state is still enough.
    }
  }, [mounted, motionPreference]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    try {
      if (renderProfile === 'adaptive') {
        window.localStorage.removeItem(RENDER_PROFILE_KEY);
        return;
      }

      window.localStorage.setItem(RENDER_PROFILE_KEY, renderProfile);
    } catch {
      // Ignore storage access failures; the live session state is still enough.
    }
  }, [mounted, renderProfile]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    try {
      if (sceneLens === 'glide') {
        window.localStorage.removeItem(SCENE_LENS_KEY);
        return;
      }

      window.localStorage.setItem(SCENE_LENS_KEY, sceneLens);
    } catch {
      // Ignore storage access failures; the live session state is still enough.
    }
  }, [mounted, sceneLens]);

  useEffect(() => {
    if (shareState === 'idle' || typeof window === 'undefined') return;

    const timeoutId = window.setTimeout(
      () => setShareState('idle'),
      shareState === 'copied' ? 2200 : 3200
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [shareState]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !wrapperRef.current)
      return;

    const node = wrapperRef.current;
    const syncPageVisibility = () => {
      setPageVisible(document.visibilityState !== 'hidden');
    };

    syncPageVisibility();

    const observer = new IntersectionObserver(
      entries => {
        setSceneActive(entries[0]?.isIntersecting ?? true);
      },
      {
        rootMargin: '20% 0px 20% 0px',
      }
    );

    observer.observe(node);
    document.addEventListener('visibilitychange', syncPageVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPageVisibility);
    };
  }, [mounted]);

  const visualMode = useMemo<HeroVisualMode>(() => {
    if (!webglSupported) return 'fallback';

    const prefersCalmPresentation =
      motionPreference === 'calm' ||
      (motionPreference === 'auto' && prefersReduced);

    if (prefersCalmPresentation) return 'reduced';
    if (quality === 'low') return 'lite';
    return 'immersive';
  }, [motionPreference, prefersReduced, quality, webglSupported]);

  const effectiveVisualMode = useMemo<HeroVisualMode>(() => {
    if (!webglSupported) return 'fallback';
    if (renderProfile === 'cinematic') return 'immersive';
    if (renderProfile === 'stable') return 'lite';
    return visualMode;
  }, [renderProfile, visualMode, webglSupported]);

  const shouldRenderCanvas =
    effectiveVisualMode === 'immersive' || effectiveVisualMode === 'lite';

  useEffect(() => {
    if (!shouldRenderCanvas && stabilityAssistActive) {
      setStabilityAssistActive(false);
    }
  }, [shouldRenderCanvas, stabilityAssistActive]);

  useEffect(() => {
    if (!shouldRenderCanvas) {
      if (handoffTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(handoffTimeoutRef.current);
        handoffTimeoutRef.current = null;
      }

      previousChapterIdRef.current = CHAPTERS[chapter]?.id ?? CHAPTERS[0].id;
      setSceneHandoffActive(false);
      setSceneReadyCount(0);
    }
  }, [chapter, shouldRenderCanvas]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    return () => {
      if (handoffTimeoutRef.current !== null) {
        window.clearTimeout(handoffTimeoutRef.current);
      }

      if (interactionBurstTimeoutRef.current !== null) {
        window.clearTimeout(interactionBurstTimeoutRef.current);
      }
    };
  }, []);

  const requestScenePreload = useCallback(() => {
    if (
      typeof window === 'undefined' ||
      !webglSupported ||
      scenePreloadRequestedRef.current
    ) {
      return;
    }

    scenePreloadRequestedRef.current = true;
    setScenePreloadState(currentState =>
      currentState === 'ready' ? currentState : 'warming'
    );

    void preloadOliveUniverseCanvas()
      .then(() => {
        setScenePreloadState('ready');
      })
      .catch(() => {
        scenePreloadRequestedRef.current = false;
        setScenePreloadState('idle');
      });
  }, [webglSupported]);

  useEffect(() => {
    if (!sceneResolved) {
      return;
    }

    setScenePreloadState('ready');
  }, [sceneResolved]);

  useEffect(() => {
    if (
      !mounted ||
      typeof window === 'undefined' ||
      !webglSupported ||
      scenePreloadState === 'ready' ||
      scenePreloadRequestedRef.current ||
      (!sceneActive && !touchCapable && !isCompactViewport)
    ) {
      return;
    }

    let cancelled = false;
    let timeoutId = 0;
    let idleId = 0;
    const idleWindow = window as IdleCapableWindow;
    const delay = touchCapable || isCompactViewport ? 260 : 720;

    const beginPreload = () => {
      if (cancelled) {
        return;
      }

      requestScenePreload();
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(beginPreload, {
        timeout: touchCapable || isCompactViewport ? 420 : 900,
      });
    } else {
      timeoutId = window.setTimeout(beginPreload, delay);
    }

    return () => {
      cancelled = true;
      idleWindow.cancelIdleCallback?.(idleId);
      window.clearTimeout(timeoutId);
    };
  }, [
    isCompactViewport,
    mounted,
    requestScenePreload,
    sceneActive,
    scenePreloadState,
    touchCapable,
    webglSupported,
  ]);

  const ensureImmersiveSceneAccess = useCallback(() => {
    if (
      webglSupported &&
      effectiveVisualMode !== 'immersive' &&
      effectiveVisualMode !== 'lite'
    ) {
      setMotionPreference('immersive');
    }
  }, [effectiveVisualMode, webglSupported]);

  const scrollToChapter = useCallback(
    (chapterIndex: number, behaviorOverride?: ScrollBehavior) => {
      if (!wrapperRef.current || typeof window === 'undefined') return;

      const wrapperTop =
        window.scrollY + wrapperRef.current.getBoundingClientRect().top;
      const total = wrapperRef.current.offsetHeight - window.innerHeight;
      const targetTop = wrapperTop + total * CHAPTERS[chapterIndex].range[0];

      window.scrollTo({
        top: targetTop,
        behavior:
          behaviorOverride ?? (prefersReducedMotion() ? 'auto' : 'smooth'),
      });
    },
    []
  );

  const navigateToChapter = useCallback(
    (
      chapterIndex: number,
      behaviorOverride?: ScrollBehavior,
      source: ChapterNavigationSource = 'manual'
    ) => {
      requestScenePreload();
      ensureImmersiveSceneAccess();

      const chapterDef = CHAPTERS[chapterIndex] ?? CHAPTERS[0];

      if (source === 'manual' && guidedTourPlaying) {
        setGuidedTourPlaying(false);
      }

      if (source === 'manual' && isCompactViewport) {
        setMobilePanelOpen(false);
      }

      progressRef.current = chapterDef.range[0];
      setChapter(chapterIndex);
      setSceneProgressPercent(0);
      scrollToChapter(chapterIndex, behaviorOverride ?? 'auto');
    },
    [
      ensureImmersiveSceneAccess,
      guidedTourPlaying,
      isCompactViewport,
      requestScenePreload,
      scrollToChapter,
    ]
  );

  useEffect(() => {
    if (
      !mounted ||
      typeof window === 'undefined' ||
      !guidedTourPlaying ||
      !pageVisible
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigateToChapter(
        chapter >= CHAPTERS.length - 1 ? 0 : chapter + 1,
        undefined,
        'tour'
      );
    }, GUIDED_TOUR_SPEEDS[guidedTourSpeed].intervalMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    chapter,
    guidedTourPlaying,
    guidedTourSpeed,
    mounted,
    navigateToChapter,
    pageVisible,
  ]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !shouldRenderCanvas) {
      setSceneBootReady(false);
      setSceneResolved(false);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let timeoutId = 0;
    let idleId = 0;
    const idleWindow = window as IdleCapableWindow;

    setSceneResolved(false);

    rafId = window.requestAnimationFrame(() => {
      const beginSceneBoot = () => {
        void preloadOliveUniverseCanvas();
        if (!cancelled) setSceneBootReady(true);
      };

      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(beginSceneBoot, {
          timeout: 480,
        });
        return;
      }

      timeoutId = window.setTimeout(beginSceneBoot, 96);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      idleWindow.cancelIdleCallback?.(idleId);
      window.clearTimeout(timeoutId);
    };
  }, [mounted, shouldRenderCanvas]);

  useEffect(() => {
    if (
      !mounted ||
      typeof window === 'undefined' ||
      deepLinkHandledRef.current
    ) {
      return;
    }

    const requestedChapterId = getRequestedHeroChapter();
    if (!requestedChapterId) {
      deepLinkHandledRef.current = true;
      return;
    }

    const requestedIndex = CHAPTERS.findIndex(
      chapterDef => chapterDef.id === requestedChapterId
    );

    if (requestedIndex < 0) {
      deepLinkHandledRef.current = true;
      return;
    }

    deepLinkHandledRef.current = true;

    if (requestedIndex === 0) {
      progressRef.current = CHAPTERS[0].range[0];
      setSceneProgressPercent(0);
      setChapter(0);
      return;
    }

    requestScenePreload();
    ensureImmersiveSceneAccess();
    progressRef.current = CHAPTERS[requestedIndex]?.range[0] ?? 0;
    setSceneProgressPercent(0);
    setChapter(requestedIndex);

    const rafId = window.requestAnimationFrame(() => {
      scrollToChapter(requestedIndex, 'auto');
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [
    ensureImmersiveSceneAccess,
    mounted,
    requestScenePreload,
    scrollToChapter,
  ]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const lastChapterIndex = CHAPTERS.length - 1;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !sceneActive ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        shouldIgnoreHeroInteractiveTarget(
          event.target ?? document.activeElement,
          wrapperRef.current
        )
      ) {
        return;
      }

      let targetChapter = chapter;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          targetChapter = Math.min(lastChapterIndex, chapter + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          targetChapter = Math.max(0, chapter - 1);
          break;
        case 'Home':
          targetChapter = 0;
          break;
        case 'End':
          targetChapter = lastChapterIndex;
          break;
        default:
          return;
      }

      if (targetChapter === chapter) {
        return;
      }

      event.preventDefault();
      navigateToChapter(targetChapter);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [chapter, mounted, navigateToChapter, sceneActive]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !wrapperRef.current) {
      return;
    }

    const node = wrapperRef.current;
    const hasPreviousChapter = chapter > 0;
    const hasNextChapter = chapter < CHAPTERS.length - 1;
    const swipeDistance = 60;
    const swipeDominanceRatio = 1.2;
    const swipeTimeout = 900;

    const clearGesture = () => {
      touchGestureRef.current = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== 'touch' ||
        shouldIgnoreHeroInteractiveTarget(event.target) ||
        shouldIgnoreSceneInteractionTarget(event.target)
      ) {
        return;
      }

      requestScenePreload();

      touchGestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const gesture = touchGestureRef.current;

      if (
        !gesture ||
        event.pointerType !== 'touch' ||
        event.pointerId !== gesture.pointerId
      ) {
        return;
      }

      clearGesture();

      if (
        shouldIgnoreHeroInteractiveTarget(event.target) ||
        shouldIgnoreSceneInteractionTarget(event.target)
      ) {
        return;
      }

      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      const elapsed = performance.now() - gesture.startTime;
      const horizontalSwipe =
        Math.abs(deltaX) >= swipeDistance &&
        Math.abs(deltaX) > Math.abs(deltaY) * swipeDominanceRatio;
      const tapGesture = Math.abs(deltaX) < 18 && Math.abs(deltaY) < 18;

      if (elapsed > swipeTimeout) {
        return;
      }

      if (horizontalSwipe) {
        if (deltaX < 0 && hasNextChapter) {
          navigateToChapter(chapter + 1);
          return;
        }

        if (deltaX > 0 && hasPreviousChapter) {
          navigateToChapter(chapter - 1);
          return;
        }

        return;
      }

      if (shouldRenderCanvas && tapGesture) {
        setInteractionBurstCycle(currentCycle => currentCycle + 1);
        setInteractionBurstActive(true);

        if (interactionBurstTimeoutRef.current !== null) {
          window.clearTimeout(interactionBurstTimeoutRef.current);
        }

        interactionBurstTimeoutRef.current = window.setTimeout(() => {
          setInteractionBurstActive(false);
          interactionBurstTimeoutRef.current = null;
        }, INTERACTION_BURST_DURATION_MS);
      }
    };

    node.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', clearGesture);

    return () => {
      node.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', clearGesture);
    };
  }, [
    chapter,
    mounted,
    navigateToChapter,
    requestScenePreload,
    shouldRenderCanvas,
  ]);

  const triggerInteractionBurst = useCallback(() => {
    if (!shouldRenderCanvas || typeof window === 'undefined') {
      return;
    }

    requestScenePreload();
    setInteractionBurstCycle(currentCycle => currentCycle + 1);
    setInteractionBurstActive(true);

    if (interactionBurstTimeoutRef.current !== null) {
      window.clearTimeout(interactionBurstTimeoutRef.current);
    }

    interactionBurstTimeoutRef.current = window.setTimeout(() => {
      setInteractionBurstActive(false);
      interactionBurstTimeoutRef.current = null;
    }, INTERACTION_BURST_DURATION_MS);
  }, [requestScenePreload, shouldRenderCanvas]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !wrapperRef.current) {
      return;
    }

    const node = wrapperRef.current;

    const handleClick = (event: MouseEvent) => {
      if (
        !shouldRenderCanvas ||
        shouldIgnoreHeroInteractiveTarget(event.target, wrapperRef.current) ||
        shouldIgnoreSceneInteractionTarget(event.target)
      ) {
        return;
      }

      triggerInteractionBurst();
    };

    node.addEventListener('click', handleClick);

    return () => {
      node.removeEventListener('click', handleClick);
    };
  }, [mounted, shouldRenderCanvas, triggerInteractionBurst]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    let frameId = 0;

    const syncHeroProgress = () => {
      frameId = 0;

      if (!wrapperRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      progressRef.current =
        total > 0 ? Math.max(0, Math.min(1, -rect.top / total)) : 0;

      let nextChapterIndex = 0;
      for (let i = CHAPTERS.length - 1; i >= 0; i--)
        if (progressRef.current >= CHAPTERS[i].range[0] - 0.04) {
          nextChapterIndex = i;
          break;
        }

      const currentChapterDef = CHAPTERS[nextChapterIndex] ?? CHAPTERS[0];
      const [chapterStart, chapterEnd] = currentChapterDef.range;
      const sceneProgress =
        chapterEnd > chapterStart
          ? Math.max(
              0,
              Math.min(
                1,
                (progressRef.current - chapterStart) /
                  (chapterEnd - chapterStart)
              )
            )
          : progressRef.current >= chapterStart
            ? 1
            : 0;
      const nextSceneProgressPercent = Math.round(sceneProgress * 100);

      if (
        nextChapterIndex > 0 &&
        webglSupported &&
        prefersReduced &&
        motionPreference === 'auto'
      ) {
        setMotionPreference('immersive');
      }

      setSceneProgressPercent(currentProgress =>
        currentProgress === nextSceneProgressPercent
          ? currentProgress
          : nextSceneProgressPercent
      );

      setChapter(currentChapter =>
        currentChapter === nextChapterIndex ? currentChapter : nextChapterIndex
      );
    };

    const queueHeroProgressSync = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(syncHeroProgress);
    };

    queueHeroProgressSync();

    window.addEventListener('scroll', queueHeroProgressSync, {
      passive: true,
    });
    window.addEventListener('resize', queueHeroProgressSync);
    window.addEventListener('orientationchange', queueHeroProgressSync);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', queueHeroProgressSync);
      window.removeEventListener('resize', queueHeroProgressSync);
      window.removeEventListener('orientationchange', queueHeroProgressSync);
    };
  }, [mounted, motionPreference, prefersReduced, webglSupported]);

  const profileQuality: QualityTier =
    renderProfile === 'cinematic'
      ? 'high'
      : renderProfile === 'stable'
        ? 'low'
        : quality;
  const runtimeQuality: QualityTier = stabilityAssistActive
    ? 'low'
    : profileQuality;
  const runtimeSceneMode: HeroVisualMode =
    stabilityAssistActive && effectiveVisualMode === 'immersive'
      ? 'lite'
      : effectiveVisualMode;
  const activeChapter = CHAPTERS[chapter] ?? CHAPTERS[0];
  const activeAtmosphere = CHAPTER_ATMOSPHERES[activeChapter.id];
  const baseSceneProfile = useMemo(
    () => getSceneProfile(runtimeQuality, runtimeSceneMode),
    [runtimeQuality, runtimeSceneMode]
  );
  const lowMemoryDevice =
    deviceMemory !== null
      ? deviceMemory <= 4
      : mobileLikeDevice && quality === 'low';
  const shouldUseOptimizedMobile3D =
    touchCapable || isCompactViewport || mobileLikeDevice || lowMemoryDevice;
  const sceneProfile = useMemo(() => {
    if (!shouldUseOptimizedMobile3D) {
      return baseSceneProfile;
    }

    return optimizeSceneProfileForMobile(baseSceneProfile, {
      preservePostFx: renderProfile === 'cinematic' && !lowMemoryDevice,
      lowMemory: lowMemoryDevice,
      compactViewport: isCompactViewport,
    });
  }, [
    baseSceneProfile,
    isCompactViewport,
    lowMemoryDevice,
    renderProfile,
    shouldUseOptimizedMobile3D,
  ]);
  const sceneSharePath = useMemo(
    () =>
      withBasePath(
        `/?scene=${activeChapter.id}${HERO_SCENE_HASH_PREFIX}${activeChapter.id}`
      ),
    [activeChapter.id]
  );
  const sceneShareHref = useMemo(() => {
    if (typeof window === 'undefined') return sceneSharePath;
    return new URL(sceneSharePath, window.location.origin).toString();
  }, [sceneSharePath]);
  const accentRgb = useMemo(
    () => hexToRgbString(activeChapter.accent),
    [activeChapter.accent]
  );
  const atmosphereRgb = useMemo(
    () => hexToRgbString(activeAtmosphere.hazeColor),
    [activeAtmosphere.hazeColor]
  );
  const atmosphereSecondaryRgb = useMemo(
    () => hexToRgbString(activeAtmosphere.keyLightColor),
    [activeAtmosphere.keyLightColor]
  );
  const previousChapter = chapter > 0 ? CHAPTERS[chapter - 1] : null;
  const nextChapter =
    chapter < CHAPTERS.length - 1 ? CHAPTERS[chapter + 1] : null;
  const guidedTourSpeedConfig = GUIDED_TOUR_SPEEDS[guidedTourSpeed];
  const renderProfileConfig = RENDER_PROFILE_OPTIONS[renderProfile];
  const sceneLensConfig = SCENE_LENS_OPTIONS[sceneLens];
  const sceneState = useMemo<SceneRuntimeState>(() => {
    if (!shouldRenderCanvas) {
      return effectiveVisualMode === 'fallback' ? 'fallback' : 'ambient';
    }

    if (!sceneBootReady) return 'staging';
    if (!sceneResolved) return 'booting';
    return 'interactive';
  }, [effectiveVisualMode, sceneBootReady, sceneResolved, shouldRenderCanvas]);
  const sceneReadyTotal = CHAPTERS.length;
  const sceneCacheState = !shouldRenderCanvas
    ? 'idle'
    : sceneReadyCount >= sceneReadyTotal
      ? 'primed'
      : 'warming';
  const sceneCacheStatusLabel =
    sceneCacheState === 'idle'
      ? 'Standby'
      : sceneCacheState === 'primed'
        ? 'All scenes primed'
        : `${sceneReadyCount}/${sceneReadyTotal} ready`;
  const sceneCacheNote =
    sceneCacheState === 'idle'
      ? 'Enable immersive scenes, or choose a cinematic or stable render profile, to warm every 3D chapter in the background before you jump.'
      : sceneCacheState === 'primed'
        ? 'Every 3D chapter has been primed in the background for cleaner jumps and faster scene hand-offs.'
        : 'Background priming is warming the remaining 3D chapters so later jumps land without cold-start flashes.';
  const isSceneBootSyncing =
    sceneHandoffCycle > 0 &&
    shouldRenderCanvas &&
    (sceneState === 'staging' || sceneState === 'booting');
  const isSceneHandoffSyncing = sceneHandoffActive || isSceneBootSyncing;
  const sceneHandoffStatus = isSceneHandoffSyncing
    ? sceneCacheState === 'primed'
      ? `Scene handoff active · ${activeChapter.kicker} scene is primed and syncing into focus.`
      : `Scene handoff active · ${activeChapter.kicker} scene is syncing while the cache continues warming.`
    : sceneCacheState === 'idle'
      ? 'Scene handoff standby · enable immersive scenes to unlock cinematic transitions between chapters.'
      : sceneCacheState === 'primed'
        ? 'Scene handoff ready · every chapter is primed for smoother transitions.'
        : 'Scene handoff standby · background priming is still warming the remaining chapters.';
  const nextSceneLabel = nextChapter
    ? `Up next: ${nextChapter.kicker}`
    : 'Final scene active';
  const guidedTourStatus = guidedTourPlaying
    ? nextChapter
      ? `Guided tour active · ${guidedTourSpeedConfig.label} pace · Next auto-jump: ${nextChapter.kicker}`
      : `Guided tour active · ${guidedTourSpeedConfig.label} pace · Looping back to ${CHAPTERS[0].kicker}`
    : `Guided tour paused · ${guidedTourSpeedConfig.label} pace ready · Play to auto-preview every hero chapter`;
  const guidedTourActionLabel = guidedTourPlaying
    ? 'Pause guided tour'
    : 'Play guided tour';
  const chapterCounter = `${String(chapter + 1).padStart(2, '0')} / ${String(
    CHAPTERS.length
  ).padStart(2, '0')}`;
  const scenePreloadLabel =
    scenePreloadState === 'ready'
      ? '3D preloaded'
      : scenePreloadState === 'warming'
        ? 'Preloading 3D'
        : 'Preload idle';
  const sceneLensStatus = shouldRenderCanvas
    ? sceneLensConfig.note
    : sceneLensConfig.queuedNote;
  const interactionStatus = interactionBurstActive
    ? `Scene burst active · ${activeChapter.kicker} is surging live.`
    : touchCapable || isCompactViewport
      ? 'Tap the 3D field or use the trigger to punch extra energy into the active chapter.'
      : 'Click the 3D field or use the trigger to punch extra energy into the active chapter.';

  const userForcedImmersive =
    prefersReduced && motionPreference === 'immersive' && webglSupported;
  const userForcedCalm =
    !prefersReduced &&
    motionPreference === 'calm' &&
    webglSupported &&
    renderProfile === 'adaptive';
  const manualRenderProfileActive =
    webglSupported && renderProfile !== 'adaptive' && sceneState !== 'fallback';
  const manualRenderProfileNote = manualRenderProfileActive
    ? visualMode === 'reduced'
      ? `${renderProfileConfig.note} This manual 3D profile is temporarily overriding the calm presentation.`
      : renderProfileConfig.note
    : null;
  const canOverrideReducedMotion =
    webglSupported && effectiveVisualMode === 'reduced';

  const heroModeLabel = manualRenderProfileActive
    ? `${renderProfileConfig.label} 3D`
    : userForcedImmersive
      ? `${HERO_MODE_LABELS[effectiveVisualMode]} override`
      : userForcedCalm
        ? 'Calm mode'
        : HERO_MODE_LABELS[effectiveVisualMode];

  const heroModeNote = manualRenderProfileNote
    ? manualRenderProfileNote
    : userForcedImmersive
      ? 'Immersive scenes are enabled manually, so every 3D chapter stays available even while reduced-motion preferences are active.'
      : userForcedCalm
        ? 'Calm mode is enabled manually, so the hero is using the ambient presentation by choice until you jump directly to a story chapter.'
        : effectiveVisualMode === 'reduced' && prefersReduced
          ? scenePreloadState === 'ready'
            ? 'Reduced-motion preferences are active. The 3D chapter stack is already staged, so immersive scenes can launch faster the moment you opt in.'
            : scenePreloadState === 'warming'
              ? 'Reduced-motion preferences are active. The 3D chapter stack is quietly preloading now so scene activation lands cleaner when you opt in.'
              : 'Reduced-motion preferences are active. Scroll deeper into the story, use any chapter button, or enable immersive scenes whenever you want to preview every 3D chapter.'
          : HERO_MODE_NOTES[effectiveVisualMode];

  const runtimeLabel =
    sceneState === 'staging'
      ? 'Staging 3D'
      : sceneState === 'booting'
        ? 'Booting 3D'
        : stabilityAssistActive
          ? 'Stability assist'
          : heroModeLabel;

  const runtimeNote =
    sceneState === 'staging'
      ? userForcedImmersive
        ? 'Loading the immersive chapter stack now that you opted in, while the hero shell stays fully interactive.'
        : 'Rendering the storytelling shell first, then preloading the immersive scene a beat later for a smoother startup.'
      : sceneState === 'booting'
        ? userForcedImmersive
          ? 'The full 3D chapter sequence is streaming in now so you can explore every scene despite the system calm-mode preference.'
          : 'The immersive layer is streaming in now; navigation, copy, and calls-to-action remain fully usable while it finishes loading.'
        : stabilityAssistActive
          ? 'Performance pressure was detected, so the hero trimmed scene density, device pixel ratio, and post-processing to keep chapter rendering responsive.'
          : heroModeNote;

  const storyBadgeClass =
    sceneState === 'staging' || sceneState === 'booting'
      ? 'is-loading'
      : stabilityAssistActive
        ? 'is-lite'
        : `is-${effectiveVisualMode}`;

  const shouldAnimateCanvas =
    shouldRenderCanvas && sceneActive && pageVisible && sceneResolved;
  const isSceneBusy = sceneState === 'staging' || sceneState === 'booting';
  const shareActionLabel =
    shareState === 'shared'
      ? 'Scene shared'
      : shareState === 'copied'
        ? 'Scene link copied'
        : nativeShareSupported
          ? 'Share scene'
          : 'Copy scene link';
  const shareStatusMessage =
    shareState === 'shared'
      ? `${activeChapter.kicker} scene shared.`
      : shareState === 'copied'
        ? `${activeChapter.kicker} scene link copied.`
        : shareState === 'error'
          ? nativeShareSupported
            ? 'Sharing was blocked. Use the direct scene link to open this chapter or copy it from the address bar.'
            : 'Copy was blocked. Use the direct scene link to open this chapter and copy it from the address bar.'
          : null;
  const mobilePanelState = isCompactViewport
    ? mobilePanelOpen
      ? 'open'
      : 'closed'
    : 'desktop';
  const mobilePanelMeta = shouldRenderCanvas
    ? `${sceneLensConfig.label} lens · ${activeAtmosphere.label}`
    : scenePreloadState === 'ready'
      ? `${sceneLensConfig.label} lens primed`
      : scenePreloadState === 'warming'
        ? `Loading 3D · ${sceneLensConfig.label}`
        : runtimeLabel;
  const mobileThreeDMode = shouldUseOptimizedMobile3D
    ? 'optimized'
    : 'standard';
  const mobilePanelToggleLabel = `${mobilePanelOpen ? 'Hide' : 'Show'} hero controls for ${activeChapter.kicker}`;
  const handleSceneReady = useCallback(() => {
    setSceneResolved(true);
  }, []);
  const handleSceneWarmCountChange = useCallback((nextCount: number) => {
    setSceneReadyCount(currentCount =>
      currentCount === nextCount ? currentCount : nextCount
    );
  }, []);
  const enableStabilityAssist = useCallback(() => {
    if (shouldRenderCanvas && renderProfile !== 'stable') {
      setStabilityAssistActive(true);
    }
  }, [renderProfile, shouldRenderCanvas]);
  const closeMobilePanel = useCallback(() => {
    setMobilePanelOpen(false);
  }, []);
  const toggleMobilePanel = useCallback(() => {
    setMobilePanelOpen(currentOpen => !currentOpen);
  }, []);
  const shareSceneLink = useCallback(async () => {
    const sceneUrl = shareLinkRef.current?.href ?? sceneShareHref;

    if (nativeShareSupported) {
      let cancelled = false;

      const didShare = await shareContent(
        {
          title: `${activeChapter.kicker} · Olive Universe`,
          text: `Explore the ${activeChapter.kicker} scene in Olive Global Systems' homepage 3D experience.`,
          url: sceneUrl,
        },
        {
          copyFallback: false,
          onCancel: () => {
            cancelled = true;
            setShareState('idle');
          },
        }
      );

      if (didShare) {
        setShareState('shared');
        return;
      }

      if (cancelled) {
        return;
      }
    }

    const didCopy = await copyText(sceneUrl);
    setShareState(didCopy ? 'copied' : 'error');
  }, [activeChapter.kicker, nativeShareSupported, sceneShareHref]);
  const enableImmersiveScenes = useCallback(() => {
    requestScenePreload();

    if (isCompactViewport) {
      setMobilePanelOpen(false);
    }

    setMotionPreference('immersive');
  }, [isCompactViewport, requestScenePreload]);
  const retryCinematicRender = useCallback(() => {
    if (isCompactViewport) {
      setMobilePanelOpen(false);
    }

    setStabilityAssistActive(false);
  }, [isCompactViewport]);
  const selectRenderProfile = useCallback(
    (nextProfile: RenderProfile) => {
      if (nextProfile !== 'adaptive') {
        requestScenePreload();
      }

      if (isCompactViewport) {
        setMobilePanelOpen(false);
      }

      setStabilityAssistActive(false);
      setRenderProfile(nextProfile);
    },
    [isCompactViewport, requestScenePreload]
  );
  const selectSceneLens = useCallback(
    (nextLens: SceneLensMode) => {
      requestScenePreload();
      setSceneLens(nextLens);
    },
    [requestScenePreload]
  );
  const startGuidedTour = useCallback(() => {
    requestScenePreload();
    ensureImmersiveSceneAccess();

    if (isCompactViewport) {
      setMobilePanelOpen(false);
    }

    setGuidedTourPlaying(true);
  }, [ensureImmersiveSceneAccess, isCompactViewport, requestScenePreload]);
  const stopGuidedTour = useCallback(() => {
    setGuidedTourPlaying(false);
  }, []);
  const toggleGuidedTour = useCallback(() => {
    if (guidedTourPlaying) {
      stopGuidedTour();
      return;
    }

    startGuidedTour();
  }, [guidedTourPlaying, startGuidedTour, stopGuidedTour]);
  const enableCalmMode = useCallback(() => {
    if (isCompactViewport) {
      setMobilePanelOpen(false);
    }

    setRenderProfile('adaptive');
    setStabilityAssistActive(false);
    setGuidedTourPlaying(false);
    setMotionPreference('calm');
  }, [isCompactViewport]);
  const resetMotionPreference = useCallback(() => {
    if (isCompactViewport) {
      setMobilePanelOpen(false);
    }

    setRenderProfile('adaptive');
    setStabilityAssistActive(false);
    setGuidedTourPlaying(false);
    setMotionPreference('auto');
  }, [isCompactViewport]);

  useEffect(() => {
    setShareState('idle');
  }, [activeChapter.id]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') {
      return;
    }

    if (!shouldRenderCanvas) {
      previousChapterIdRef.current = activeChapter.id;
      return;
    }

    const previousChapterId = previousChapterIdRef.current;
    previousChapterIdRef.current = activeChapter.id;

    if (previousChapterId === activeChapter.id) {
      return;
    }

    if (handoffTimeoutRef.current !== null) {
      window.clearTimeout(handoffTimeoutRef.current);
    }

    setSceneHandoffCycle(currentCycle => currentCycle + 1);
    setSceneHandoffActive(true);
    handoffTimeoutRef.current = window.setTimeout(
      () => {
        setSceneHandoffActive(false);
        handoffTimeoutRef.current = null;
      },
      sceneCacheState === 'primed'
        ? SCENE_HANDOFF_DURATION_MS.primed
        : SCENE_HANDOFF_DURATION_MS.warming
    );
  }, [activeChapter.id, mounted, sceneCacheState, shouldRenderCanvas]);

  return (
    <div
      ref={wrapperRef}
      className="universe-wrapper"
      data-olive-universe={mounted ? 'ready' : 'booting'}
      data-current-chapter={activeChapter.id}
      data-olive-mode={effectiveVisualMode}
      data-olive-scene={sceneState}
      data-olive-runtime={stabilityAssistActive ? 'stability' : 'default'}
      data-olive-render-profile={renderProfile}
      data-olive-scene-cache={sceneCacheState}
      data-olive-scene-ready-count={String(sceneReadyCount)}
      data-olive-handoff={isSceneHandoffSyncing ? 'syncing' : 'idle'}
      data-olive-atmosphere={activeChapter.id}
      data-olive-tour={guidedTourPlaying ? 'playing' : 'idle'}
      data-olive-tour-speed={guidedTourSpeed}
      data-olive-motion-preference={motionPreference}
      data-olive-lens={sceneLens}
      data-olive-mobile-panel={mobilePanelState}
      data-olive-mobile-3d={mobileThreeDMode}
      data-olive-preload={scenePreloadState}
      data-olive-interaction={interactionBurstActive ? 'burst' : 'idle'}
      style={
        {
          '--universe-accent': activeChapter.accent,
          '--universe-accent-rgb': accentRgb,
          '--universe-atmosphere-rgb': atmosphereRgb,
          '--universe-atmosphere-secondary-rgb': atmosphereSecondaryRgb,
        } as CSSProperties
      }
    >
      <div className="universe-sticky">
        {shouldRenderCanvas ? (
          sceneBootReady ? (
            <Suspense fallback={<StaticBackdrop mode="loading" />}>
              <OliveUniverseCanvas
                activeChapterIndex={chapter}
                progressRef={progressRef}
                quality={runtimeQuality}
                sceneProfile={sceneProfile}
                shouldAnimate={shouldAnimateCanvas}
                stabilityAssistActive={stabilityAssistActive}
                sceneLens={sceneLens}
                interactionBurstActive={interactionBurstActive}
                interactionBurstCycle={interactionBurstCycle}
                onPerformanceBudgetExceeded={enableStabilityAssist}
                onWarmCountChange={handleSceneWarmCountChange}
                onReady={handleSceneReady}
              />
            </Suspense>
          ) : (
            <StaticBackdrop mode="loading" />
          )
        ) : (
          <StaticBackdrop
            mode={effectiveVisualMode === 'fallback' ? 'fallback' : 'reduced'}
          />
        )}

        <div
          className="universe-overlay"
          role="region"
          aria-label="Interactive studio introduction"
          aria-busy={isSceneBusy}
        >
          {shouldRenderCanvas && (
            <div
              className={`universe-handoff-layer ${isSceneHandoffSyncing ? 'is-active' : ''}`}
              aria-hidden="true"
            >
              <div
                key={`handoff-wash-${sceneHandoffCycle}`}
                className="universe-handoff-wash"
              />
              <div
                key={`handoff-beam-${sceneHandoffCycle}`}
                className="universe-handoff-beam"
              />
              <div
                key={`handoff-ring-${sceneHandoffCycle}`}
                className="universe-handoff-ring"
              />
            </div>
          )}

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {`Chapter ${chapter + 1} of ${CHAPTERS.length}: ${activeChapter.kicker}. ${runtimeNote}${guidedTourPlaying ? ' Guided tour active.' : ''}`}
          </p>

          {CHAPTERS.map((ch, i) => (
            <ChapterOverlay
              key={ch.id}
              ch={ch}
              visible={chapter === i}
              isPrimary={i === 0}
            />
          ))}

          {isCompactViewport && (
            <div
              className="universe-mobile-dock"
              role="group"
              aria-label="Compact hero controls"
            >
              <button
                type="button"
                className="universe-mobile-dock-button"
                onClick={() => {
                  if (previousChapter) {
                    navigateToChapter(chapter - 1);
                  }
                }}
                disabled={!previousChapter}
                aria-label={
                  previousChapter
                    ? `Go to previous scene: ${previousChapter.kicker}`
                    : 'Previous scene unavailable'
                }
              >
                <span aria-hidden="true">←</span>
              </button>

              <button
                type="button"
                className={`universe-mobile-panel-toggle ${mobilePanelOpen ? 'is-open' : ''}`}
                onClick={toggleMobilePanel}
                aria-expanded={mobilePanelOpen}
                aria-controls={MOBILE_PANEL_ID}
                aria-label={mobilePanelToggleLabel}
              >
                <span className="universe-mobile-panel-counter">
                  {chapterCounter}
                </span>
                <span className="universe-mobile-panel-copy">
                  <span className="universe-mobile-panel-kicker">
                    {activeChapter.kicker}
                  </span>
                  <span className="universe-mobile-panel-meta">
                    {mobilePanelMeta}
                  </span>
                </span>
                <span className="universe-mobile-panel-icon" aria-hidden="true">
                  {mobilePanelOpen ? '×' : '⋯'}
                </span>
              </button>

              <button
                type="button"
                className="universe-mobile-dock-button"
                onClick={() => {
                  if (nextChapter) {
                    navigateToChapter(chapter + 1);
                  }
                }}
                disabled={!nextChapter}
                aria-label={
                  nextChapter
                    ? `Go to next scene: ${nextChapter.kicker}`
                    : 'Next scene unavailable'
                }
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          <aside
            id={MOBILE_PANEL_ID}
            className={`universe-story-panel ${isCompactViewport ? (mobilePanelOpen ? 'is-mobile-open' : 'is-mobile-collapsed') : ''}`}
            aria-label="Hero story status"
          >
            <div className="universe-story-panel-top">
              <div>
                <p className="universe-story-eyebrow">Story mode</p>
                <p className="universe-story-counter">{chapterCounter}</p>
              </div>

              <div className="universe-story-panel-status">
                <span className={`universe-story-badge ${storyBadgeClass}`}>
                  {runtimeLabel}
                </span>

                {isCompactViewport && (
                  <button
                    type="button"
                    className="universe-story-close"
                    onClick={closeMobilePanel}
                    aria-label="Close hero controls"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            <p className="universe-story-kicker">{activeChapter.kicker}</p>
            <p className="universe-story-note">{runtimeNote}</p>
            {!shouldRenderCanvas && webglSupported && (
              <p className="universe-story-preload-status" role="status">
                {scenePreloadLabel}
              </p>
            )}

            <div className="universe-story-progress-block">
              <div className="universe-story-progress-row">
                <p className="universe-story-progress-label">Scene progress</p>
                <p className="universe-story-progress-value">
                  {sceneProgressPercent}%
                </p>
              </div>
              <div
                className="universe-story-progress-meter"
                role="progressbar"
                aria-label={`${activeChapter.kicker} scene progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={sceneProgressPercent}
                aria-valuetext={`${sceneProgressPercent}% complete`}
              >
                <span
                  className="universe-story-progress-fill"
                  style={{
                    transform: `scaleX(${sceneProgressPercent / 100})`,
                  }}
                />
              </div>
              <p className="universe-story-next">{nextSceneLabel}</p>
            </div>

            {isCompactViewport && (
              <div
                className="universe-story-jump-grid"
                role="group"
                aria-label="Chapter jump controls"
              >
                {CHAPTERS.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`universe-story-jump-button ${index === chapter ? 'is-active' : ''}`}
                    onClick={() => navigateToChapter(index)}
                    aria-pressed={index === chapter}
                    aria-label={`Jump to ${item.kicker}`}
                  >
                    <span className="universe-story-jump-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="universe-story-jump-label">
                      {item.kicker}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <p
              className={`universe-story-tour-status ${guidedTourPlaying ? 'is-playing' : ''}`}
              role="status"
              aria-live="polite"
            >
              {guidedTourStatus}
            </p>

            {webglSupported && (
              <div
                className="universe-story-tour-speed"
                role="group"
                aria-label="Guided tour speed"
              >
                <div className="universe-story-tour-speed-header">
                  <p className="universe-story-tour-speed-label">Tour pace</p>
                  <p className="universe-story-tour-speed-value">
                    {guidedTourSpeedConfig.cadenceLabel}
                  </p>
                </div>

                <div className="universe-story-tour-speed-buttons">
                  {GUIDED_TOUR_SPEED_ORDER.map(speed => {
                    const speedConfig = GUIDED_TOUR_SPEEDS[speed];

                    return (
                      <button
                        key={speed}
                        type="button"
                        className={`universe-story-speed-button ${guidedTourSpeed === speed ? 'is-active' : ''}`}
                        onClick={() => setGuidedTourSpeed(speed)}
                        aria-pressed={guidedTourSpeed === speed}
                        aria-label={`Use ${speedConfig.label} guided tour speed`}
                      >
                        <span>{speedConfig.label}</span>
                        <span>{speedConfig.cadenceLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {webglSupported && (
              <div
                className="universe-story-render-profile"
                role="group"
                aria-label="3D render profile"
              >
                <div className="universe-story-render-profile-header">
                  <p className="universe-story-render-profile-label">
                    Render profile
                  </p>
                  <p className="universe-story-render-profile-value">
                    {renderProfileConfig.statusLabel}
                  </p>
                </div>

                <div className="universe-story-render-profile-buttons">
                  {RENDER_PROFILE_ORDER.map(profile => {
                    const profileOption = RENDER_PROFILE_OPTIONS[profile];

                    return (
                      <button
                        key={profile}
                        type="button"
                        className={`universe-story-render-profile-button ${renderProfile === profile ? 'is-active' : ''}`}
                        onClick={() => selectRenderProfile(profile)}
                        aria-pressed={renderProfile === profile}
                        aria-label={`Use ${profileOption.label} render profile`}
                      >
                        <span>{profileOption.label}</span>
                        <span>{profileOption.description}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="universe-story-render-profile-note">
                  {renderProfileConfig.note}
                </p>
              </div>
            )}

            {webglSupported && (
              <div
                className="universe-story-render-profile"
                role="group"
                aria-label="Scene lens"
              >
                <div className="universe-story-render-profile-header">
                  <p className="universe-story-render-profile-label">
                    Scene lens
                  </p>
                  <p className="universe-story-render-profile-value">
                    {sceneLensConfig.statusLabel}
                  </p>
                </div>

                <div className="universe-story-render-profile-buttons">
                  {SCENE_LENS_ORDER.map(lens => {
                    const lensOption = SCENE_LENS_OPTIONS[lens];

                    return (
                      <button
                        key={lens}
                        type="button"
                        className={`universe-story-render-profile-button ${sceneLens === lens ? 'is-active' : ''}`}
                        onClick={() => selectSceneLens(lens)}
                        aria-pressed={sceneLens === lens}
                        aria-label={`Use ${lensOption.label} scene lens`}
                      >
                        <span>{lensOption.label}</span>
                        <span>{lensOption.description}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="universe-story-render-profile-note">
                  {sceneLensStatus}
                </p>
              </div>
            )}

            {webglSupported && (
              <div
                className="universe-story-atmosphere"
                role="status"
                aria-live="polite"
              >
                <div className="universe-story-atmosphere-header">
                  <p className="universe-story-atmosphere-label">
                    Atmosphere signature
                  </p>
                  <p className="universe-story-atmosphere-value">
                    {activeAtmosphere.label}
                  </p>
                </div>

                <p className="universe-story-atmosphere-note">
                  {activeAtmosphere.note}
                </p>

                <div className="universe-story-atmosphere-traits">
                  {activeAtmosphere.traits.map(trait => (
                    <span
                      key={trait}
                      className="universe-story-atmosphere-trait"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {webglSupported && (
              <div
                className={`universe-story-cache ${sceneCacheState === 'primed' ? 'is-primed' : 'is-warming'}`}
                role="status"
                aria-live="polite"
              >
                <div className="universe-story-cache-header">
                  <p className="universe-story-cache-label">Scene cache</p>
                  <p className="universe-story-cache-value">
                    {sceneCacheStatusLabel}
                  </p>
                </div>

                <div className="universe-story-cache-track" aria-hidden="true">
                  {CHAPTERS.map((item, index) => (
                    <span
                      key={item.id}
                      className={`universe-story-cache-segment ${index < sceneReadyCount ? 'is-ready' : ''} ${index === chapter ? 'is-current' : ''}`}
                    />
                  ))}
                </div>

                <p className="universe-story-cache-note">{sceneCacheNote}</p>
              </div>
            )}

            {webglSupported && (
              <p
                className={`universe-story-handoff ${isSceneHandoffSyncing ? 'is-active' : ''}`}
                role="status"
                aria-live="polite"
              >
                {sceneHandoffStatus}
              </p>
            )}

            <div
              className="universe-story-nav"
              role="group"
              aria-label="Scene step controls"
            >
              <button
                type="button"
                className="universe-story-nav-button"
                onClick={() => {
                  if (previousChapter) {
                    navigateToChapter(chapter - 1);
                  }
                }}
                disabled={!previousChapter}
                aria-label={
                  previousChapter
                    ? `Go to previous scene: ${previousChapter.kicker}`
                    : 'Previous scene unavailable'
                }
              >
                <span aria-hidden="true">←</span>
                <span>Previous scene</span>
              </button>

              <button
                type="button"
                className="universe-story-nav-button"
                onClick={() => {
                  if (nextChapter) {
                    navigateToChapter(chapter + 1);
                  }
                }}
                disabled={!nextChapter}
                aria-label={
                  nextChapter
                    ? `Go to next scene: ${nextChapter.kicker}`
                    : 'Next scene unavailable'
                }
              >
                <span>Next scene</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {webglSupported && (
              <div
                className={`universe-story-interaction ${interactionBurstActive ? 'is-active' : ''}`}
                role="status"
                aria-live="polite"
              >
                <div className="universe-story-interaction-header">
                  <p className="universe-story-interaction-label">
                    Scene reaction
                  </p>
                  <p className="universe-story-interaction-value">
                    {interactionBurstActive
                      ? 'Burst live'
                      : 'Tap / click ready'}
                  </p>
                </div>

                <p className="universe-story-interaction-note">
                  {interactionStatus}
                </p>

                {shouldRenderCanvas && (
                  <button
                    type="button"
                    className="universe-story-toggle is-secondary universe-story-interaction-trigger"
                    onClick={triggerInteractionBurst}
                  >
                    Trigger scene burst
                  </button>
                )}
              </div>
            )}

            {webglSupported && (
              <div className="universe-story-actions">
                {stabilityAssistActive && (
                  <button
                    type="button"
                    className="universe-story-toggle is-secondary"
                    onClick={retryCinematicRender}
                  >
                    Retry cinematic render
                  </button>
                )}

                <button
                  type="button"
                  className={`universe-story-toggle ${guidedTourPlaying ? 'is-primary' : 'is-secondary'}`}
                  onClick={toggleGuidedTour}
                  aria-pressed={guidedTourPlaying}
                >
                  {guidedTourActionLabel}
                </button>

                {canOverrideReducedMotion ? (
                  <button
                    type="button"
                    className="universe-story-toggle is-primary"
                    onClick={enableImmersiveScenes}
                  >
                    Enable immersive scenes
                  </button>
                ) : (
                  <button
                    type="button"
                    className="universe-story-toggle is-secondary"
                    onClick={enableCalmMode}
                  >
                    Use calm mode
                  </button>
                )}

                {motionPreference !== 'auto' && (
                  <button
                    type="button"
                    className="universe-story-toggle is-secondary"
                    onClick={resetMotionPreference}
                  >
                    Use system setting
                  </button>
                )}

                <button
                  type="button"
                  className="universe-story-toggle is-secondary"
                  onClick={() => {
                    void shareSceneLink();
                  }}
                >
                  {shareActionLabel}
                </button>

                <a
                  ref={shareLinkRef}
                  href={sceneSharePath}
                  className="universe-story-toggle is-secondary"
                  aria-label={`Open scene link for ${activeChapter.kicker}`}
                >
                  Open scene link
                </a>
              </div>
            )}

            {shareStatusMessage && (
              <p
                className={`universe-story-share-status ${shareState === 'error' ? 'is-error' : ''}`}
                role="status"
                aria-live="polite"
              >
                {shareStatusMessage}
              </p>
            )}

            <p className="universe-story-shortcuts">
              Shortcuts: ← → chapters · Home start · End finale
            </p>

            {touchCapable && (
              <p className="universe-story-gestures">Touch: swipe ← → scenes</p>
            )}

            <div className="universe-story-track" aria-hidden="true">
              {CHAPTERS.map((item, index) => (
                <span
                  key={item.id}
                  className={`universe-story-segment ${index <= chapter ? 'is-active' : ''}`}
                />
              ))}
            </div>

            <a
              href={withBasePath('#creative-lanes')}
              className="universe-story-skip"
            >
              Skip immersive intro
            </a>
          </aside>
        </div>

        <nav
          className="universe-progress"
          aria-label="Story chapters"
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End PageUp PageDown"
        >
          {CHAPTERS.map((ch, i) => (
            <button
              key={ch.id}
              type="button"
              className={`universe-dot ${chapter === i ? 'is-active' : ''}`}
              aria-label={`Jump to ${ch.kicker}`}
              aria-pressed={chapter === i}
              aria-current={chapter === i ? 'step' : undefined}
              onClick={() => navigateToChapter(i)}
            >
              <span className="universe-dot-index">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="universe-dot-label">{ch.kicker}</span>
            </button>
          ))}
        </nav>

        {chapter === 0 && (
          <div className="universe-scroll-hint" aria-hidden="true">
            <span>Scroll to explore</span>
            <div className="universe-scroll-arrow" />
          </div>
        )}
      </div>
    </div>
  );
}
