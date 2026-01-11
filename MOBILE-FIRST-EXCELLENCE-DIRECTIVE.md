# Mobile-First Excellence Directive
## Premium Mobile Experience Development Guide for dontforgetyourtowel

---

## Executive Summary

This directive establishes the complete mobile-first development strategy for an Astro-based premium web application utilizing Preact, Solid.js, and Tailwind CSS. The goal: deliver a mobile experience so exceptional that users instinctively say "WOW" while maintaining enterprise-grade performance, accessibility, and scalability.

**Stack Analysis:**
- **Framework**: Astro 5.16.8 (Islands Architecture, Static-First)
- **Interactive Frameworks**: Preact 10.28.2 (Component Islands), Solid.js 1.9.10 (Reactive Primitives)
- **Styling**: Tailwind CSS 3.4.19 + Custom Design System
- **Build Target**: Static generation with progressive enhancement
- **Font Stack**: Inter (body), Space Grotesk/DM Serif Display (headings), JetBrains Mono (code)
- **Color System**: Custom semantic tokens with dark-mode-first approach

---

## I. Mobile-First Architecture Principles

### A. Performance Budget (Mobile 3G Network Baseline)

**Critical Thresholds:**
```
First Contentful Paint (FCP):     < 1.2s
Largest Contentful Paint (LCP):   < 2.0s
Time to Interactive (TTI):        < 3.0s
First Input Delay (FID):          < 100ms
Cumulative Layout Shift (CLS):    < 0.1
Total Bundle Size (Initial):      < 150KB (gzipped)
JavaScript Payload (Main):        < 50KB (gzipped)
```

**Implementation Strategy:**
1. **Island Architecture Optimization**
   - Only hydrate interactive components on mobile viewport
   - Use `client:visible` for below-the-fold interactions
   - Implement `client:media="(min-width: 768px)"` for desktop-only features
   - Leverage `client:idle` for non-critical interactivity

2. **Code Splitting by Viewport**
   ```astro
   // Mobile-first component loading
   import MobileHero from '../components/mobile/Hero.astro';
   import DesktopHero from '../components/desktop/Hero.astro';

   const isMobile = Astro.request.headers.get('user-agent')?.includes('Mobile');
   ```

3. **Resource Prioritization**
   - Critical CSS inline in `<head>` (< 14KB)
   - Defer non-critical fonts with `font-display: swap`
   - Preconnect to critical origins
   - Lazy load images below fold with native `loading="lazy"`

### B. Touch-First Interaction Design

**Minimum Touch Target Specifications:**
- **Buttons/CTAs**: 48px × 48px (minimum 44px × 44px)
- **Form Inputs**: 48px height, full-width with 16px padding
- **Navigation Items**: 44px × 44px minimum
- **Spacing Between Targets**: 8px minimum gap
- **Card Tap Areas**: Full card surface, not just text

**Implementation Pattern:**
```typescript
// Tailwind configuration addition
module.exports = {
  theme: {
    extend: {
      spacing: {
        'touch': '48px',      // Standard touch target
        'touch-min': '44px',  // Minimum touch target
        'touch-gap': '8px',   // Minimum spacing
      },
      minHeight: {
        'touch': '48px',
        'touch-min': '44px',
      },
      minWidth: {
        'touch': '48px',
        'touch-min': '44px',
      }
    }
  }
}
```

**Apply to ALL Interactive Elements:**
```astro
<!-- ModernButton.astro enhancement -->
<button
  class={`
    min-h-touch sm:min-h-[44px]
    px-6 py-3
    touch-manipulation
    active:scale-95
    transition-transform duration-150
    ${className}
  `}
>
  <slot />
</button>
```

### C. Progressive Enhancement Layers

**Layer 1: HTML Foundation (Works Everywhere)**
- Semantic HTML5 structure
- Native form validation
- Server-rendered content
- No-JS navigation (anchor links)

**Layer 2: CSS Enhancement (Modern Browsers)**
- CSS Grid & Flexbox layouts
- CSS custom properties for theming
- Responsive images with `<picture>`
- CSS animations (respecting `prefers-reduced-motion`)

**Layer 3: JavaScript Interactivity (Capable Devices)**
- Preact islands for dynamic UI
- Solid.js for reactive data (e.g., calculators, forms)
- Service Worker for offline functionality
- Web Vitals tracking

**Layer 4: Advanced Features (High-End Devices)**
- 3D transforms and animations
- WebGL effects (demo-lab only)
- Advanced gesture recognition
- Real-time collaboration features

---

## II. Mobile UI/UX Component System

### A. Responsive Typography Scale

**Current Issues:**
- Typography uses `clamp()` but needs mobile optimization
- Line heights need adjustment for small screens
- Letter spacing too tight on mobile

**Mobile-First Typography System:**
```css
/* Mobile-optimized fluid typography */
@layer base {
  html {
    /* Base: 16px on mobile, 18px on desktop */
    font-size: clamp(16px, 1vw + 14px, 18px);
  }

  h1 {
    /* Mobile: 32px → Desktop: 56px */
    font-size: clamp(2rem, 5vw + 1rem, 3.5rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
    margin-bottom: 0.5em;
  }

  h2 {
    /* Mobile: 28px → Desktop: 42px */
    font-size: clamp(1.75rem, 4vw + 0.75rem, 2.625rem);
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  h3 {
    /* Mobile: 24px → Desktop: 32px */
    font-size: clamp(1.5rem, 3vw + 0.5rem, 2rem);
    line-height: 1.3;
    letter-spacing: -0.015em;
  }

  p {
    /* Mobile: 16px → Desktop: 18px */
    font-size: clamp(1rem, 0.5vw + 0.875rem, 1.125rem);
    line-height: 1.6; /* Increased for mobile readability */
    margin-bottom: 1.25em;
  }

  /* Mobile-specific: prevent text zoom on iOS */
  input, select, textarea {
    font-size: 16px; /* Prevents iOS zoom on focus */
  }
}
```

