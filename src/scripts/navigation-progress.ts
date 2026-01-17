/**
 * Navigation progress indicator
 *
 * Adds/removes the `body.navigating` class used by `src/styles/global.css`.
 * Implemented via event delegation to avoid attaching many per-link handlers.
 * Compatible with Astro page transitions (clears on `astro:page-load`).
 */

declare global {
  interface Window {
    __navigationProgressBound?: boolean;
  }
}

let clearTimer: number | undefined;

function clearNavigating(): void {
  document.body?.classList.remove('navigating');
  document.body?.removeAttribute('aria-busy');
  if (clearTimer) {
    window.clearTimeout(clearTimer);
    clearTimer = undefined;
  }
}

function isPlainLeftClick(event: MouseEvent): boolean {
  if (event.button !== 0) return false;
  // Don’t hijack new-tab / new-window intent.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return false;
  return true;
}

function shouldShowProgress(
  anchor: HTMLAnchorElement,
  event: MouseEvent
): boolean {
  // After event propagation finishes, defaultPrevented reflects the final intent.
  if (event.defaultPrevented) return false;
  if (!isPlainLeftClick(event)) return false;

  // Allow opting out on a per-link basis.
  if (anchor.hasAttribute('data-no-navigation-progress')) return false;

  const hrefAttr = anchor.getAttribute('href') || '';
  if (!hrefAttr) return false;

  // Ignore in-page anchors.
  if (hrefAttr.startsWith('#')) return false;

  // Ignore explicit external protocols.
  if (/^(mailto:|tel:|sms:)/i.test(hrefAttr)) return false;

  // Respect target and downloads.
  const target = anchor.getAttribute('target');
  if (target && target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  let targetUrl: URL;
  try {
    targetUrl = new URL(anchor.href);
  } catch {
    return false;
  }

  if (targetUrl.origin !== window.location.origin) return false;

  // If it’s only a hash change on the same URL, don’t show.
  const currentUrl = new URL(window.location.href);
  const normalizedCurrent = new URL(currentUrl.toString());
  const normalizedTarget = new URL(targetUrl.toString());
  normalizedCurrent.hash = '';
  normalizedTarget.hash = '';
  if (normalizedCurrent.toString() === normalizedTarget.toString())
    return false;

  return true;
}

function onDocumentClick(event: MouseEvent): void {
  const target = event.target as Element | null;
  if (!target) return;

  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor) return;

  // Defer evaluation so other handlers (including preventDefault) run first.
  queueMicrotask(() => {
    if (!shouldShowProgress(anchor, event)) return;

    document.body.classList.add('navigating');
    document.body.setAttribute('aria-busy', 'true');

    // Safety: ensure we don’t get stuck if the navigation is cancelled.
    clearTimer = window.setTimeout(() => {
      clearNavigating();
    }, 8000);
  });
}

// Attach once.
if (typeof document !== 'undefined') {
  if (!window.__navigationProgressBound) {
    window.__navigationProgressBound = true;

    document.addEventListener('click', onDocumentClick, { capture: true });

    // Clear on any successful navigation.
    document.addEventListener(
      'astro:page-load',
      clearNavigating as EventListener
    );

    // Also clear on browser back/forward cache restores.
    window.addEventListener('pageshow', clearNavigating);
    window.addEventListener('popstate', clearNavigating);
  }
}

export {};
