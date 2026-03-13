import { haptic } from '../utils/haptic';

interface PullToRefreshState {
  startY: number;
  currentY: number;
  isDragging: boolean;
  canRefresh: boolean;
}

class PullToRefreshManager {
  private container: HTMLElement;
  private indicator: HTMLElement;
  private textElement: HTMLElement;
  private threshold: number;
  private maxDistance: number;
  private onRefresh?: () => void | Promise<void>;
  private state: PullToRefreshState = {
    startY: 0,
    currentY: 0,
    isDragging: false,
    canRefresh: false,
  };

  constructor(container: HTMLElement) {
    const indicator = container.querySelector<HTMLElement>(
      '[data-ptr-indicator]'
    );
    const textElement = container.querySelector<HTMLElement>('[data-ptr-text]');

    if (!indicator || !textElement) {
      throw new Error('Pull-to-refresh markup is incomplete.');
    }

    this.container = container;
    this.indicator = indicator;
    this.textElement = textElement;
    this.threshold = parseInt(container.dataset.threshold || '80', 10);
    this.maxDistance = parseInt(container.dataset.max || '150', 10);

    const refreshHandler = container.dataset.refresh;
    if (refreshHandler) {
      try {
        const candidate = new Function(`return ${refreshHandler}`)();
        if (typeof candidate === 'function') {
          this.onRefresh = candidate as () => void | Promise<void>;
        }
      } catch (error) {
        console.warn('Invalid refresh handler:', error);
      }
    }

    this.init();
  }

  private init(): void {
    if (!('ontouchstart' in window)) return;

    document.addEventListener('touchstart', this.handleTouchStart, {
      passive: true,
    });
    document.addEventListener('touchmove', this.handleTouchMove, {
      passive: false,
    });
    document.addEventListener('touchend', this.handleTouchEnd);
  }

  private handleTouchStart = (event: TouchEvent): void => {
    if (window.scrollY > 0) return;

    this.state.startY = event.touches[0].clientY;
    this.state.isDragging = true;
  };

  private handleTouchMove = (event: TouchEvent): void => {
    if (!this.state.isDragging || window.scrollY > 0) return;

    this.state.currentY = event.touches[0].clientY;
    const pullDistance = this.state.currentY - this.state.startY;

    if (pullDistance <= 0) return;

    if (pullDistance > 10) {
      event.preventDefault();
    }

    const resistedDistance = Math.min(pullDistance * 0.5, this.maxDistance);
    this.updateIndicator(resistedDistance);

    if (resistedDistance >= this.threshold && !this.state.canRefresh) {
      this.state.canRefresh = true;
      this.container.classList.add('can-release');
      haptic.light();
      this.textElement.textContent = 'Release to refresh';
    } else if (resistedDistance < this.threshold && this.state.canRefresh) {
      this.state.canRefresh = false;
      this.container.classList.remove('can-release');
      this.textElement.textContent = 'Pull to refresh';
    }
  };

  private handleTouchEnd = (): void => {
    if (!this.state.isDragging) return;

    this.state.isDragging = false;

    if (this.state.canRefresh) {
      void this.triggerRefresh();
    } else {
      this.reset();
    }
  };

  private updateIndicator(distance: number): void {
    if (distance > 0) {
      this.container.classList.add('is-pulling');
      this.indicator.style.transform = `translateY(${distance - 100}%)`;
    } else {
      this.container.classList.remove('is-pulling');
    }
  }

  private async triggerRefresh(): Promise<void> {
    this.container.classList.add('is-refreshing');
    this.container.classList.remove('can-release');
    this.textElement.textContent = 'Refreshing...';

    haptic.medium();

    try {
      if (this.onRefresh) {
        await this.onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      haptic.error();
    } finally {
      window.setTimeout(() => this.reset(), 500);
    }
  }

  private reset(): void {
    this.container.classList.remove(
      'is-pulling',
      'can-release',
      'is-refreshing'
    );
    this.indicator.style.transform = 'translateY(-100%)';
    this.textElement.textContent = 'Pull to refresh';
    this.state.canRefresh = false;
    this.state.startY = 0;
    this.state.currentY = 0;
  }

  public destroy(): void {
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }
}

const ptrInstances = new Map<HTMLElement, PullToRefreshManager>();

function cleanupDetachedPTR(): void {
  for (const [container, manager] of ptrInstances.entries()) {
    if (container.isConnected) continue;
    manager.destroy();
    ptrInstances.delete(container);
  }
}

function initPTR(): void {
  cleanupDetachedPTR();

  document.querySelectorAll<HTMLElement>('[data-ptr]').forEach(container => {
    if (ptrInstances.has(container)) return;

    try {
      ptrInstances.set(container, new PullToRefreshManager(container));
    } catch (error) {
      console.warn('Failed to initialize pull-to-refresh:', error);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPTR, { once: true });
} else {
  initPTR();
}

document.addEventListener('astro:before-swap', cleanupDetachedPTR);
document.addEventListener('astro:page-load', initPTR);