### B. Mobile Navigation System

**Three-Tier Navigation Strategy:**

**1. Primary Header (Sticky, Collapsible)**
```astro
---
// components/mobile/MobileHeader.astro
---
<header
  class="
    fixed top-0 left-0 right-0 z-50
    bg-zinc-950/95 backdrop-blur-lg
    border-b border-white/10
    transition-transform duration-300
    safe-area-inset-top
  "
  data-header
>
  <div class="flex items-center justify-between h-16 px-4">
    <a href="/" class="min-h-touch min-w-touch flex items-center justify-center -ml-3">
      <img src="/logo.svg" alt="Logo" class="h-8 w-auto" />
    </a>

    <button
      type="button"
      class="min-h-touch min-w-touch flex items-center justify-center -mr-3"
      aria-label="Open menu"
      data-menu-toggle
    >
      <svg class="w-6 h-6" />
    </button>
  </div>
</header>

<style>
  /* Auto-hide on scroll down */
  header[data-scrolled="down"] {
    transform: translateY(-100%);
  }

  /* iOS safe area support */
  @supports (padding: max(0px)) {
    header {
      padding-top: max(0px, env(safe-area-inset-top));
    }
  }
</style>
```

**2. Full-Screen Mobile Menu**
```astro
---
// components/mobile/MobileMenu.astro
---
<div
  class="
    fixed inset-0 z-40
    bg-zinc-950
    translate-x-full
    transition-transform duration-300 ease-out
    safe-area-inset
  "
  data-mobile-menu
  aria-hidden="true"
>
  <nav class="flex flex-col h-full pt-20 pb-8 px-6 overflow-y-auto">
    <!-- Primary Navigation -->
    <ul class="space-y-2 flex-1">
      <li>
        <a
          href="/services/"
          class="
            flex items-center min-h-touch px-4 rounded-lg
            text-lg font-semibold text-white
            active:bg-white/10
            transition-colors
          "
        >
          Services
        </a>
      </li>
      <!-- More nav items -->
    </ul>

    <!-- Bottom CTA -->
    <div class="space-y-3 pt-6 border-t border-white/10">
      <a
        href="/contact/"
        class="
          flex items-center justify-center
          min-h-touch rounded-lg
          bg-accent-600 text-white font-semibold
          active:scale-95 transition-transform
        "
      >
        Get Started
      </a>
    </div>
  </nav>
</div>

<style>
  [data-mobile-menu][data-open="true"] {
    transform: translateX(0);
  }

  /* Prevent scroll when menu open */
  body:has([data-mobile-menu][data-open="true"]) {
    overflow: hidden;
  }
</style>
```

**3. Bottom Navigation Bar (Optional for App-Like Experience)**
```astro
<nav
  class="
    md:hidden fixed bottom-0 left-0 right-0 z-40
    bg-zinc-950/95 backdrop-blur-lg
    border-t border-white/10
    safe-area-inset-bottom
  "
  aria-label="Bottom navigation"
>
  <div class="grid grid-cols-4 h-16">
    <a href="/" class="flex flex-col items-center justify-center gap-1 text-xs">
      <HomeIcon class="w-5 h-5" />
      <span>Home</span>
    </a>
    <!-- More tabs -->
  </div>
</nav>
```

### C. Form Optimization for Mobile

**Mobile Form Best Practices:**

```astro
---
// components/forms/MobileOptimizedInput.astro
interface Props {
  type: 'text' | 'email' | 'tel' | 'number';
  label: string;
  name: string;
  required?: boolean;
  autocomplete?: string;
}

const { type, label, name, required, autocomplete } = Astro.props;
---

<div class="space-y-2">
  <label
    for={name}
    class="block text-sm font-medium text-zinc-300"
  >
    {label}
    {required && <span class="text-accent-500">*</span>}
  </label>

  <input
    type={type}
    id={name}
    name={name}
    required={required}
    autocomplete={autocomplete}
    class="
      w-full min-h-touch
      px-4 py-3
      text-base /* Prevent iOS zoom */
      bg-zinc-900/50
      border border-white/10
      rounded-lg
      text-white
      placeholder:text-zinc-500
      focus:border-accent-500
      focus:ring-2
      focus:ring-accent-500/20
      focus:outline-none
      transition-colors
    "
    inputmode={type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'text'}
    enterkeyhint={type === 'email' ? 'next' : 'done'}
  />
</div>
```

**Smart Keyboard Triggers:**
```html
<!-- Email with email keyboard -->
<input type="email" inputmode="email" autocomplete="email" />

<!-- Phone with numeric keyboard -->
<input type="tel" inputmode="tel" autocomplete="tel" />

<!-- Numbers only -->
<input type="text" inputmode="numeric" pattern="[0-9]*" />

<!-- Decimal numbers -->
<input type="text" inputmode="decimal" />

<!-- URL with .com shortcut -->
<input type="url" inputmode="url" autocomplete="url" />

<!-- Search with search button -->
<input type="search" inputmode="search" enterkeyhint="search" />
```

### D. Card Component Mobile Optimization

