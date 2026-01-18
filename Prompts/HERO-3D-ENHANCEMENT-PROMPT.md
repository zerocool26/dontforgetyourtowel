# Advanced 3D Hero Component Enhancement Prompt

## Project Context

You are enhancing an Astro-based static site (deployed to GitHub Pages) with an ultra-premium 3D hero experience. The codebase already contains advanced CSS 3D components (OrbitalArray, PrismaticSphere, InfinityTunnel, Advanced3DShowcase) demonstrating proficiency with `transform-style: preserve-3d`, perspective transforms, complex animations, and performance-conscious patterns.

**Current Tech Stack:**
- Astro 5.x with TypeScript
- Tailwind CSS 4.x
- Pure CSS 3D transforms (no Three.js/WebGL - must remain static-compatible)
- CSS custom properties for theming/tunability
- Accessibility-first patterns (reduced-motion support, ARIA labels)
- Performance modes for mobile/low-power devices

**Current OrbitalArray.astro baseline:**
- Simple orbital ring system with rotating dots/satellites
- Conic gradient halo effect
- Pulsing core with glow
- Signal arc animations
- Basic perspective (1200px)

---

## Enhancement Objective

Transform OrbitalArray into a **2026-standard hero centerpiece** that:
1. Immediately captures attention as the first thing visitors see
2. Creates a "wow factor" moment that establishes premium brand perception
3. Remains performant on static hosting (no server-side rendering needed)
4. Degrades gracefully on mobile/reduced-motion contexts

---

## Technical Requirements

### 1. Advanced 3D Geometry System

Create a multi-layered 3D composition with these elements:

```
LAYER STRUCTURE (front to back):
├── L0: Interactive particle field (mouse-reactive)
├── L1: Holographic data rings (rotating independently)
├── L2: Energy conduit beams (connecting elements)
├── L3: Primary orbital array (enhanced from current)
├── L4: Crystalline core structure (geometric, faceted)
├── L5: Volumetric light rays (god rays effect)
├── L6: Deep space nebula backdrop
└── L7: Infinite grid floor (perspective receding)
```

**Geometric primitives to implement:**
- Icosahedral wireframe structure (20-sided, CSS clip-path based)
- Toroidal energy rings with flowing gradient animation
- Fractal-like recursive scaling elements
- Möbius-strip inspired continuous loop geometry

### 2. Advanced Animation Choreography

**Timeline-based entrance sequence (CSS @keyframes orchestration):**
```
0ms:     Grid fades in from below
200ms:   Core materializes (scale 0→1 with overshoot)
400ms:   First orbital ring expands outward
600ms:   Particle field begins spawning
800ms:   Energy beams connect core to rings
1000ms:  Holographic data text appears
1200ms:  Full system reaches steady-state animation
```

**Steady-state animations (must loop seamlessly):**
- Orbital rings: Different speeds, different rotation axes
- Core: Breathing pulse with chromatic aberration effect
- Particles: Brownian-motion-like drift
- Energy: Flowing gradient along beam paths
- Data rings: Scrolling text/code effect

### 3. Mouse/Pointer Interactivity (Desktop Only)

Implement gyroscope-like tilt response:
```javascript
// Pseudocode for effect
onPointerMove(e) {
  const tiltX = (e.clientY / height - 0.5) * 20; // ±10deg
  const tiltY = (e.clientX / width - 0.5) * 20;
  element.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
}
```

**Interactivity requirements:**
- Use `requestAnimationFrame` for smooth updates
- Implement pointer lock optional (for drag-rotate)
- Add magnetic pull toward cursor for particles
- Throttle to 60fps max
- Unbind on mobile/coarse pointer devices

### 4. Holographic/Futuristic Visual Effects

**Implement these CSS-only effects:**

```css
/* Chromatic aberration on core */
.core-element {
  filter: drop-shadow(2px 0 0 rgba(255,0,0,0.3))
          drop-shadow(-2px 0 0 rgba(0,255,255,0.3));
}

/* Scan line overlay */
.scanlines::after {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.1) 2px,
    rgba(0,0,0,0.1) 4px
  );
}

/* Glitch effect (on hover/periodic) */
@keyframes glitch {
  0%, 100% { clip-path: inset(0 0 0 0); }
  20% { clip-path: inset(20% 0 30% 0); transform: translateX(-5px); }
  40% { clip-path: inset(50% 0 10% 0); transform: translateX(5px); }
}

/* Holographic foil gradient */
.holo-surface {
  background: linear-gradient(
    135deg,
    hsla(0, 100%, 50%, 0.1),
    hsla(60, 100%, 50%, 0.1),
    hsla(120, 100%, 50%, 0.1),
    hsla(180, 100%, 50%, 0.1),
    hsla(240, 100%, 50%, 0.1),
    hsla(300, 100%, 50%, 0.1)
  );
  background-size: 400% 400%;
  animation: holoShift 8s linear infinite;
}
```

