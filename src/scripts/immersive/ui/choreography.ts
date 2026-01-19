import Splitting from 'splitting';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import type { ImmersiveCaps } from '../core/caps';

type Cleanup = () => void;

type TweenWithScrollTrigger = gsap.core.Tween & {
  scrollTrigger?: ScrollTrigger;
};

export const setupImmersiveChoreography = (
  root: HTMLElement,
  caps: ImmersiveCaps
): Cleanup => {
  const cleanups: Cleanup[] = [];

  // Mobile-first: keep it extremely reliable.
  // Desktop: allow GSAP ScrollTrigger + Splitting.
  const enableGsap = !caps.reducedMotion && !caps.coarsePointer;

  // Always do a resilient split (only once per node).
  const splitTargets = Array.from(
    root.querySelectorAll<HTMLElement>('[data-split]')
  ).filter(el => !el.hasAttribute('data-splitting'));
  if (splitTargets.length > 0) {
    Splitting({ target: splitTargets });
  }

  const panels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-ih-panel]')
  );
  const words = Array.from(
    root.querySelectorAll<HTMLElement>('.ih-split .word')
  );

  if (enableGsap) {
    gsap.registerPlugin(ScrollTrigger);

    const triggers: ScrollTrigger[] = [];

    panels.forEach(panel => {
      const tween = gsap.fromTo(
        panel,
        { autoAlpha: 0, y: 64, scale: 0.97 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: panel,
            start: 'top 88%',
            end: 'top 55%',
            scrub: 0.8,
          },
        }
      );

      const st = (tween as TweenWithScrollTrigger).scrollTrigger;
      if (st) triggers.push(st);
    });

    words.forEach((word, index) => {
      const tween = gsap.fromTo(
        word,
        { y: 18, opacity: 0, rotateX: -12 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.6,
          delay: index * 0.02,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: word,
            start: 'top 94%',
            toggleActions: 'play none none none',
          },
        }
      );

      const st = (tween as TweenWithScrollTrigger).scrollTrigger;
      if (st) triggers.push(st);
    });

    const railItems = Array.from(
      root.querySelectorAll<HTMLElement>('[data-ih-rail-item]')
    );
    let lastProgress = 0;

    const railTrigger = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: self => {
        const progress = self.progress;
        const direction = progress >= lastProgress ? 1 : -1;
        lastProgress = progress;

        root.style.setProperty('--ih-progress', progress.toFixed(4));
        root.style.setProperty('--ih-direction', direction.toFixed(0));

        if (railItems.length > 0) {
          const idx = Math.min(
            railItems.length - 1,
            Math.max(0, Math.floor(progress * railItems.length))
          );
          railItems.forEach((item, i) =>
            item.classList.toggle('is-active', i === idx)
          );
        }
      },
    });

    triggers.push(railTrigger);
    ScrollTrigger.refresh();

    cleanups.push(() => {
      triggers.forEach(t => t.kill());
    });
  } else {
    // Reduced motion: avoid animated reveals entirely.
    if (caps.reducedMotion) {
      const onScroll = () => {
        const rect = root.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const progress =
          total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        root.style.setProperty('--ih-progress', progress.toFixed(4));
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      onScroll();

      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });

      return () => {
        cleanups.forEach(fn => fn());
      };
    }

    // Mobile / reduced motion path: IntersectionObserver-driven class toggles.
    // No GSAP ticker, no ScrollTrigger, no smooth scrolling.
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            entries => {
              entries.forEach(entry => {
                const el = entry.target as HTMLElement;
                el.classList.toggle('is-in', entry.isIntersecting);
              });
            },
            { threshold: 0.15 }
          )
        : null;

    const targets = [...panels, ...words];
    targets.forEach(el => {
      el.classList.add('ih-reveal');
      observer?.observe(el);
    });

    cleanups.push(() => {
      observer?.disconnect();
      targets.forEach(el => el.classList.remove('ih-reveal', 'is-in'));
    });

    // Keep rail progress driven by scroll position (no GSAP required).
    const onScroll = () => {
      const rect = root.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress =
        total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      root.style.setProperty('--ih-progress', progress.toFixed(4));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    });
  }

  // Mode buttons are always active (just a dataset toggle).
  const modeButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-ih-mode]')
  );
  const defaultMode = 'calm';
  root.dataset.mode = root.dataset.mode ?? defaultMode;
  modeButtons.forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === root.dataset.mode);
  });

  const onModeClick = (event: Event) => {
    const target = event.currentTarget as HTMLButtonElement;
    const mode = target.dataset.mode ?? defaultMode;
    root.dataset.mode = mode;
    modeButtons.forEach(btn =>
      btn.classList.toggle('is-active', btn === target)
    );
  };

  modeButtons.forEach(btn => btn.addEventListener('click', onModeClick));
  cleanups.push(() =>
    modeButtons.forEach(btn => btn.removeEventListener('click', onModeClick))
  );

  return () => {
    cleanups.forEach(fn => fn());
  };
};