**Enhanced ModernCard.astro:**
```astro
---
// components/ui/ModernCard.astro
interface Props {
  variant?: 'glass' | 'solid' | 'outline';
  className?: string;
  clickable?: boolean;
  href?: string;
}

const { variant = 'glass', className = '', clickable = false, href } = Astro.props;
const Tag = href ? 'a' : 'div';
---

<Tag
  href={href}
  class:list={[
    'block rounded-2xl transition-all duration-300',
    {
      'bg-white/5 backdrop-blur-lg border border-white/10': variant === 'glass',
      'bg-zinc-900/90 border border-white/10': variant === 'solid',
      'bg-transparent border border-white/20': variant === 'outline',
      'active:scale-98 active:bg-white/10': clickable || href,
      'cursor-pointer': clickable || href,
    },
    className
  ]}
  {...(clickable && { role: 'button', tabindex: '0' })}
>
  <slot />
</Tag>

<style>
  /* Mobile-specific tap highlight */
  @media (max-width: 768px) {
    a, [role="button"] {
      -webkit-tap-highlight-color: rgba(255, 255, 255, 0.1);
    }
  }

  /* Active state performance optimization */
  .active\:scale-98:active {
    transform: scale(0.98);
  }
</style>
```

### E. Image Optimization Strategy

**Responsive Image Component:**
```astro
---
// components/ui/MobileOptimizedImage.astro
import { Image } from 'astro:assets';

interface Props {
  src: ImageMetadata | string;
  alt: string;
  widths?: number[];
  sizes?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  aspectRatio?: string;
}

const {
  src,
  alt,
  widths = [320, 640, 768, 1024, 1280, 1536],
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  loading = 'lazy',
  priority = false,
  aspectRatio = '16/9'
} = Astro.props;
---

<picture>
  <!-- WebP sources for modern browsers -->
  <source
    type="image/webp"
    srcset={widths.map(w => `${src}?w=${w}&format=webp ${w}w`).join(', ')}
    sizes={sizes}
  />

  <!-- Fallback -->
  <Image
    src={src}
    alt={alt}
    widths={widths}
    sizes={sizes}
    loading={priority ? 'eager' : loading}
    decoding="async"
    class="w-full h-auto"
    style={`aspect-ratio: ${aspectRatio}`}
  />
</picture>
```

**LCP Image Optimization:**
```astro
---
// For hero images above the fold
---
<link rel="preload" as="image" href="/hero-mobile.webp" media="(max-width: 768px)" />
<link rel="preload" as="image" href="/hero-desktop.webp" media="(min-width: 769px)" />

<picture>
  <source media="(max-width: 768px)" srcset="/hero-mobile.webp" type="image/webp" />
  <source media="(min-width: 769px)" srcset="/hero-desktop.webp" type="image/webp" />
  <img
    src="/hero-desktop.jpg"
    alt="Hero"
    loading="eager"
    fetchpriority="high"
    width="1200"
    height="600"
  />
</picture>
```

---

## III. Mobile Layout Patterns

### A. Responsive Grid System

**Mobile-First Grid Utilities:**
```css
/* tailwind.config.ts additions */
module.exports = {
  theme: {
    extend: {
      gridTemplateColumns: {
        'mobile': 'repeat(auto-fill, minmax(280px, 1fr))',
        'mobile-cards': 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        'fluid': 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
      },
      gap: {
        'mobile': 'clamp(1rem, 3vw, 1.5rem)',
        'mobile-lg': 'clamp(1.5rem, 4vw, 2rem)',
      }
    }
  }
}
```

**Implementation:**
```astro
<!-- Service cards grid -->
<div class="
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
  gap-4 sm:gap-6 lg:gap-8
">
  {services.map(service => (
    <ServiceCard {...service} />
  ))}
</div>

<!-- Auto-responsive grid -->
<div class="grid grid-cols-mobile gap-mobile">
  {items.map(item => <Card {...item} />)}
</div>
```

### B. Safe Area Handling (iOS Notch/Home Indicator)

**Global Safe Area System:**
```css
/* global.css */
@layer utilities {
  .safe-area-inset {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  .safe-area-inset-top {
    padding-top: max(1rem, env(safe-area-inset-top));
  }

  .safe-area-inset-bottom {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }

  .safe-area-inset-x {
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
  }
}
```

**Viewport Meta Tag:**
```html
<!-- Update BaseHead.astro -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
```

### C. Scroll Behavior & Virtual Scrolling

**Smooth Scroll with Performance:**
```css
/* Override global.css */
@layer base {
  html {
    scroll-behavior: smooth;
    /* Optimize scrolling performance */
    -webkit-overflow-scrolling: touch;
  }

  /* Snap scrolling for carousels */
  .scroll-snap-x {
    scroll-snap-type: x mandatory;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .scroll-snap-x::-webkit-scrollbar {
    display: none;
  }

  .scroll-snap-x > * {
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }
}
```

**Mobile-Optimized Testimonial Slider:**
```astro
<div
  class="
    flex overflow-x-auto snap-x snap-mandatory
    gap-4 px-6 -mx-6
    scrollbar-hide
  "
  role="region"
  aria-label="Testimonials"
>
  {testimonials.map((testimonial, i) => (
    <div
      class="
        flex-none w-[85vw] sm:w-[400px]
        snap-start snap-always
      "
      aria-label={`Testimonial ${i + 1} of ${testimonials.length}`}
    >
      <TestimonialCard {...testimonial} />
    </div>
  ))}
</div>

<!-- Optional: scroll indicators -->
<div class="flex justify-center gap-2 mt-4">
  {testimonials.map((_, i) => (
    <button
      class="w-2 h-2 rounded-full bg-white/30 data-[active]:bg-white transition-colors"
      aria-label={`Go to testimonial ${i + 1}`}
    />
  ))}
</div>
```

---

## IV. Mobile Performance Optimization

### A. Critical Rendering Path Optimization

**Inline Critical CSS Strategy:**
```astro
---
// layouts/MarketingLayout.astro
import { readFileSync } from 'fs';

// Extract critical CSS for above-the-fold content
const criticalCSS = readFileSync('./dist/critical.css', 'utf-8');
---

<html>
  <head>
    <style>{criticalCSS}</style>

    <!-- Preload critical resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <!-- Async load full styles -->
    <link rel="stylesheet" href="/styles/global.css" media="print" onload="this.media='all'" />
    <noscript>
      <link rel="stylesheet" href="/styles/global.css" />
    </noscript>
  </head>
</html>
```

