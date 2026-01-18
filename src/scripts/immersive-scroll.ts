import Lenis from 'lenis';
import Splitting from 'splitting';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

type Cleanup = () => void;

const setupScrollMotion = (): Cleanup | null => {
  const root = document.querySelector<HTMLElement>('[data-ih]');
  if (!root) return null;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  gsap.registerPlugin(ScrollTrigger);

  let lenis: Lenis | null = null;
  let rafHandler: ((time: number) => void) | null = null;

  if (!reducedMotion) {
    lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1,
      normalizeWheel: true,
    });

    rafHandler = (time: number) => {
      lenis?.raf(time);
    };

    gsap.ticker.add(rafHandler);
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ScrollTrigger.update);
  }

  Splitting({ target: root.querySelectorAll('[data-split]') });

  const panels = Array.from(
    root.querySelectorAll<HTMLElement>('[data-ih-panel]')
  );

  panels.forEach(panel => {
    gsap.fromTo(
      panel,
      { autoAlpha: 0, y: 48 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: panel,
          start: 'top 85%',
          end: 'top 55%',
          scrub: reducedMotion ? false : true,
        },
      }
    );
  });

  const words = Array.from(
    root.querySelectorAll<HTMLElement>('.ih-split .word')
  );
  words.forEach((word, index) => {
    gsap.fromTo(
      word,
      { y: 14, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        delay: index * 0.015,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: word,
          start: 'top 92%',
          end: 'top 70%',
          scrub: false,
          once: true,
        },
      }
    );
  });

  ScrollTrigger.refresh();

  return () => {
    ScrollTrigger.getAll().forEach((trigger: ScrollTrigger) => trigger.kill());
    if (lenis) lenis.destroy();
    if (rafHandler) gsap.ticker.remove(rafHandler);
  };
};

let cleanup: Cleanup | null = null;

const mount = () => {
  cleanup?.();
  cleanup = setupScrollMotion();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}

document.addEventListener('astro:page-load', mount);

document.addEventListener('astro:before-swap', () => {
  cleanup?.();
  cleanup = null;
});
