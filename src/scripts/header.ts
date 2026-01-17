/**
 * Enhanced Header Navigation Script
 * Uses our utility library for keyboard shortcuts, accessibility, and media queries
 */

import {
  onKeyboardShortcut,
  onMediaQueryChange,
  onScroll,
} from '../utils/events';
import { createFocusTrap, announce } from '../utils/a11y';
import { breakpoints, getCurrentBreakpoint } from '../utils/media';

class EnhancedHeader {
  private toggle: HTMLButtonElement | null;
  private menu: HTMLElement | null;
  private header: HTMLElement | null;
  private focusTrap: ReturnType<typeof createFocusTrap> | null = null;
  private cleanupFunctions: (() => void)[] = [];
  private scrollYBeforeOpen = 0;
  private abortController = new AbortController();

  constructor() {
    this.toggle = document.getElementById(
      'mobile-menu-button'
    ) as HTMLButtonElement | null;
    this.menu = document.getElementById('mobile-menu');
    this.header = document.querySelector('header');

    if (this.toggle && this.menu) {
      this.init();
    }
  }

  private init(): void {
    const { signal } = this.abortController;

    // Mobile menu toggle
    this.toggle!.addEventListener('click', () => this.toggleMenu(), { signal });

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Set up responsive behavior
    this.setupResponsiveBehavior();

    // Set up scroll behavior for sticky header
    this.setupScrollBehavior();

    // Close menu when clicking links
    this.menu!.querySelectorAll('a').forEach(link => {
      link.addEventListener(
        'click',
        () => {
          setTimeout(() => this.closeMenu(), 100);
        },
        { signal }
      );
    });

    // Close menu when clicking outside
    document.addEventListener(
      'click',
      event => {
        const target = event.target as Node;
        if (
          !this.menu!.hasAttribute('hidden') &&
          !this.menu!.contains(target) &&
          !this.toggle!.contains(target)
        ) {
          this.closeMenu();
        }
      },
      { signal }
    );
  }

  private setupKeyboardShortcuts(): void {
    // Close menu on Escape
    const escapeCleanup = onKeyboardShortcut({ key: 'Escape' }, () => {
      if (!this.menu!.hasAttribute('hidden')) {
        this.closeMenu();
      }
    });
    this.cleanupFunctions.push(escapeCleanup);

    // Toggle menu with Ctrl+M for keyboard users
    const toggleShortcut = onKeyboardShortcut({ key: 'm', ctrl: true }, () => {
      // Only on mobile
      const breakpoint = getCurrentBreakpoint();
      if (breakpoint === 'sm' || breakpoint === 'xs') {
        this.toggleMenu();
      }
    });
    this.cleanupFunctions.push(toggleShortcut);

    // Skip to main content with Alt+1
    const skipCleanup = onKeyboardShortcut({ key: '1', alt: true }, () => {
      const main = document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus();
        announce('Skipped to main content', 'polite');
      }
    });
    this.cleanupFunctions.push(skipCleanup);
  }

  private setupResponsiveBehavior(): void {
    // Close mobile menu when transitioning to desktop
    const mdBreakpoint = breakpoints.md;
    const mediaQueryCleanup = onMediaQueryChange(
      `(min-width: ${mdBreakpoint}px)`,
      matches => {
        if (matches && !this.menu!.hasAttribute('hidden')) {
          this.closeMenu();
        }
      }
    );
    this.cleanupFunctions.push(mediaQueryCleanup);
  }

  private setupScrollBehavior(): void {
    if (!this.header) return;

    let lastScrollY = 0;
    let ticking = false;

    const scrollCleanup = onScroll(({ y }) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Add/remove shadow based on scroll position
          if (y > 0) {
            this.header!.classList.add('scrolled');
          } else {
            this.header!.classList.remove('scrolled');
          }

          // Optional: Hide header on scroll down, show on scroll up
          if (!this.isMenuOpen()) {
            if (y > lastScrollY && y > 100) {
              this.header!.classList.add('header-hidden');
            } else {
              this.header!.classList.remove('header-hidden');
            }
          } else {
            this.header!.classList.remove('header-hidden');
          }

          lastScrollY = y;
          ticking = false;
        });
        ticking = true;
      }
    }, 100);
    this.cleanupFunctions.push(scrollCleanup);
  }

  private toggleMenu(): void {
    const isHidden = this.menu!.hasAttribute('hidden');
    if (isHidden) {
      this.openMenu();
    } else {
      this.closeMenu();
    }
  }

  private openMenu(): void {
    this.menu!.removeAttribute('hidden');
    this.toggle!.setAttribute('aria-expanded', 'true');

    this.lockScroll();

    // Create focus trap for accessibility
    this.focusTrap = createFocusTrap(this.menu!, {
      escapeDeactivates: true,
      onEscape: () => this.closeMenu(),
    });
    this.focusTrap.activate();

    // Focus first link
    const firstLink = this.menu!.querySelector('a');
    if (firstLink) {
      setTimeout(() => firstLink.focus(), 50);
    }

    // Announce for screen readers
    announce('Navigation menu opened', 'polite');
  }

  private closeMenu(): void {
    this.menu!.setAttribute('hidden', '');
    this.toggle!.setAttribute('aria-expanded', 'false');

    this.unlockScroll();

    // Deactivate focus trap
    if (this.focusTrap) {
      this.focusTrap.deactivate();
      this.focusTrap = null;
    }

    // Return focus to toggle button
    this.toggle!.focus();

    // Announce for screen readers
    announce('Navigation menu closed', 'polite');
  }

  public destroy(): void {
    // Clean up all event listeners
    this.cleanupFunctions.forEach(fn => fn());
    this.cleanupFunctions = [];

    // Abort any DOM event listeners installed by this instance.
    this.abortController.abort();

    if (this.focusTrap) {
      this.focusTrap.deactivate();
      this.focusTrap = null;
    }

    // Ensure the menu is not left open when we re-init.
    if (this.menu && !this.menu.hasAttribute('hidden')) {
      this.menu.setAttribute('hidden', '');
      this.toggle?.setAttribute('aria-expanded', 'false');
    }

    this.unlockScroll();
  }

  private isMenuOpen(): boolean {
    return !!this.menu && !this.menu.hasAttribute('hidden');
  }

  private lockScroll(): void {
    // iOS-friendly scroll lock: fix the body and restore position on close.
    // Keeps the background from scrolling behind an open mobile menu.
    this.scrollYBeforeOpen = window.scrollY || 0;

    document.body.classList.add('mobile-menu-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollYBeforeOpen}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  private unlockScroll(): void {
    if (!document.body.classList.contains('mobile-menu-open')) return;

    document.body.classList.remove('mobile-menu-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';

    const userAgent = window.navigator?.userAgent ?? '';
    const isJsdom = userAgent.toLowerCase().includes('jsdom');
    if (!isJsdom && typeof window.scrollTo === 'function') {
      window.scrollTo(0, this.scrollYBeforeOpen);
    }
  }
}

// Initialize on DOM load and Astro page transitions
let headerInstance: EnhancedHeader | null = null;

function initHeader() {
  // Destroy previous instance if exists
  if (headerInstance) {
    headerInstance.destroy();
  }
  headerInstance = new EnhancedHeader();
}

const runHeaderInit = () => initHeader();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runHeaderInit);
} else {
  runHeaderInit();
}

document.addEventListener('astro:page-load', runHeaderInit);

export { EnhancedHeader };