**Font Loading Strategy:**
```astro
---
// BaseHead.astro font optimization
---

<!-- Preload critical fonts -->
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>

<style>
  /* Font face with optimal descriptors */
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2');
    font-weight: 100 900;
    font-display: swap; /* Show fallback immediately */
    font-style: normal;
    unicode-range: U+0000-00FF; /* Latin subset */
  }

  /* System font fallback stack */
  body {
    font-family:
      'Inter',
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
  }
</style>
```

### B. JavaScript Bundle Optimization

**Astro Island Strategy:**
```astro
---
// Use appropriate loading strategies
---

<!-- Immediately visible: load immediately -->
<MobileNav client:load />

<!-- Above fold but not critical: load when browser idle -->
<ThemeToggle client:idle />

<!-- Below fold: load when visible -->
<TestimonialSlider client:visible />

<!-- Desktop only: conditional hydration -->
<AdvancedSearch client:media="(min-width: 1024px)" />

<!-- Heavy interactive: load only on interaction -->
<PricingCalculator client:only="preact" />
```

**Code Splitting by Route:**
```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    splitting: true, // Enable code splitting
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('preact')) return 'preact-vendor';
              if (id.includes('solid-js')) return 'solid-vendor';
              return 'vendor';
            }

            // Feature-based chunks
            if (id.includes('components/business')) return 'business-features';
            if (id.includes('components/ui')) return 'ui-components';
          }
        }
      },
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
    }
  }
});
```

### C. Image Loading Patterns

**Lazy Loading with Intersection Observer:**
```astro
---
// components/ui/LazyImage.astro (Enhanced)
---

<img
  data-src={src}
  alt={alt}
  class="lazy opacity-0 transition-opacity duration-300"
  width={width}
  height={height}
  loading="lazy"
/>

<script>
  // Progressive image loading with blur-up
  const lazyImages = document.querySelectorAll('img.lazy');

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;

        if (src) {
          // Load low-quality placeholder first
          const placeholder = new Image();
          placeholder.src = src.replace(/\.(jpg|png)/, '-thumb.$1');
          placeholder.onload = () => {
            img.src = placeholder.src;
            img.classList.add('opacity-100');

            // Then load full quality
            const full = new Image();
            full.src = src;
            full.onload = () => {
              img.src = src;
            };
          };

          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px', // Start loading 50px before viewport
    threshold: 0.01
  });

  lazyImages.forEach(img => imageObserver.observe(img));
</script>
```

**Background Image Optimization:**
```astro
<div
  class="hero-section"
  style={`background-image: image-set(
    url('/hero-mobile.webp') 1x,
    url('/hero-mobile@2x.webp') 2x
  )`}
  data-bg-desktop="/hero-desktop.webp"
>
  <slot />
</div>

<script>
  // Load desktop background only on larger screens
  if (window.matchMedia('(min-width: 1024px)').matches) {
    const hero = document.querySelector('.hero-section') as HTMLElement;
    const desktopBg = hero.dataset.bgDesktop;
    if (desktopBg) {
      const img = new Image();
      img.src = desktopBg;
      img.onload = () => {
        hero.style.backgroundImage = `url('${desktopBg}')`;
      };
    }
  }
</script>
```

### D. Service Worker & Offline Support

**Enhanced PWA Strategy:**
```javascript
// public/sw.js
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Cache strategies by resource type
const CACHE_STRATEGIES = {
  pages: 'network-first',
  styles: 'cache-first',
  scripts: 'cache-first',
  images: 'cache-first',
  fonts: 'cache-first',
  api: 'network-first',
};

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/offline/',
  '/styles/global.css',
  '/fonts/inter-var.woff2',
  '/manifest.json',
];

// Install event: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch event: apply cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Images: cache-first with fallback
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(cached => cached || fetch(request)
          .then(response => {
            const clone = response.clone();
            caches.open(IMAGE_CACHE)
              .then(cache => cache.put(request, clone));
            return response;
          })
        )
        .catch(() => caches.match('/offline-image.svg'))
    );
    return;
  }

  // Pages: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/offline/'))
        )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request))
  );
});
```

---

## V. Mobile Gesture & Interaction Patterns

### A. Swipe Gestures

**Universal Swipe Handler:**
```typescript
// utils/gestures.ts
interface SwipeOptions {
  threshold?: number;
  restraint?: number;
  allowedTime?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function addSwipeGesture(
  element: HTMLElement,
  options: SwipeOptions
) {
  const {
    threshold = 50,
    restraint = 100,
    allowedTime = 500,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let distX = 0;
  let distY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    startX = touch.pageX;
    startY = touch.pageY;
    startTime = Date.now();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    distX = touch.pageX - startX;
    distY = touch.pageY - startY;
    const elapsedTime = Date.now() - startTime;

    if (elapsedTime <= allowedTime) {
      if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
        if (distX < 0 && onSwipeLeft) onSwipeLeft();
        else if (distX > 0 && onSwipeRight) onSwipeRight();
      } else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) {
        if (distY < 0 && onSwipeUp) onSwipeUp();
        else if (distY > 0 && onSwipeDown) onSwipeDown();
      }
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}
```

**Implementation in Components:**
```astro
---
// components/ui/SwipeableCard.astro
---
<div class="swipeable-card" data-swipeable>
  <slot />
</div>

<script>
  import { addSwipeGesture } from '../../utils/gestures';

  document.querySelectorAll('[data-swipeable]').forEach(card => {
    addSwipeGesture(card as HTMLElement, {
      onSwipeLeft: () => console.log('Swiped left'),
      onSwipeRight: () => console.log('Swiped right'),
      threshold: 75,
    });
  });
</script>
```

