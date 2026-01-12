/**
 * Comprehensive Animation System
 * Scroll animations, parallax, reveal effects, and more
 */

import { networkAdapter } from '../utils/network-adapter';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AnimationConfig {
  /** Root margin for intersection observer */
  rootMargin: string;
  /** Threshold for triggering animation */
  threshold: number | number[];
  /** Default animation duration in ms */
  duration: number;
  /** Default easing function */
  easing: string;
  /** Whether to respect reduced motion preference */
  respectReducedMotion: boolean;
  /** Stagger delay for grouped animations */
  staggerDelay: number;
}

const defaultConfig: AnimationConfig = {
  rootMargin: '0px 0px -50px 0px',
  threshold: 0.1,
  duration: 600,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  respectReducedMotion: true,
  staggerDelay: 100,
};

let config = { ...defaultConfig };

export function setAnimationConfig(newConfig: Partial<AnimationConfig>) {
  config = { ...config, ...newConfig };
}

// ============================================================================
// REDUCED MOTION DETECTION
// ============================================================================

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldAnimate(): boolean {
  if (config.respectReducedMotion && prefersReducedMotion()) return false;
  return networkAdapter.shouldEnableAnimations();
}

// ============================================================================
// SCROLL ANIMATIONS
// ============================================================================

type AnimationType =
  | 'fade-in'
  | 'fade-in-up'
  | 'fade-in-down'
  | 'fade-in-left'
  | 'fade-in-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'flip-x'
  | 'flip-y'
  | 'rotate'
  | 'blur-in';

const animationStyles: Record<
  AnimationType,
  { initial: string; animate: string }
> = {
  'fade-in': {
    initial: 'opacity: 0;',
    animate: 'opacity: 1;',
  },
  'fade-in-up': {
    initial: 'opacity: 0; transform: translateY(30px);',
    animate: 'opacity: 1; transform: translateY(0);',
  },
  'fade-in-down': {
    initial: 'opacity: 0; transform: translateY(-30px);',
    animate: 'opacity: 1; transform: translateY(0);',
  },
  'fade-in-left': {
    initial: 'opacity: 0; transform: translateX(-30px);',
    animate: 'opacity: 1; transform: translateX(0);',
  },
  'fade-in-right': {
    initial: 'opacity: 0; transform: translateX(30px);',
    animate: 'opacity: 1; transform: translateX(0);',
  },
  'zoom-in': {
    initial: 'opacity: 0; transform: scale(0.9);',
    animate: 'opacity: 1; transform: scale(1);',
  },
  'zoom-out': {
    initial: 'opacity: 0; transform: scale(1.1);',
    animate: 'opacity: 1; transform: scale(1);',
  },
  'flip-x': {
    initial: 'opacity: 0; transform: perspective(400px) rotateX(90deg);',
    animate: 'opacity: 1; transform: perspective(400px) rotateX(0);',
  },
  'flip-y': {
    initial: 'opacity: 0; transform: perspective(400px) rotateY(90deg);',
    animate: 'opacity: 1; transform: perspective(400px) rotateY(0);',
  },
  rotate: {
    initial: 'opacity: 0; transform: rotate(-10deg) scale(0.9);',
    animate: 'opacity: 1; transform: rotate(0) scale(1);',
  },
  'blur-in': {
    initial: 'opacity: 0; filter: blur(10px);',
    animate: 'opacity: 1; filter: blur(0);',
  },
};

/**
 * Setup scroll animations using IntersectionObserver
 * Elements with class 'scroll-animate' will fade in when scrolled into view
 */
