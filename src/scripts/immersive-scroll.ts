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
  const railItems = Array.from(
    root.querySelectorAll<HTMLElement>('[data-ih-rail-item]')
  );
  const modeButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-ih-mode]')
  );

  let lastPointerX = window.innerWidth * 0.5;
  let lastPointerY = window.innerHeight * 0.5;
  let lastPointerTime = performance.now();
  let energyTarget = 0;
  let energyValue = 0;
  let lastProgress = 0;

  panels.forEach(panel => {
    gsap.fromTo(
      panel,
      { autoAlpha: 0, y: 64, scale: 0.97 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: panel,
          start: 'top 88%',
          end: 'top 50%',
          scrub: reducedMotion ? false : 0.8,
        },
      }
    );
  });

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
        railItems.forEach((item, index) => {
          item.classList.toggle('is-active', index === idx);
        });
      }
    },
  });

  const words = Array.from(
    root.querySelectorAll<HTMLElement>('.ih-split .word')
  );
  words.forEach((word, index) => {
    gsap.fromTo(
      word,
      { y: 20, opacity: 0, rotateX: -15 },
      {
        y: 0,
        opacity: 1,
        rotateX: 0,
        duration: 0.7,
        delay: index * 0.02,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: word,
          start: 'top 94%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  ScrollTrigger.refresh();

  const defaultMode = 'calm';
  root.dataset.mode = root.dataset.mode ?? defaultMode;
  modeButtons.forEach(button => {
    button.classList.toggle(
      'is-active',
      button.dataset.mode === root.dataset.mode
    );
  });

  const onPointerMove = (event: PointerEvent) => {
    const now = performance.now();
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    const dt = Math.max(16, now - lastPointerTime);
    const speed = Math.min(1.5, Math.hypot(dx, dy) / dt);
    energyTarget = speed;

    root.style.setProperty(
      '--ih-pointer-x',
      (event.clientX / Math.max(1, window.innerWidth) - 0.5).toFixed(4)
    );
    root.style.setProperty(
      '--ih-pointer-y',
      (event.clientY / Math.max(1, window.innerHeight) - 0.5).toFixed(4)
    );
    root.style.setProperty('--ih-energy', speed.toFixed(4));

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerTime = now;
  };

  const onModeClick = (event: Event) => {
    const target = event.currentTarget as HTMLButtonElement;
    const mode = target.dataset.mode ?? defaultMode;
    root.dataset.mode = mode;
    modeButtons.forEach(button => {
      button.classList.toggle('is-active', button === target);
    });
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  modeButtons.forEach(button => {
    button.addEventListener('click', onModeClick);
  });

  const energyTicker = () => {
    energyValue += (energyTarget - energyValue) * 0.08;
    energyTarget *= 0.88;
    root.style.setProperty('--ih-energy-soft', energyValue.toFixed(4));
  };

  gsap.ticker.add(energyTicker);

  return () => {
    ScrollTrigger.getAll().forEach((trigger: ScrollTrigger) => trigger.kill());
    railTrigger.kill();
    window.removeEventListener('pointermove', onPointerMove);
    modeButtons.forEach(button => {
      button.removeEventListener('click', onModeClick);
    });
    gsap.ticker.remove(energyTicker);
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
