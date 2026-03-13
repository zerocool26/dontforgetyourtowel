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
  const progressRef = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [quality, setQuality] = useState<QualityTier>('medium');
  const [mounted, setMounted] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [sceneActive, setSceneActive] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [sceneBootReady, setSceneBootReady] = useState(false);
  const [sceneResolved, setSceneResolved] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncReducedMotion = () => setPrefersReduced(motionQuery.matches);

    syncReducedMotion();
    setQuality(detectQuality());
    setWebglSupported(supportsWebGL());
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
    if (prefersReduced) return 'reduced';
    if (quality === 'low') return 'lite';
    return 'immersive';
  }, [prefersReduced, quality, webglSupported]);

  const shouldRenderCanvas =
    visualMode === 'immersive' || visualMode === 'lite';

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

  const scrollToChapter = useCallback((chapterIndex: number) => {
    if (!wrapperRef.current || typeof window === 'undefined') return;

    const wrapperTop =
      window.scrollY + wrapperRef.current.getBoundingClientRect().top;
    const total = wrapperRef.current.offsetHeight - window.innerHeight;
    const targetTop = wrapperTop + total * CHAPTERS[chapterIndex].range[0];

    window.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, []);

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

      let nextChapter = 0;
      for (let i = CHAPTERS.length - 1; i >= 0; i--)
        if (progressRef.current >= CHAPTERS[i].range[0] - 0.04) {
          nextChapter = i;
          break;
        }

      setChapter(currentChapter =>
        currentChapter === nextChapter ? currentChapter : nextChapter
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
  }, [mounted]);

  const activeChapter = CHAPTERS[chapter] ?? CHAPTERS[0];
  const sceneProfile = useMemo(
    () => getSceneProfile(quality, visualMode),
    [quality, visualMode]
  );
  const accentRgb = useMemo(
    () => hexToRgbString(activeChapter.accent),
    [activeChapter.accent]
  );
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

  const heroModeLabel = HERO_MODE_LABELS[visualMode];
  const heroModeNote = HERO_MODE_NOTES[visualMode];

  const runtimeLabel =
    sceneState === 'staging'
      ? 'Staging 3D'
      : sceneState === 'booting'
        ? 'Booting 3D'
        : heroModeLabel;

  const runtimeNote =
    sceneState === 'staging'
      ? 'Rendering the storytelling shell first, then preloading the immersive scene a beat later for a smoother startup.'
      : sceneState === 'booting'
        ? 'The immersive layer is streaming in now; navigation, copy, and calls-to-action remain fully usable while it finishes loading.'
        : heroModeNote;

  const storyBadgeClass =
    sceneState === 'staging' || sceneState === 'booting'
      ? 'is-loading'
      : `is-${visualMode}`;

  const shouldAnimateCanvas =
    shouldRenderCanvas && sceneActive && pageVisible && sceneResolved;
  const isSceneBusy = sceneState === 'staging' || sceneState === 'booting';
  const handleSceneReady = useCallback(() => {
    setSceneResolved(true);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="universe-wrapper"
      data-olive-universe={mounted ? 'ready' : 'booting'}
      data-current-chapter={activeChapter.id}
      data-olive-mode={visualMode}
      data-olive-scene={sceneState}
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
            {`Chapter ${chapter + 1} of ${CHAPTERS.length}: ${activeChapter.kicker}. ${runtimeNote}`}
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

        <nav className="universe-progress" aria-label="Story chapters">
          {CHAPTERS.map((ch, i) => (
            <button
              key={ch.id}
              type="button"
              className={`universe-dot ${chapter === i ? 'is-active' : ''}`}
              aria-label={`Jump to ${ch.kicker}`}
              aria-pressed={chapter === i}
              aria-current={chapter === i ? 'step' : undefined}
              onClick={() => scrollToChapter(i)}
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