export function setupScrollAnimations(selector = '.scroll-animate') {
  if (!shouldAnimate()) {
    // Just show elements without animation
    document.querySelectorAll(selector).forEach(el => {
      (el as HTMLElement).style.opacity = '1';
    });
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: config.rootMargin,
    threshold: config.threshold,
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        const animationType =
          (el.dataset.animation as AnimationType) || 'fade-in-up';
        const delay = parseInt(el.dataset.delay || '0', 10);

        setTimeout(() => {
          el.style.cssText += animationStyles[animationType]?.animate || '';
          el.classList.add('animated');
        }, delay);

        observer.unobserve(el);
      }
    });
  }, observerOptions);

  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    const htmlEl = el as HTMLElement;
    const animationType =
      (htmlEl.dataset.animation as AnimationType) || 'fade-in-up';
    const duration = parseInt(
      htmlEl.dataset.duration || String(config.duration),
      10
    );

    // Apply initial state
    htmlEl.style.cssText += `
      ${animationStyles[animationType]?.initial || ''}
      transition: all ${duration}ms ${config.easing};
    `;

    observer.observe(el);
  });

  return observer;
}

/**
 * Setup staggered animations for child elements
 */
export function setupStaggeredAnimations(
  containerSelector: string,
  childSelector = '*',
  baseDelay = 0
) {
  if (!shouldAnimate()) return;

  const containers = document.querySelectorAll(containerSelector);

  containers.forEach(container => {
    const children = container.querySelectorAll(childSelector);
    children.forEach((child, index) => {
      const el = child as HTMLElement;
      el.dataset.delay = String(baseDelay + index * config.staggerDelay);
      el.classList.add('scroll-animate');
    });
  });

  setupScrollAnimations();
}

// ============================================================================
// PARALLAX EFFECTS
// ============================================================================

interface ParallaxOptions {
  speed: number;
  direction: 'vertical' | 'horizontal';
  reverse: boolean;
}

const defaultParallaxOptions: ParallaxOptions = {
  speed: 0.5,
  direction: 'vertical',
  reverse: false,
};

/**
 * Setup parallax scrolling effects
 */
export function setupParallax(selector = '.parallax') {
  if (!shouldAnimate()) return;

  const elements = document.querySelectorAll<HTMLElement>(selector);

  const handleScroll = () => {
    const scrollY = window.scrollY;

    elements.forEach(el => {
      const speed = parseFloat(
        el.dataset.speed || String(defaultParallaxOptions.speed)
      );
      const direction =
        (el.dataset.direction as 'vertical' | 'horizontal') || 'vertical';
      const reverse = el.dataset.reverse === 'true';

      const offset = scrollY * speed * (reverse ? -1 : 1);

      if (direction === 'vertical') {
        el.style.transform = `translateY(${offset}px)`;
      } else {
        el.style.transform = `translateX(${offset}px)`;
      }
    });
  };

  // Use requestAnimationFrame for smooth scrolling
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );

  handleScroll();
}

/**
 * Advanced parallax with viewport-based calculations
 */
export function setupAdvancedParallax(selector = '.parallax-advanced') {
  if (!shouldAnimate()) return;

  const elements = document.querySelectorAll<HTMLElement>(selector);

  const handleScroll = () => {
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate progress (0 = element at bottom of viewport, 1 = element at top)
      const progress =
        (viewportHeight - rect.top) / (viewportHeight + rect.height);
      const clampedProgress = Math.max(0, Math.min(1, progress));

      const speed = parseFloat(el.dataset.speed || '100');
      const offset = (clampedProgress - 0.5) * speed;

      el.style.transform = `translateY(${offset}px)`;
    });
  };

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );

  handleScroll();
}

// ============================================================================
// SCROLL PROGRESS
// ============================================================================

/**
 * Create a scroll progress indicator
 */