### B. Pull-to-Refresh Pattern

```typescript
// components/ui/PullToRefresh.astro
<div class="pull-to-refresh" data-ptr>
  <div class="ptr-indicator">
    <svg class="ptr-spinner" />
    <span class="ptr-text">Pull to refresh</span>
  </div>

  <div class="ptr-content">
    <slot />
  </div>
</div>

<script>
  class PullToRefresh {
    private container: HTMLElement;
    private indicator: HTMLElement;
    private content: HTMLElement;
    private startY = 0;
    private currentY = 0;
    private pulling = false;
    private threshold = 80;

    constructor(element: HTMLElement) {
      this.container = element;
      this.indicator = element.querySelector('.ptr-indicator')!;
      this.content = element.querySelector('.ptr-content')!;

      this.init();
    }

    private init() {
      this.content.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
      this.content.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      this.content.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    private handleTouchStart(e: TouchEvent) {
      if (this.content.scrollTop === 0) {
        this.startY = e.touches[0].pageY;
        this.pulling = true;
      }
    }

    private handleTouchMove(e: TouchEvent) {
      if (!this.pulling) return;

      this.currentY = e.touches[0].pageY;
      const distance = this.currentY - this.startY;

      if (distance > 0) {
        e.preventDefault();
        const pull = Math.min(distance / 2, this.threshold * 1.5);
        this.indicator.style.transform = `translateY(${pull}px)`;
        this.content.style.transform = `translateY(${pull}px)`;

        if (pull >= this.threshold) {
          this.indicator.classList.add('ptr-ready');
        } else {
          this.indicator.classList.remove('ptr-ready');
        }
      }
    }

    private async handleTouchEnd() {
      if (!this.pulling) return;

      const distance = this.currentY - this.startY;

      if (distance >= this.threshold) {
        this.indicator.classList.add('ptr-loading');
        await this.refresh();
      }

      // Reset
      this.indicator.style.transform = '';
      this.content.style.transform = '';
      this.indicator.classList.remove('ptr-ready', 'ptr-loading');
      this.pulling = false;
    }

    private async refresh() {
      // Trigger refresh event
      const event = new CustomEvent('refresh');
      this.container.dispatchEvent(event);

      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  document.querySelectorAll('[data-ptr]').forEach(element => {
    new PullToRefresh(element as HTMLElement);
  });
</script>

<style>
  .pull-to-refresh {
    position: relative;
    overflow: hidden;
  }

  .ptr-indicator {
    position: absolute;
    top: -60px;
    left: 0;
    right: 0;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: transform 0.3s ease;
  }

  .ptr-spinner {
    width: 24px;
    height: 24px;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .ptr-ready .ptr-spinner,
  .ptr-loading .ptr-spinner {
    opacity: 1;
  }

  .ptr-loading .ptr-spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
```

### C. Long Press Detection

```typescript
// utils/long-press.ts
interface LongPressOptions {
  duration?: number;
  onLongPress: (e: TouchEvent | MouseEvent) => void;
  onLongPressEnd?: () => void;
}

export function addLongPressListener(
  element: HTMLElement,
  options: LongPressOptions
) {
  const { duration = 500, onLongPress, onLongPressEnd } = options;

  let pressTimer: number;
  let isLongPress = false;

  const start = (e: TouchEvent | MouseEvent) => {
    isLongPress = false;
    pressTimer = window.setTimeout(() => {
      isLongPress = true;
      onLongPress(e);

      // Add haptic feedback on supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, duration);
  };

  const cancel = () => {
    clearTimeout(pressTimer);
    if (isLongPress && onLongPressEnd) {
      onLongPressEnd();
    }
  };

  element.addEventListener('touchstart', start, { passive: true });
  element.addEventListener('mousedown', start);
  element.addEventListener('touchend', cancel);
  element.addEventListener('touchcancel', cancel);
  element.addEventListener('mouseup', cancel);
  element.addEventListener('mouseleave', cancel);

  return () => {
    element.removeEventListener('touchstart', start);
    element.removeEventListener('mousedown', start);
    element.removeEventListener('touchend', cancel);
    element.removeEventListener('touchcancel', cancel);
    element.removeEventListener('mouseup', cancel);
    element.removeEventListener('mouseleave', cancel);
  };
}
```

---

## VI. Advanced Mobile Features

### A. Native App Install Prompt

```astro
---
// components/PWAInstallPrompt.astro
---
<div
  class="
    fixed bottom-20 left-4 right-4 z-50
    hidden
    animate-slide-up
  "
  data-install-prompt
>
  <div class="
    flex items-center justify-between gap-4
    p-4 rounded-2xl
    bg-gradient-to-r from-accent-600 to-accent-500
    text-white shadow-2xl
  ">
    <div class="flex items-center gap-3">
      <img src="/icon-192.png" alt="" class="w-12 h-12 rounded-xl" />
      <div>
        <p class="font-semibold text-sm">Install App</p>
        <p class="text-xs opacity-90">Add to home screen for quick access</p>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="px-4 py-2 text-sm font-semibold bg-white/20 rounded-lg"
        data-install-dismiss
      >
        Later
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-semibold bg-white text-accent-600 rounded-lg"
        data-install-accept
      >
        Install
      </button>
    </div>
  </div>
</div>

<script>
  let deferredPrompt: any;
  const prompt = document.querySelector('[data-install-prompt]') as HTMLElement;
  const acceptBtn = document.querySelector('[data-install-accept]');
  const dismissBtn = document.querySelector('[data-install-dismiss]');

  // Listen for install prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) {
      setTimeout(() => {
        prompt.classList.remove('hidden');
      }, 3000); // Show after 3 seconds
    }
  });

  acceptBtn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA installed');
      }

      deferredPrompt = null;
      prompt.classList.add('hidden');
    }
  });

  dismissBtn?.addEventListener('click', () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    prompt.classList.add('hidden');
  });

  // Track if installed
  window.addEventListener('appinstalled', () => {
    console.log('PWA successfully installed');
    // Track analytics
  });
</script>
```