### 5. Dynamic Data Visualization Elements

Add "live" data streams to reinforce tech/premium feel:

```html
<!-- Rotating status ring with "data" -->
<div class="data-ring">
  <span class="data-segment" style="--i:0">SYS.ONLINE</span>
  <span class="data-segment" style="--i:1">LATENCY.12MS</span>
  <span class="data-segment" style="--i:2">UPTIME.99.99%</span>
  <!-- ... 8-12 segments total -->
</div>
```

**Visual data elements:**
- Binary streams (0s and 1s flowing)
- HEX color codes floating
- Coordinate readouts (X:0.00 Y:0.00 Z:0.00)
- Status indicators (pulsing dots)
- Loading bar segments

### 6. Performance Optimization Layers

**Implement tiered quality modes:**

```css
/* Base quality (all devices) */
.hero-3d {
  --particle-count: 30;
  --ring-count: 4;
  --blur-enabled: 0;
}

/* High quality (desktop, fine pointer) */
@media (pointer: fine) and (min-width: 1024px) {
  .hero-3d {
    --particle-count: 100;
    --ring-count: 8;
    --blur-enabled: 1;
  }
}

/* Performance mode (data attribute toggle) */
:global(html[data-demo-perf='true']) .hero-3d {
  --particle-count: 15;
  --ring-count: 3;
  --blur-enabled: 0;
}
```

**CSS containment for performance:**
```css
.hero-3d-container {
  contain: layout style paint;
  content-visibility: auto;
  contain-intrinsic-size: 100vw 100vh;
}
```

**GPU acceleration hints:**
```css
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0); /* Force GPU layer */
  backface-visibility: hidden;
}
```

### 7. Accessibility Implementation

```html
<!-- Screen reader context -->
<div
  class="hero-3d"
  role="img"
  aria-label="Interactive 3D visualization representing advanced technology and innovation"
>
  <div aria-hidden="true">
    <!-- All decorative 3D elements -->
  </div>

  <!-- Accessible content overlay -->
  <div class="hero-content" role="main">
    <h1>Your Headline</h1>
    <p>Your subheading</p>
  </div>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    .hero-3d * {
      animation: none !important;
      transition: none !important;
    }

    /* Static fallback appearance */
    .hero-3d {
      background: var(--static-gradient-fallback);
    }
  }
</style>
```

---

## Visual Design Specifications

### Color Palette (CSS Custom Properties)

```css
:root {
  /* Core accent colors */
  --hero-primary: 99, 102, 241;      /* Indigo-500 */
  --hero-secondary: 168, 85, 247;    /* Purple-500 */
  --hero-accent: 236, 72, 153;       /* Pink-500 */
  --hero-cyber: 6, 182, 212;         /* Cyan-500 */

  /* Glow intensities */
  --glow-soft: 0.3;
  --glow-medium: 0.6;
  --glow-intense: 1.0;

  /* Background layers */
  --bg-void: #030712;               /* Near black */
  --bg-deep: #0f172a;               /* Slate-900 */
  --bg-surface: #1e293b;            /* Slate-800 */
}
```

### Typography Integration

The 3D hero should frame/complement hero text (not compete with it):

```css
.hero-content {
  position: relative;
  z-index: 100;

  /* Text should "float" in front of 3D elements */
  text-shadow:
    0 0 40px rgba(var(--hero-primary), 0.5),
    0 0 80px rgba(var(--hero-secondary), 0.3);
}

.hero-headline {
  font-size: clamp(2.5rem, 8vw, 6rem);
  font-weight: 900;
  background: linear-gradient(
    135deg,
    #fff 0%,
    rgba(var(--hero-primary), 1) 50%,
    rgba(var(--hero-secondary), 1) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## Component Architecture

### Props Interface

```typescript
interface HeroProps {
  /** Intensity of 3D effects: 'subtle' | 'medium' | 'intense' */
  intensity?: 'subtle' | 'medium' | 'intense';

  /** Enable mouse interactivity */
  interactive?: boolean;