export function setupScrollProgress(selector = '.scroll-progress') {
  const progressBars = document.querySelectorAll<HTMLElement>(selector);
  if (progressBars.length === 0) return;

  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;

    progressBars.forEach(bar => {
      bar.style.width = `${progress}%`;
      bar.setAttribute('aria-valuenow', String(Math.round(progress)));
    });
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

/**
 * Create reading progress for article content
 */
export function setupReadingProgress(
  contentSelector: string,
  progressSelector = '.reading-progress'
) {
  const content = document.querySelector<HTMLElement>(contentSelector);
  const progressBar = document.querySelector<HTMLElement>(progressSelector);

  if (!content || !progressBar) return;

  const updateProgress = () => {
    const rect = content.getBoundingClientRect();
    const contentTop = rect.top + window.scrollY;
    const contentHeight = rect.height;
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;

    // Calculate progress within the content
    const progress = Math.max(
      0,
      Math.min(
        100,
        ((scrollY - contentTop + viewportHeight) / contentHeight) * 100
      )
    );

    progressBar.style.width = `${progress}%`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// ============================================================================
// CURSOR EFFECTS
// ============================================================================

/**
 * Create a custom cursor follower
 */
export function setupCursorFollower(selector = '.cursor-follower') {
  if (!shouldAnimate()) return;

  const cursor = document.querySelector<HTMLElement>(selector);
  if (!cursor) return;

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const animate = () => {
    // Smooth following with lerp
    const ease = 0.15;
    cursorX += (mouseX - cursorX) * ease;
    cursorY += (mouseY - cursorY) * ease;

    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
    requestAnimationFrame(animate);
  };

  animate();

  // Handle hover states
  const hoverTargets = document.querySelectorAll('[data-cursor]');
  hoverTargets.forEach(target => {
    target.addEventListener('mouseenter', () => {
      const cursorType = (target as HTMLElement).dataset.cursor;
      cursor.dataset.state = cursorType || 'hover';
    });
    target.addEventListener('mouseleave', () => {
      cursor.dataset.state = '';
    });
  });
}

/**
 * Create spotlight effect following cursor
 */
export function setupSpotlightEffect(containerSelector: string) {
  if (!shouldAnimate()) return;

  const container = document.querySelector<HTMLElement>(containerSelector);
  if (!container) return;

  container.addEventListener('mousemove', e => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    container.style.setProperty('--spotlight-x', `${x}px`);
    container.style.setProperty('--spotlight-y', `${y}px`);
  });
}

// ============================================================================
// MAGNETIC ELEMENTS
// ============================================================================

/**
 * Create magnetic effect on elements
 */
export function setupMagneticEffect(selector = '.magnetic') {
  if (!shouldAnimate()) return;

  const elements = document.querySelectorAll<HTMLElement>(selector);

  elements.forEach(el => {
    const strength = parseFloat(el.dataset.strength || '30');

    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) / rect.width;
      const deltaY = (e.clientY - centerY) / rect.height;

      el.style.transform = `translate(${deltaX * strength}px, ${deltaY * strength}px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.3s ease-out';
      el.style.transform = 'translate(0, 0)';
      setTimeout(() => {
        el.style.transition = '';
      }, 300);
    });
  });
}

// ============================================================================
// TILT EFFECTS
// ============================================================================

/**
 * Create 3D tilt effect on hover
 */
export function setupTiltEffect(selector = '.tilt') {
  if (!shouldAnimate()) return;

  const elements = document.querySelectorAll<HTMLElement>(selector);

  elements.forEach(el => {
    const maxTilt = parseFloat(el.dataset.maxTilt || '10');
    const perspective = el.dataset.perspective || '1000px';
    const scale = parseFloat(el.dataset.scale || '1.02');

    el.style.transformStyle = 'preserve-3d';

    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * maxTilt;
      const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * maxTilt;

      el.style.transform = `perspective(${perspective}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.5s ease-out';
      el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
      setTimeout(() => {
        el.style.transition = '';
      }, 500);
    });
  });
}

// ============================================================================
// TEXT ANIMATIONS
// ============================================================================

/**
 * Split text into individual characters for animation
 */
export function splitTextForAnimation(
  selector: string,
  wrapperClass = 'char-wrapper'
): HTMLElement[] {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  const chars: HTMLElement[] = [];

  elements.forEach(el => {
    const text = el.textContent || '';
    el.textContent = '';
    el.setAttribute('aria-label', text);

    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.className = wrapperClass;
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.transitionDelay = `${i * 30}ms`;
      el.appendChild(span);
      chars.push(span);
    });
  });

  return chars;
}

/**
 * Animate text with typewriter effect
 */
