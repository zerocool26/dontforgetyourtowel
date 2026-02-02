import { clamp, isMobilePanel } from './showroom-utils';

export type PanelSnap = 'collapsed' | 'peek' | 'half' | 'full';

export const PANEL_SNAP_STORAGE_KEY = 'csr-panel-snap-v1';

export function initShowroomPanel({
  root,
  triggerHaptic,
  onSnapChange,
}: {
  root: HTMLElement;
  triggerHaptic: (pattern: number | number[]) => void;
  onSnapChange?: (snap: PanelSnap) => void;
}) {
  const panel = root.querySelector<HTMLElement>('[data-csr-panel]');
  const panelHead =
    panel?.querySelector<HTMLElement>('.csr-panel-head') || null;
  const sheetHandle = root.querySelector<HTMLButtonElement>(
    '[data-csr-sheet-handle]'
  );
  const togglePanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-toggle-panel]'
  );
  const closePanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-close-panel]'
  );
  const quickPanelBtn = root.querySelector<HTMLButtonElement>(
    '[data-csr-quick-panel]'
  );
  const canvas = root.querySelector<HTMLCanvasElement>(
    '[data-car-showroom-canvas]'
  );

  let panelSnap: PanelSnap = 'peek';
  const snapOrder: PanelSnap[] = ['collapsed', 'peek', 'half', 'full'];

  const getSnapHeights = () => {
    const vv =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).visualViewport?.height || window.innerHeight;
    const collapsed = 88;
    // Mobile split-view defaults: keep the model visible but show usable controls.
    const peek = Math.round(vv * 0.38); // Increased from 0.28 to show more controls
    const half = Math.round(vv * 0.5);
    const full = Math.round(vv * 0.7);
    const clampHeight = (v: number) =>
      Math.max(collapsed, Math.min(full, Math.round(v)));
    const peekH = clampHeight(peek);
    const halfH = clampHeight(Math.max(peekH + 40, half));
    const fullH = clampHeight(Math.max(halfH + 40, full));
    return {
      collapsed,
      peek: peekH,
      half: halfH,
      full: fullH,
    };
  };

  const getNearestSnap = (
    height: number,
    heights: Record<PanelSnap, number>
  ) => {
    let best = snapOrder[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const snap of snapOrder) {
      const dist = Math.abs(height - heights[snap]);
      if (dist < bestDist) {
        bestDist = dist;
        best = snap;
      }
    }
    return best;
  };

  const setPanelSnap = (snap: PanelSnap, persist: boolean) => {
    if (!panel) return;
    panelSnap = snap;
    root.dataset.carShowroomPanelSnap = snap;
    const collapsed = snap === 'collapsed';
    togglePanelBtn?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

    if (isMobilePanel()) {
      const heights = getSnapHeights();
      const height = heights[snap];
      panel.hidden = false;
      panel.classList.toggle('is-collapsed', collapsed);
      panel.style.setProperty('--csr-panel-height', `${height}px`);
      root.style.setProperty('--csr-panel-height', `${height}px`);
      root.classList.remove('is-panel-collapsed');
    } else {
      panel.classList.remove('is-collapsed');
      panel.style.removeProperty('--csr-panel-height');
      root.style.removeProperty('--csr-panel-height');
      panel.hidden = collapsed;
      root.classList.toggle('is-panel-collapsed', collapsed);
    }

    if (persist) {
      try {
        localStorage.setItem(PANEL_SNAP_STORAGE_KEY, snap);
      } catch {
        // ignore
      }
    }
    onSnapChange?.(snap);
  };

  const initPanelState = () => {
    if (!panel) return;
    let savedSnap: PanelSnap | null = null;
    try {
      const raw = (localStorage.getItem(PANEL_SNAP_STORAGE_KEY) || '').trim();
      if (snapOrder.includes(raw as PanelSnap)) {
        savedSnap = raw as PanelSnap;
      }
    } catch {
      // ignore
    }
    // Start mobile in 'peek' so users can see controls, not 'collapsed' which hides everything
    const initialSnap = savedSnap ?? 'peek';
    setPanelSnap(initialSnap, false);
  };

  let dragActive = false;
  let dragStartY = 0;
  let dragStartHeight = 0;
  let dragStartTime = 0;
  let lastDragY = 0;
  let lastDragTime = 0;
  let lastNearestSnap: PanelSnap | null = null;

  const beginDrag = (clientY: number) => {
    if (!panel || !isMobilePanel()) return;
    dragActive = true;
    panel.classList.add('is-dragging');
    panel.removeAttribute('data-pull-state');
    dragStartY = clientY;
    dragStartHeight = panel.getBoundingClientRect().height;
    dragStartTime = performance.now();
    lastDragY = clientY;
    lastDragTime = dragStartTime;
    lastNearestSnap = getNearestSnap(dragStartHeight, getSnapHeights());

    // Light haptic feedback when starting drag
    triggerHaptic(5);
  };

  const onDragMove = (e: PointerEvent) => {
    if (!dragActive || !panel || !isMobilePanel()) return;
    e.preventDefault();
    const heights = getSnapHeights();
    const dy = e.clientY - dragStartY;
    const nextHeight = clamp(
      dragStartHeight - dy,
      heights.collapsed,
      heights.full
    );
    panel.style.setProperty(
      '--csr-panel-height',
      `${Math.round(nextHeight)}px`
    );
    panel.classList.toggle('is-collapsed', nextHeight <= heights.collapsed + 4);

    // Haptic feedback when crossing a snap point
    const currentNearest = getNearestSnap(nextHeight, heights);
    if (currentNearest !== lastNearestSnap) {
      triggerHaptic(10);
      lastNearestSnap = currentNearest;
    }

    // Update pull state for visual feedback
    const pullThreshold = 30;
    const pullDistance = dragStartY - e.clientY;
    if (pullDistance > pullThreshold && dragStartHeight < heights.half) {
      panel.setAttribute('data-pull-state', 'ready');
    } else if (pullDistance > 10 && dragStartHeight < heights.half) {
      panel.setAttribute('data-pull-state', 'pulling');
    } else if (
      pullDistance < -pullThreshold &&
      dragStartHeight > heights.peek
    ) {
      panel.setAttribute('data-pull-state', 'collapsing');
    } else {
      panel.removeAttribute('data-pull-state');
    }

    lastDragY = e.clientY;
    lastDragTime = performance.now();
  };

  const onDragEnd = (e: PointerEvent) => {
    if (!dragActive || !panel) return;
    dragActive = false;
    panel.classList.remove('is-dragging');
    panel.removeAttribute('data-pull-state');
    // Remove listeners
    window.removeEventListener('pointermove', onDragMove);

    const heights = getSnapHeights();
    const rectNow = panel.getBoundingClientRect();
    const height = rectNow.height;
    const dt = Math.max(1, lastDragTime - dragStartTime);
    const velocity = ((lastDragY - dragStartY) / dt) * 1000;
    const nearest = getNearestSnap(height, heights);
    const idx = snapOrder.indexOf(nearest);
    const velocityThreshold = 700;
    let nextSnap = nearest;
    if (Math.abs(velocity) > velocityThreshold) {
      if (velocity > 0) {
        nextSnap = snapOrder[Math.max(0, idx - 1)];
      } else {
        nextSnap = snapOrder[Math.min(snapOrder.length - 1, idx + 1)];
      }
    }
    setPanelSnap(nextSnap, true);

    // Haptic feedback on snap
    if (nextSnap === 'full') {
      triggerHaptic([10, 30, 10]); // Double tap for full expand
    } else if (nextSnap === 'collapsed') {
      triggerHaptic(15); // Single for collapse
    } else {
      triggerHaptic(8); // Light for partial snap
    }
  };

  const canStartDrag = (target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    // Allow dragging if grabbing the handle or the header background
    // But avoid if clicking a button/input inside header
    if (target.closest('button') || target.closest('input')) return false;
    return true;
  };

  const attachDragHandle = (el: HTMLElement | null) => {
    if (!el) return;
    el.addEventListener('pointerdown', e => {
      if (!isMobilePanel()) return;
      if (!canStartDrag(e.target)) return;
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      beginDrag(e.clientY);
      window.addEventListener('pointermove', onDragMove, { passive: false });
      window.addEventListener('pointerup', onDragEnd, {
        passive: true,
        once: true,
      });
    });
  };

  togglePanelBtn?.addEventListener('click', () => {
    if (isMobilePanel()) {
      setPanelSnap(panelSnap === 'collapsed' ? 'peek' : 'collapsed', true);
      return;
    }
    if (panelSnap === 'collapsed') {
      setPanelSnap('peek', true);
    }
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  closePanelBtn?.addEventListener('click', () => {
    if (isMobilePanel()) {
      setPanelSnap('collapsed', true);
      return;
    }
    setPanelSnap('collapsed', true);
    canvas?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  quickPanelBtn?.addEventListener('click', () => {
    if (isMobilePanel()) {
      setPanelSnap('half', true);
      return;
    }
    setPanelSnap('peek', true);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  attachDragHandle(sheetHandle);
  attachDragHandle(panelHead);

  window.addEventListener('resize', () => {
    initPanelState();
  });

  initPanelState();

  return {
    setPanelSnap,
    getPanelSnap: () => panelSnap,
  };
}
