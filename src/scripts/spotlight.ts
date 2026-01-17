/**
 * Setup spotlight effect for cards
 * Cards with class 'card-spotlight' will have a mouse-tracking gradient
 */
export function setupSpotlight() {
  const cards = document.querySelectorAll('.card-spotlight');

  cards.forEach(card => {
    if (!(card instanceof HTMLElement)) return;

    // Prevent duplicate listeners when this runs on both initial load and
    // Astro view transitions.
    if (card.hasAttribute('data-spotlight-bound')) return;
    card.setAttribute('data-spotlight-bound', '');

    card.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// Run on initial load and View Transitions navigation
const runSpotlight = () => setupSpotlight();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runSpotlight);
} else {
  runSpotlight();
}

document.addEventListener('astro:page-load', runSpotlight);