export function typewriterEffect(
  element: HTMLElement,
  text: string,
  speed = 50
): Promise<void> {
  return new Promise(resolve => {
    let index = 0;
    element.textContent = '';

    const type = () => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    };

    type();
  });
}

/**
 * Scramble text effect
 */
export function scrambleText(
  element: HTMLElement,
  finalText: string,
  duration = 1000
): Promise<void> {
  return new Promise(resolve => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const steps = 20;
    const stepDuration = duration / steps;
    let step = 0;

    const scramble = () => {
      if (step < steps) {
        const progress = step / steps;
        const revealed = Math.floor(finalText.length * progress);

        let result = '';
        for (let i = 0; i < finalText.length; i++) {
          if (i < revealed) {
            result += finalText[i];
          } else if (finalText[i] === ' ') {
            result += ' ';
          } else {
            result += chars[Math.floor(Math.random() * chars.length)];
          }
        }

        element.textContent = result;
        step++;
        setTimeout(scramble, stepDuration);
      } else {
        element.textContent = finalText;
        resolve();
      }
    };

    scramble();
  });
}

// ============================================================================
// COUNTER ANIMATIONS
// ============================================================================

/**
 * Animate a number counter
 */
export function animateCounter(
  element: HTMLElement,
  end: number,
  options: {
    start?: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    easing?: (t: number) => number;
  } = {}
): void {
  if (!shouldAnimate()) {
    element.textContent = `${options.prefix || ''}${end.toFixed(options.decimals || 0)}${options.suffix || ''}`;
    return;
  }

  const {
    start = 0,
    duration = 2000,
    prefix = '',
    suffix = '',
    decimals = 0,
    easing = t => 1 - Math.pow(1 - t, 3), // Ease out cubic
  } = options;

  const startTime = performance.now();

  const update = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    const current = start + (end - start) * easedProgress;

    element.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };

  requestAnimationFrame(update);
}

/**
 * Setup counter animations on scroll
 */
export function setupScrollCounters(selector = '.count-up') {
  const elements = document.querySelectorAll<HTMLElement>(selector);

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const end = parseFloat(el.dataset.value || el.textContent || '0');
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          const duration = parseInt(el.dataset.duration || '2000', 10);
          const prefix = el.dataset.prefix || '';
          const suffix = el.dataset.suffix || '';

          animateCounter(el, end, { decimals, duration, prefix, suffix });
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  elements.forEach(el => observer.observe(el));
}

// ============================================================================
// SMOOTH SCROLL
// ============================================================================

/**
 * Smooth scroll to element
 */
export function smoothScrollTo(
  target: HTMLElement | string,
  options: {
    offset?: number;
    duration?: number;
    easing?: (t: number) => number;
  } = {}
): Promise<void> {
  const {
    offset = 0,
    duration = 800,
    easing = t => 1 - Math.pow(1 - t, 3),
  } = options;

  const element =
    typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return Promise.resolve();

  const start = window.scrollY;
  const elementTop = element.getBoundingClientRect().top + start;
  const end = elementTop - offset;
  const distance = end - start;
  const startTime = performance.now();

  return new Promise(resolve => {
    const scroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      window.scrollTo(0, start + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(scroll);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(scroll);
  });
}

/**
 * Setup smooth scroll for anchor links
 */
export function setupSmoothScroll(selector = 'a[href^="#"]', offset = 80) {
  document.querySelectorAll<HTMLAnchorElement>(selector).forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        smoothScrollTo(target as HTMLElement, { offset });
        history.pushState(null, '', href);
      }
    });
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all animations
 */
export function initializeAnimations() {
  setupScrollAnimations();
  setupScrollProgress();
  setupScrollCounters();
  setupSmoothScroll();
}

// Run on initial load if not using View Transitions
if (typeof document !== 'undefined') {
  if (document.readyState === 'complete') {
    initializeAnimations();
  } else {
    document.addEventListener('DOMContentLoaded', initializeAnimations);
  }

  // Run on View Transitions navigation
  document.addEventListener('astro:page-load', initializeAnimations);
}
