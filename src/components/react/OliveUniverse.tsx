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
  CHAPTERS,
  detectQuality,
  getSceneProfile,
  HERO_MODE_LABELS,
  HERO_MODE_NOTES,
  hexToRgbString,
  prefersReducedMotion,
  supportsWebGL,
  type ChapterDef,
  type HeroVisualMode,
  type QualityTier,
} from './olive-universe-config';

const preloadOliveUniverseCanvas = () => import('./OliveUniverseCanvas');
const OliveUniverseCanvas = lazy(preloadOliveUniverseCanvas);
const MOTION_PREFERENCE_KEY = 'olive-universe-motion-preference';
const AUTO_TOUR_INTERVAL_MS = 2800;
const HERO_SCENE_QUERY_KEYS = ['scene', 'hero', 'chapter'] as const;
const HERO_SCENE_HASH_PREFIX = '#hero-';
const GUIDED_TOUR_SPEED_ORDER = ['slow', 'standard', 'fast'] as const;

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

type MotionPreference = 'auto' | 'immersive' | 'calm';

type GuidedTourSpeed = 'slow' | 'standard' | 'fast';

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

function isMotionPreference(value: string | null): value is MotionPreference {
  return value === 'auto' || value === 'immersive' || value === 'calm';
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

function shouldIgnoreHeroInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, button, a[href], [role="button"], [role="link"], [contenteditable="true"]'
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
  const [mounted, setMounted] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [sceneActive, setSceneActive] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [sceneBootReady, setSceneBootReady] = useState(false);
  const [sceneResolved, setSceneResolved] = useState(false);
  const [nativeShareSupported, setNativeShareSupported] = useState(false);
  const [touchCapable, setTouchCapable] = useState(false);
  const [guidedTourPlaying, setGuidedTourPlaying] = useState(false);
  const [guidedTourSpeed, setGuidedTourSpeed] =
    useState<GuidedTourSpeed>('standard');
  const [sceneProgressPercent, setSceneProgressPercent] = useState(0);
  const [shareState, setShareState] = useState<
    'idle' | 'copied' | 'shared' | 'error'
  >('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncReducedMotion = () => setPrefersReduced(motionQuery.matches);

    syncReducedMotion();
    setQuality(detectQuality());
    setWebglSupported(supportsWebGL());
    setNativeShareSupported(isShareSupported());
    setTouchCapable(
      window.matchMedia('(pointer: coarse)').matches ||
        (navigator.maxTouchPoints ?? 0) > 0
    );

    try {
      const storedMotionPreference = window.localStorage.getItem(
        MOTION_PREFERENCE_KEY
      );
      if (isMotionPreference(storedMotionPreference)) {
        setMotionPreference(storedMotionPreference);
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
  }, []);

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

  const shouldRenderCanvas =
    visualMode === 'immersive' || visualMode === 'lite';

  const scrollToChapter = useCallback(
    (chapterIndex: number, behaviorOverride?: ScrollBehavior) => {
      if (!wrapperRef.current || typeof window === 'undefined') return;

      if (
        webglSupported &&
        visualMode !== 'immersive' &&
        visualMode !== 'lite'
      ) {
        setMotionPreference('immersive');
      }

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
    [visualMode, webglSupported]
  );

  const navigateToChapter = useCallback(
    (
      chapterIndex: number,
      behaviorOverride?: ScrollBehavior,
      source: ChapterNavigationSource = 'manual'
    ) => {
      const chapterDef = CHAPTERS[chapterIndex] ?? CHAPTERS[0];

      if (source === 'manual' && guidedTourPlaying) {
        setGuidedTourPlaying(false);
      }

      progressRef.current = chapterDef.range[0];
      setChapter(chapterIndex);
      setSceneProgressPercent(0);
      scrollToChapter(chapterIndex, behaviorOverride ?? 'auto');
    },
    [guidedTourPlaying, scrollToChapter]
  );

  useEffect(() => {
    if (
      !mounted ||
      typeof window === 'undefined' ||
      !guidedTourPlaying ||
      !sceneActive ||
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
    sceneActive,
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
      setSceneProgressPercent(0);
      setChapter(0);
      return;
    }

    setSceneProgressPercent(0);
    setChapter(requestedIndex);

    const rafId = window.requestAnimationFrame(() => {
      scrollToChapter(requestedIndex, 'auto');
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [mounted, scrollToChapter]);

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
          event.target ?? document.activeElement
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
        shouldIgnoreHeroInteractiveTarget(event.target)
      ) {
        return;
      }

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

      if (shouldIgnoreHeroInteractiveTarget(event.target)) {
        return;
      }

      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      const elapsed = performance.now() - gesture.startTime;

      if (
        elapsed > swipeTimeout ||
        Math.abs(deltaX) < swipeDistance ||
        Math.abs(deltaX) <= Math.abs(deltaY) * swipeDominanceRatio
      ) {
        return;
      }

      if (deltaX < 0 && hasNextChapter) {
        navigateToChapter(chapter + 1);
        return;
      }

      if (deltaX > 0 && hasPreviousChapter) {
        navigateToChapter(chapter - 1);
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
  }, [chapter, mounted, navigateToChapter]);

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

  const activeChapter = CHAPTERS[chapter] ?? CHAPTERS[0];
  const sceneProfile = useMemo(
    () => getSceneProfile(quality, visualMode),
    [quality, visualMode]
  );
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
  const previousChapter = chapter > 0 ? CHAPTERS[chapter - 1] : null;
  const nextChapter =
    chapter < CHAPTERS.length - 1 ? CHAPTERS[chapter + 1] : null;
  const guidedTourSpeedConfig = GUIDED_TOUR_SPEEDS[guidedTourSpeed];
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

  const sceneState = useMemo<SceneRuntimeState>(() => {
    if (!shouldRenderCanvas) {
      return visualMode === 'fallback' ? 'fallback' : 'ambient';
    }

    if (!sceneBootReady) return 'staging';
    if (!sceneResolved) return 'booting';
    return 'interactive';
  }, [sceneBootReady, sceneResolved, shouldRenderCanvas, visualMode]);

  const userForcedImmersive =
    prefersReduced && motionPreference === 'immersive' && webglSupported;
  const userForcedCalm =
    !prefersReduced && motionPreference === 'calm' && webglSupported;
  const canOverrideReducedMotion = webglSupported && visualMode === 'reduced';

  const heroModeLabel = userForcedImmersive
    ? `${HERO_MODE_LABELS[visualMode]} override`
    : userForcedCalm
      ? 'Calm mode'
      : HERO_MODE_LABELS[visualMode];

  const heroModeNote = userForcedImmersive
    ? 'Immersive scenes are enabled manually, so every 3D chapter stays available even while reduced-motion preferences are active.'
    : userForcedCalm
      ? 'Calm mode is enabled manually, so the hero is using the ambient presentation by choice until you jump directly to a story chapter.'
      : visualMode === 'reduced' && prefersReduced
        ? 'Reduced-motion preferences are active. Scroll deeper into the story, use any chapter button, or enable immersive scenes whenever you want to preview every 3D chapter.'
        : HERO_MODE_NOTES[visualMode];

  const runtimeLabel =
    sceneState === 'staging'
      ? 'Staging 3D'
      : sceneState === 'booting'
        ? 'Booting 3D'
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
        : heroModeNote;

  const storyBadgeClass =
    sceneState === 'staging' || sceneState === 'booting'
      ? 'is-loading'
      : `is-${visualMode}`;

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
  const handleSceneReady = useCallback(() => {
    setSceneResolved(true);
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
    setMotionPreference('immersive');
  }, []);
  const startGuidedTour = useCallback(() => {
    if (webglSupported && visualMode !== 'immersive' && visualMode !== 'lite') {
      setMotionPreference('immersive');
    }

    setGuidedTourPlaying(true);
  }, [visualMode, webglSupported]);
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
    setGuidedTourPlaying(false);
    setMotionPreference('calm');
  }, []);
  const resetMotionPreference = useCallback(() => {
    setGuidedTourPlaying(false);
    setMotionPreference('auto');
  }, []);

  useEffect(() => {
    setShareState('idle');
  }, [activeChapter.id]);

  return (
    <div
      ref={wrapperRef}
      className="universe-wrapper"
      data-olive-universe={mounted ? 'ready' : 'booting'}
      data-current-chapter={activeChapter.id}
      data-olive-mode={visualMode}
      data-olive-scene={sceneState}
      data-olive-tour={guidedTourPlaying ? 'playing' : 'idle'}
      data-olive-tour-speed={guidedTourSpeed}
      data-olive-motion-preference={motionPreference}
      style={
        {
          '--universe-accent': activeChapter.accent,
          '--universe-accent-rgb': accentRgb,
        } as CSSProperties
      }
    >
      <div className="universe-sticky">
        {shouldRenderCanvas ? (
          sceneBootReady ? (
            <Suspense fallback={<StaticBackdrop mode="loading" />}>
              <OliveUniverseCanvas
                progressRef={progressRef}
                quality={quality}
                sceneProfile={sceneProfile}
                shouldAnimate={shouldAnimateCanvas}
                onReady={handleSceneReady}
              />
            </Suspense>
          ) : (
            <StaticBackdrop mode="loading" />
          )
        ) : (
          <StaticBackdrop
            mode={visualMode === 'fallback' ? 'fallback' : 'reduced'}
          />
        )}

        <div
          className="universe-overlay"
          role="region"
          aria-label="Interactive studio introduction"
          aria-busy={isSceneBusy}
        >
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

          <aside
            className="universe-story-panel"
            aria-label="Hero story status"
          >
            <div className="universe-story-panel-top">
              <div>
                <p className="universe-story-eyebrow">Story mode</p>
                <p className="universe-story-counter">{chapterCounter}</p>
              </div>
              <span className={`universe-story-badge ${storyBadgeClass}`}>
                {runtimeLabel}
              </span>
            </div>

            <p className="universe-story-kicker">{activeChapter.kicker}</p>
            <p className="universe-story-note">{runtimeNote}</p>

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
              <div className="universe-story-actions">
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
