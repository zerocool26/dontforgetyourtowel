/**
 * Setup magnetic button effect
 * Buttons with class 'btn-magnetic' will move slightly towards the cursor
 */
export function setupMagneticButtons() {
  const buttons = document.querySelectorAll('.btn-magnetic');

  buttons.forEach(btn => {
    if (!(btn instanceof HTMLElement)) return;

    // Prevent duplicate listeners when this runs on both initial load and
    // Astro view transitions.
    if (btn.hasAttribute('data-magnetic-bound')) return;
    btn.setAttribute('data-magnetic-bound', '');

    btn.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate distance from center
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Move button slightly towards cursor (max 5px)
      const deltaX = (x - centerX) * 0.15;
      const deltaY = (y - centerY) * 0.15;

      btn.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      btn.style.transition = 'transform 0.1s ease-out';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
      btn.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
    });
  });
}

// Run on initial load and View Transitions navigation
const runMagneticButtons = () => setupMagneticButtons();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runMagneticButtons);
} else {
  runMagneticButtons();
}

document.addEventListener('astro:page-load', runMagneticButtons);
