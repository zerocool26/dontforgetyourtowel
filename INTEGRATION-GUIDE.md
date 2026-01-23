# Quick Integration Guide

How to add mobile enhancements to your existing pages in 5 minutes.

## 🚀 Quick Start

### 1. Add Bottom Navigation (30 seconds)

```astro
---
// Any page file
import BottomNav from '@/components/ui/BottomNav.astro';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/services', label: 'Services', icon: '⚙️' },
  { href: '/pricing', label: 'Pricing', icon: '💰' },
  { href: '/contact', label: 'Contact', icon: '✉️' },
];
---

<Layout>
  <!-- Your content -->

  <!-- Add at the bottom -->
  <BottomNav items={navItems} />
</Layout>
```

### 2. Add Pull-to-Refresh (10 seconds)

```astro
---
import PullToRefresh from '@/components/ui/PullToRefresh.astro';
---

<Layout>
  <PullToRefresh /> <!-- Add at the very top -->

  <!-- Your content -->
</Layout>
```

### 3. Add Haptic Feedback (1 minute)

```astro
<script>
  import { initAllHaptics } from '@/utils/haptic';
  initAllHaptics(); // That's it!
</script>

<!-- Or manually add to specific elements -->
<button data-haptic="medium">Click me</button>
<button data-haptic="success">Submit</button>
```

### 4. Add Swipe Gestures to Gallery (2 minutes)

```astro
<div id="gallery">
  <!-- Gallery items -->
</div>

<script>
  import { setupGallerySwipe } from '@/utils/swipe-gestures';

  const gallery = document.getElementById('gallery');
  let currentSlide = 0;

  setupGallerySwipe(
    gallery,
    () => currentSlide++, // Next
    () => currentSlide--  // Prev
  );
</script>
```

### 5. Add Loading Skeletons (1 minute)

```astro
---
import Skeleton from '@/components/ui/Skeleton.astro';
---

<!-- Before data loads, show skeleton -->
{loading ? (
  <Skeleton variant="text" lines={3} />
) : (
  <p>{content}</p>
)}

<!-- Card skeleton -->
{loading ? (
  <SkeletonCard hasImage={true} />
) : (
  <Card data={data} />
)}
```

---

## 💡 Common Patterns

### Pattern 1: Loading State for API Data

```astro
---
import Skeleton from '@/components/ui/Skeleton.astro';
const data = await fetch('/api/data').then(r => r.json());
---

<div class="container">
  {!data ? (
    <>
      <Skeleton variant="text" width="60%" height="2rem" />
      <Skeleton variant="text" lines={3} class="mt-4" />
      <Skeleton variant="rectangular" height="200px" class="mt-4" />
    </>
  ) : (
    <>
      <h1>{data.title}</h1>
      <p>{data.description}</p>
      <img src={data.image} alt="" />
    </>
  )}
</div>
```

### Pattern 2: Image Gallery with Swipe

```astro
<div id="gallery" class="relative overflow-hidden">
  <div class="flex transition-transform" id="slides">
    {images.map(img => (
      <img src={img} class="w-full flex-shrink-0" />
    ))}
  </div>
</div>

<script>
  import { setupGallerySwipe } from '@/utils/swipe-gestures';

  let currentSlide = 0;
  const slides = document.getElementById('slides');
  const totalSlides = document.querySelectorAll('#slides img').length;

  function updateSlide() {
    slides.style.transform = `translateX(-${currentSlide * 100}%)`;
  }

  setupGallerySwipe(
    document.getElementById('gallery'),
    () => {
      currentSlide = Math.min(currentSlide + 1, totalSlides - 1);
      updateSlide();
    },
    () => {
      currentSlide = Math.max(currentSlide - 1, 0);
      updateSlide();
    }
  );
</script>
```

### Pattern 3: Form with Haptic Feedback

```astro
<form id="contact-form">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit" data-haptic="medium">Send</button>
</form>

<script>
  import { haptic, initAllHaptics } from '@/utils/haptic';

  initAllHaptics(); // Auto-handles form elements

  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      await submitForm(new FormData(e.target));
      haptic.success(); // Success haptic
      alert('Sent!');
    } catch (error) {
      haptic.error(); // Error haptic
      alert('Failed');
    }
  });
</script>
```

### Pattern 4: Mobile-First Layout with Bottom Nav

```astro
---
import BottomNav from '@/components/ui/BottomNav.astro';
import PullToRefresh from '@/components/ui/PullToRefresh.astro';

const navItems = [...];
---

<Layout>
  <PullToRefresh />

  <main class="pb-20 md:pb-0"> <!-- Extra padding for bottom nav -->
    <!-- Your content -->
  </main>

  <BottomNav items={navItems} />
</Layout>
```

---

## 🎨 Styling Tips

### Add Safe Area Padding

```css
/* For elements that touch screen edges */
.header {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Use Tailwind utilities */
.safe-top { padding-top: max(var(--safe-area-inset-top), 1rem); }
```

### Ensure Touch Targets

```html
<!-- Use utility classes -->
<button class="tap-target">Standard (48px)</button>
<button class="tap-target-sm">Small (44px)</button>

<!-- Or manual CSS -->
<button class="min-h-[48px] min-w-[48px]">Custom</button>
```

---

## ⚡ Performance Checklist

After adding mobile features, verify:

- [ ] Bottom navigation only loads on mobile
- [ ] Pull-to-refresh doesn't interfere with normal scrolling
- [ ] Swipe gestures don't prevent vertical scrolling
- [ ] Haptics respect `prefers-reduced-motion`
- [ ] Touch targets meet 48x48px minimum
- [ ] Skeleton loaders match real content layout
- [ ] Heavy components are code-split
- [ ] Fonts are preloaded

Run validation:
```typescript
import { initTouchTargetValidation } from '@/utils/touch-target-validator';
initTouchTargetValidation({ logToConsole: true });
```

---

## 🐛 Troubleshooting

### Bottom Nav Not Showing

- Check screen width is <768px
- Verify component is imported correctly
- Check z-index conflicts

### Haptics Not Working

- Only works on devices with vibration support
- Check `prefers-reduced-motion` setting
- Verify user hasn't disabled haptics

### Pull-to-Refresh Triggering Accidentally

- Increase threshold: `<PullToRefresh threshold={100} />`
- Check scroll position detection
- Verify page isn't scrolled down on load

### Swipe Not Working

- Check `touch-action` CSS property
- Verify element has proper dimensions
- Test on real device (not just emulator)

---

## 📱 Testing

### On Desktop
```bash
# Chrome DevTools
1. F12 → Toggle device toolbar (Ctrl+Shift+M)
2. Select iPhone/Android device
3. Test touch interactions
```

### On Real Device
```bash
# Network testing
npm run dev -- --host

# Access from phone
http://YOUR_IP:4321
```

### Validation
```typescript
// Run in console
validateAllTouchTargets();
```

---

## 🎯 Next Steps

1. **Visit demo:** `/mobile-features-demo`
2. **Read full docs:** `MOBILE-ENHANCEMENTS.md`
3. **Test on device:** Use your phone
4. **Validate targets:** Run touch target validator
5. **Measure performance:** Check Lighthouse scores

---

**Happy building! 🚀**