### B. Share API Integration

```astro
---
// components/ui/ShareButton.astro
interface Props {
  title: string;
  text: string;
  url?: string;
}

const { title, text, url } = Astro.props;
---

<button
  type="button"
  class="
    flex items-center gap-2
    min-h-touch px-6 py-3
    bg-white/10 hover:bg-white/20
    rounded-lg font-semibold
    transition-colors
  "
  data-share
  data-title={title}
  data-text={text}
  data-url={url || ''}
>
  <svg class="w-5 h-5" />
  <span>Share</span>
</button>

<script>
  document.querySelectorAll('[data-share]').forEach(button => {
    button.addEventListener('click', async () => {
      const title = button.getAttribute('data-title') || '';
      const text = button.getAttribute('data-text') || '';
      const url = button.getAttribute('data-url') || window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
          }
        }
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        // Show toast notification
        alert('Link copied to clipboard!');
      }
    });
  });
</script>
```

### C. Haptic Feedback

```typescript
// utils/haptics.ts
export const haptics = {
  light() {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  medium() {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  heavy() {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  success() {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  error() {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  selection() {
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  }
};

// Usage in components
import { haptics } from '../utils/haptics';

button.addEventListener('click', () => {
  haptics.light();
  // Handle click
});

form.addEventListener('submit', (e) => {
  if (isValid) {
    haptics.success();
  } else {
    haptics.error();
  }
});
```

### D. Battery & Network Aware Loading

```typescript
// utils/adaptive-loading.ts
export async function getConnectionInfo() {
  const connection = (navigator as any).connection ||
                    (navigator as any).mozConnection ||
                    (navigator as any).webkitConnection;

  return {
    effectiveType: connection?.effectiveType || '4g',
    saveData: connection?.saveData || false,
    downlink: connection?.downlink || 10,
  };
}

export async function getBatteryInfo() {
  if ('getBattery' in navigator) {
    const battery = await (navigator as any).getBattery();
    return {
      level: battery.level,
      charging: battery.charging,
    };
  }
  return { level: 1, charging: true };
}

export async function shouldReduceQuality(): Promise<boolean> {
  const connection = await getConnectionInfo();
  const battery = await getBatteryInfo();

  // Reduce quality if:
  // - Save data is enabled
  // - Slow connection (2g/3g)
  // - Low battery (<20%) and not charging
  return (
    connection.saveData ||
    ['slow-2g', '2g', '3g'].includes(connection.effectiveType) ||
    (battery.level < 0.2 && !battery.charging)
  );
}

// Usage
const reduceQuality = await shouldReduceQuality();

if (reduceQuality) {
  // Load lower quality images
  // Disable animations
  // Reduce particle counts
  document.documentElement.dataset.perfMode = 'true';
}
```

---

## VII. Mobile-Specific Accessibility

### A. Screen Reader Optimization

**ARIA Labels for Touch Targets:**
```astro
<button
  type="button"
  class="icon-button"
  aria-label="Close menu"
  aria-expanded="false"
  aria-controls="mobile-menu"
>
  <svg aria-hidden="true">
    <use href="#icon-close" />
  </svg>
</button>

<!-- Live regions for dynamic content -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
>
  {statusMessage}
</div>

<!-- Toast notifications -->
<div
  role="alert"
  aria-live="assertive"
  class="toast-notification"
>
  {alertMessage}
</div>
```

### B. Focus Management for Mobile

```typescript
// utils/focus-trap.ts
export function createFocusTrap(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Auto-focus first element
  firstFocusable?.focus();

  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

// Usage in mobile menu
const menu = document.querySelector('[data-mobile-menu]');
let cleanup: (() => void) | null = null;

menuOpenButton.addEventListener('click', () => {
  menu.setAttribute('data-open', 'true');
  cleanup = createFocusTrap(menu);
});

menuCloseButton.addEventListener('click', () => {
  menu.setAttribute('data-open', 'false');
  cleanup?.();
  menuOpenButton.focus(); // Return focus
});
```

### C. Voice Control & Voice Search

```astro
---
// components/ui/VoiceSearch.astro
---
<div class="relative">
  <input
    type="search"
    class="voice-search-input"
    placeholder="Search..."
    data-voice-input
  />

  <button
    type="button"
    class="
      absolute right-3 top-1/2 -translate-y-1/2
      min-w-touch min-h-touch
      flex items-center justify-center
    "
    data-voice-button
    aria-label="Voice search"
  >
    <svg class="w-5 h-5" data-mic-icon />
  </button>
</div>

<script>
  const SpeechRecognition = (window as any).SpeechRecognition ||
                           (window as any).webkitSpeechRecognition;

  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    const input = document.querySelector('[data-voice-input]') as HTMLInputElement;
    const button = document.querySelector('[data-voice-button]');
    const icon = document.querySelector('[data-mic-icon]');

    button?.addEventListener('click', () => {
      recognition.start();
      button.classList.add('listening');
      icon?.classList.add('animate-pulse');
    });

    recognition.addEventListener('result', (event: any) => {
      const transcript = event.results[0][0].transcript;
      input.value = transcript;

      // Trigger search
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    recognition.addEventListener('end', () => {
      button?.classList.remove('listening');
      icon?.classList.remove('animate-pulse');
    });

    recognition.addEventListener('error', (event: any) => {
      console.error('Speech recognition error:', event.error);
      button?.classList.remove('listening');
      icon?.classList.remove('animate-pulse');
    });
  } else {
    // Hide voice button if not supported
    document.querySelector('[data-voice-button]')?.remove();
  }
</script>
```