  /** Custom color theme override */
  theme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };

  /** Performance mode override */
  performanceMode?: boolean;

  /** Show data visualization elements */
  showDataStreams?: boolean;

  /** Animation entrance delay (ms) */
  entranceDelay?: number;

  /** Headline/subheading content */
  headline?: string;
  subheading?: string;
  badge?: string;

  /** CTA buttons config */
  ctas?: Array<{
    label: string;
    href: string;
    variant: 'primary' | 'secondary';
  }>;
}
```

### Script Module Structure

```typescript
// hero-3d.ts
import {
  getDemoModuleRoot,
  isDemoPaused,
  observeDemoLabFlags
} from '@/utils/demo-lab';
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/utils/a11y';

class Hero3DController {
  private container: HTMLElement;
  private isInteractive: boolean = false;
  private rafId: number = 0;
  private particles: HTMLElement[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init(): void {
    if (prefersReducedMotion()) return;
    this.setupInteractivity();
    this.setupParticles();
    this.setupIntersectionObserver();
  }

  private setupInteractivity(): void {
    // Pointer tracking with RAF throttling
  }

  private setupParticles(): void {
    // Dynamic particle generation
  }

  private setupIntersectionObserver(): void {
    // Pause animations when out of viewport
  }

  public destroy(): void {
    // Cleanup all listeners and animations
  }
}

// Auto-initialize
document.querySelectorAll('[data-hero-3d]').forEach(el => {
  new Hero3DController(el as HTMLElement);
});
```

---

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Create new `Hero3DUltra.astro` component
- [ ] Implement base HTML structure with all layers
- [ ] Set up CSS custom properties system
- [ ] Add basic keyframe animations

### Phase 2: 3D Geometry
- [ ] Implement crystalline core (icosahedron approximation)
- [ ] Create orbital ring system with independent rotations
- [ ] Add energy beam connectors
- [ ] Build particle field layer

### Phase 3: Visual Polish
- [ ] Add holographic gradient effects
- [ ] Implement chromatic aberration
- [ ] Create scan line overlay
- [ ] Add glitch effect triggers

### Phase 4: Interactivity
- [ ] Mouse tracking with tilt effect
- [ ] Particle attraction to cursor
- [ ] Touch gesture support (optional)
- [ ] Performance throttling

### Phase 5: Performance
- [ ] Add CSS containment
- [ ] Implement quality tiers
- [ ] Test on mobile devices
- [ ] Add intersection observer pausing

### Phase 6: Accessibility
- [ ] Add ARIA labels
- [ ] Implement reduced-motion fallback
- [ ] Ensure content remains readable
- [ ] Test with screen readers

### Phase 7: Integration
- [ ] Replace current hero section usage
- [ ] Add to Astro component exports
- [ ] Document props and usage
- [ ] Create Storybook stories (if applicable)

---

## Example Implementations to Reference

**Inspiration Sources (conceptual, implement CSS-only equivalents):**
- Apple Vision Pro marketing pages (layered depth, glass morphism)
- Stripe's animated gradients (smooth color transitions)
- Linear's homepage hero (clean 3D, professional)
- Vercel's globe animation (orbital motion, data points)
- Raycast's interface (holographic panels, scan lines)

**CSS-Only 3D Techniques to Study:**
- Ana Tudor's CSS 3D experiments (CodePen)
- Jhey Tompkins' CSS animations
- Kevin Powell's CSS transforms tutorials

---

## Success Criteria

The final component should:

1. **Load under 100KB** (CSS + minimal JS)
2. **Render first frame in <200ms** on mid-range devices
3. **Maintain 60fps** during animations (desktop)
4. **Score 90+** on Lighthouse performance
5. **Work without JavaScript** (CSS animations still run)
6. **Look premium** - subjective but clear "wow factor"
7. **Not distract** from hero content/messaging
8. **Degrade gracefully** on all devices/preferences

---

## Code Style Guidelines

Follow existing codebase patterns:
- Use TypeScript for all scripts
- Follow Astro component conventions
- Use CSS custom properties for theming
- Implement `prefers-reduced-motion` support
- Add JSDoc comments for complex functions
- Use semantic HTML elements
- Keep accessibility as a core requirement, not an afterthought

---

## Deliverables

1. `Hero3DUltra.astro` - Main component file
2. `hero-3d.ts` - Client-side interactivity module (if needed beyond inline script)
3. Updated `HeroSection.astro` integrating the new component
4. Performance test results documentation
5. Browser compatibility notes

---

## Notes

- **No WebGL/Three.js** - must remain pure CSS/SVG for static site compatibility
- **No external dependencies** - all effects should be self-contained
- **Progressive enhancement** - basic content must work without animations
- **Mobile-first** - design the low-fi version first, enhance for desktop
- **Test on actual devices** - emulators don't accurately represent GPU performance