---

## VIII. Testing Strategy for Mobile

### A. Playwright Mobile Testing Setup

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Mobile Safari Landscape',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 844, height: 390 },
      },
    },
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },

    // Desktop (for comparison)
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Mobile-Specific Test Cases:**
```typescript
// src/tests/e2e/mobile-navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open and close mobile menu', async ({ page }) => {
    // Open menu
    await page.click('[data-menu-toggle]');
    await expect(page.locator('[data-mobile-menu]')).toBeVisible();

    // Verify focus trap
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBe('A'); // First nav link

    // Close menu
    await page.click('[data-menu-close]');
    await expect(page.locator('[data-mobile-menu]')).not.toBeVisible();
  });

  test('should handle swipe gestures', async ({ page }) => {
    const element = page.locator('[data-swipeable]').first();

    // Simulate swipe left
    await element.dispatchEvent('touchstart', {
      touches: [{ pageX: 200, pageY: 100 }]
    });
    await element.dispatchEvent('touchend', {
      changedTouches: [{ pageX: 50, pageY: 100 }]
    });

    // Verify swipe action
    await expect(element).toHaveAttribute('data-swiped', 'left');
  });

  test('should meet touch target size requirements', async ({ page }) => {
    const buttons = page.locator('button, a');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should respect safe areas on iOS', async ({ page, browserName }) => {
    if (browserName !== 'webkit') return;

    const header = page.locator('header');
    const headerStyle = await header.evaluate(el =>
      window.getComputedStyle(el).paddingTop
    );

    // Should have safe area padding
    expect(parseFloat(headerStyle)).toBeGreaterThan(16);
  });
});
```

### B. Performance Testing

```typescript
// src/tests/e2e/mobile-performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mobile Performance', () => {
  test('should meet Core Web Vitals on mobile', async ({ page }) => {
    await page.goto('/');

    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        let LCP = 0;
        let FID = 0;
        let CLS = 0;

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              LCP = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            FID = entry.processingStart - entry.startTime;
          }
        }).observe({ entryTypes: ['first-input'] });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              CLS += (entry as any).value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => {
          resolve({ LCP, FID, CLS });
        }, 5000);
      });
    });

    expect((vitals as any).LCP).toBeLessThan(2000); // < 2s
    expect((vitals as any).FID).toBeLessThan(100);  // < 100ms
    expect((vitals as any).CLS).toBeLessThan(0.1);  // < 0.1
  });

  test('should load images lazily', async ({ page }) => {
    await page.goto('/');

    // Count images in viewport
    const visibleImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight;
      }).length;
    });

    // Count total images
    const totalImages = await page.locator('img').count();

    // Most images should be lazy-loaded
    expect(visibleImages).toBeLessThan(totalImages);
  });

  test('should have acceptable bundle size', async ({ page }) => {
    const resources = await page.evaluate(() =>
      performance.getEntriesByType('resource')
        .filter((r: any) => r.initiatorType === 'script')
        .reduce((total: number, r: any) => total + r.transferSize, 0)
    );

    // JavaScript bundle should be < 150KB
    expect(resources).toBeLessThan(150 * 1024);
  });
});
```

### C. Accessibility Testing

```typescript
// src/tests/e2e/mobile-accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Mobile Accessibility', () => {
  test('should have no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/');

    // Check for landmark regions
    await expect(page.locator('main')).toHaveAttribute('id', 'main-content');
    await expect(page.locator('nav')).toBeVisible();

    // Check for skip link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeInViewport();

    // Verify headings hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();

    const contrastViolations = results.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations).toHaveLength(0);
  });
});
```

---

## IX. Mobile-First Design System Enhancement

### A. Enhanced Spacing System

```typescript
// tailwind.config.ts - Mobile-optimized spacing
module.exports = {
  theme: {
    extend: {
      spacing: {
        // Base mobile spacing (in 4px increments)
        'xs': '0.5rem',   // 8px
        'sm': '0.75rem',  // 12px
        'md': '1rem',     // 16px
        'lg': '1.5rem',   // 24px
        'xl': '2rem',     // 32px
        '2xl': '3rem',    // 48px
        '3xl': '4rem',    // 64px

        // Touch-specific
        'touch': '3rem',      // 48px - Standard touch target
        'touch-min': '2.75rem', // 44px - Minimum touch target
        'touch-gap': '0.5rem',  // 8px - Minimum gap between targets

        // Safe area utilities
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',

        // Container padding (responsive)
        'container-xs': 'clamp(1rem, 3vw, 1.5rem)',
        'container-sm': 'clamp(1.5rem, 4vw, 2rem)',
        'container-md': 'clamp(2rem, 5vw, 3rem)',
      }
    }
  }
}
```

### B. Mobile Component Variants

**Button System:**
```astro
---
// components/ui/MobileButton.astro
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'touch';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
}

const {
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  href
} = Astro.props;

const Tag = href ? 'a' : 'button';

const baseClasses = `
  inline-flex items-center justify-center gap-2
  font-semibold text-center
  rounded-lg
  transition-all duration-200
  touch-manipulation
  active:scale-95
  disabled:opacity-50 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-offset-2
`;

const variantClasses = {
  primary: `
    bg-gradient-to-r from-accent-600 to-accent-500
    text-white
    shadow-lg shadow-accent-500/30
    hover:shadow-xl hover:shadow-accent-500/40
    focus:ring-accent-500
  `,
  secondary: `
    bg-white/10 backdrop-blur-sm
    border border-white/20
    text-white
    hover:bg-white/20
    focus:ring-white/50
  `,
  outline: `
    bg-transparent
    border-2 border-current
    text-accent-500
    hover:bg-accent-500/10
    focus:ring-accent-500
  `,
  ghost: `
    bg-transparent
    text-zinc-300
    hover:bg-white/10
    focus:ring-white/30
  `,
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm min-h-[40px]',
  md: 'px-6 py-3 text-base min-h-[44px]',
  lg: 'px-8 py-4 text-lg min-h-[52px]',
  touch: 'px-6 py-3 text-base min-h-touch min-w-touch',
};

const classes = `
  ${baseClasses}
  ${variantClasses[variant]}
  ${sizeClasses[size]}
  ${fullWidth ? 'w-full' : ''}
`;
---

<Tag
  type={!href ? type : undefined}
  href={href}
  disabled={disabled || loading}
  class={classes}
>
  {loading && (
    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )}
  <slot />
</Tag>
```

**Input System:**
```astro
---
// components/ui/MobileInput.astro
interface Props {
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'search';
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  autocomplete?: string;
  inputmode?: string;
}

const {
  type = 'text',
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  autocomplete,
  inputmode
} = Astro.props;

const inputId = `input-${name}`;
const hasError = !!error;
---

<div class="space-y-2">
  {label && (
    <label
      for={inputId}
      class="block text-sm font-medium text-zinc-300"
    >
      {label}
      {required && <span class="text-accent-500 ml-1">*</span>}
    </label>
  )}

  <div class="relative">
    <input
      id={inputId}
      type={type}
      name={name}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autocomplete={autocomplete}
      inputmode={inputmode || (type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'text')}
      class={`
        w-full min-h-touch
        px-4 py-3
        text-base
        bg-zinc-900/50
        border-2 rounded-lg
        text-white placeholder:text-zinc-500
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none
        ${hasError
          ? 'border-danger-500 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/20'
          : 'border-white/10 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
        }
      `}
      aria-invalid={hasError}
      aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
    />

    {hasError && (
      <div class="absolute right-3 top-1/2 -translate-y-1/2">
        <svg class="w-5 h-5 text-danger-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
    )}
  </div>

  {error && (
    <p id={`${inputId}-error`} class="text-sm text-danger-400 flex items-center gap-1">
      <span>{error}</span>
    </p>
  )}

  {helperText && !error && (
    <p id={`${inputId}-helper`} class="text-sm text-zinc-400">
      {helperText}
    </p>
  )}
</div>
```

---

## X. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Update viewport meta tags with safe-area support
- [ ] Implement mobile-first spacing system
- [ ] Create touch-optimized button components
- [ ] Set up mobile navigation system
- [ ] Configure critical CSS inlining
- [ ] Optimize font loading strategy
- [ ] Implement image lazy loading
- [ ] Set up Playwright mobile tests

### Phase 2: Core Experience (Week 3-4)
- [ ] Build mobile-optimized forms
- [ ] Implement swipe gestures
- [ ] Create pull-to-refresh functionality
- [ ] Add PWA install prompt
- [ ] Implement share API
- [ ] Optimize service worker caching
- [ ] Add haptic feedback
- [ ] Implement safe area handling

### Phase 3: Advanced Features (Week 5-6)
- [ ] Battery/network adaptive loading
- [ ] Voice search integration
- [ ] Long-press interactions
- [ ] Bottom sheet components
- [ ] Skeleton loading states
- [ ] Optimistic UI updates
- [ ] Offline functionality
- [ ] Performance monitoring

### Phase 4: Polish & Testing (Week 7-8)
- [ ] Comprehensive mobile testing
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] User testing on real devices
- [ ] Analytics integration
- [ ] Documentation
- [ ] Launch preparation

---

## XI. Success Metrics

### Performance KPIs
- **Mobile LCP**: < 1.8s (Target: < 1.5s)
- **Mobile FID**: < 80ms (Target: < 50ms)
- **Mobile CLS**: < 0.08 (Target: < 0.05)
- **Bundle Size**: < 150KB initial (Target: < 100KB)
- **Time to Interactive**: < 2.5s (Target: < 2s)

### User Experience KPIs
- **Bounce Rate**: < 40% (Target: < 30%)
- **Session Duration**: > 2 min (Target: > 3 min)
- **Pages per Session**: > 2.5 (Target: > 3.5)
- **Conversion Rate**: Improve by 25%
- **Task Completion Rate**: > 85%

### Accessibility KPIs
- **WCAG 2.1 AA Compliance**: 100%
- **Axe Violations**: 0 critical/serious
- **Touch Target Compliance**: 100%
- **Screen Reader Support**: Full coverage
- **Keyboard Navigation**: 100% functional

---

## XII. Resources & Tools

### Development Tools
- **Chrome DevTools**: Device emulation, Lighthouse, Coverage
- **Safari Web Inspector**: iOS-specific debugging
- **React DevTools**: Component debugging
- **Playwright**: E2E testing
- **Axe DevTools**: Accessibility testing

### Testing Devices (Minimum)
- iPhone 13/14 (iOS Safari)
- Samsung Galaxy S21/S22 (Chrome)
- Google Pixel 6/7 (Chrome)
- iPad Pro (Safari)
- OnePlus/Xiaomi (Android Chrome)

### Performance Monitoring
- Web Vitals extension
- Lighthouse CI
- WebPageTest
- SpeedCurve
- Sentry (error tracking)

---

## Conclusion

This directive provides a complete blueprint for transforming your Astro application into a mobile-first powerhouse that delivers exceptional performance, accessibility, and user experience. By following these guidelines, implementing the patterns, and adhering to the best practices outlined, you'll create a mobile experience that makes users say "WOW - this is amazing work!"

**Remember**: Mobile-first isn't just about responsive design—it's about rethinking every interaction, optimizing every byte, and crafting an experience that feels native, fast, and delightful on the devices people use most.

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-11
**Maintained By**: Development Team
**Review Cycle**: Quarterly
