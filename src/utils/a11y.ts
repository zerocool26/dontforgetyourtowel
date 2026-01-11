/**
 * Accessibility Utilities
 * WCAG compliance, screen readers, keyboard navigation
 */

/**
 * ARIA roles
 */
export type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'button'
  | 'cell'
  | 'checkbox'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'feed'
  | 'figure'
  | 'form'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem';

/**
 * ARIA live regions
 */
export type AriaLive = 'off' | 'polite' | 'assertive';

/**
 * Create an announcer for screen readers
 */
export function createAnnouncer(politeness: AriaLive = 'polite'): {
  announce: (message: string) => void;
  destroy: () => void;
} {
  if (typeof document === 'undefined') {
    return { announce: () => {}, destroy: () => {} };
  }

  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', politeness);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('role', 'status');
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(announcer);

  return {
    announce: (message: string) => {
      // Clear and set new message for reliable announcement
      announcer.textContent = '';
      requestAnimationFrame(() => {
        announcer.textContent = message;
      });
    },
    destroy: () => {
      if (announcer.parentNode) {
        announcer.parentNode.removeChild(announcer);
      }
    },
  };
}

/**
 * Global screen reader announcer
 */
let globalAnnouncer: ReturnType<typeof createAnnouncer> | null = null;

export function announce(
  message: string,
  politeness: AriaLive = 'polite'
): void {
  if (typeof document === 'undefined') return;

  const existing = document.querySelector('[aria-live]');
  const isCorrectPoliteness =
    existing?.getAttribute('aria-live') === politeness;
  const isLastChild = existing === document.body.lastChild;

  if (!globalAnnouncer || !isLastChild || !isCorrectPoliteness) {
    if (globalAnnouncer) {
      globalAnnouncer.destroy();
    } else if (existing) {
      document.body.removeChild(existing);
    }
    globalAnnouncer = createAnnouncer(politeness);
  }
  globalAnnouncer.announce(message);
}

/**
 * Announce assertively (interrupts other announcements)
 */
export function announceAssertive(message: string): void {
  announce(message, 'assertive');
}

/**
 * Get focusable elements within a container
 */
export function getFocusableElements(container: Element): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'details > summary:first-of-type',
  ];

  const elements = container.querySelectorAll<HTMLElement>(
    focusableSelectors.join(', ')
  );

  const ordered = Array.from(elements).sort((a, b) => {
    if (a === b) return 0;
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    return 0;
  });

  return ordered.filter(el => {
    // Check if element is visible
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.offsetWidth > 0 &&
      el.offsetHeight > 0
    );
  });
}

/**
 * Get the first focusable element in a container
 */
export function getFirstFocusable(container: Element): HTMLElement | null {
  return getFocusableElements(container)[0] ?? null;
}

/**
 * Get the last focusable element in a container
 */
export function getLastFocusable(container: Element): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] ?? null;
}

/**
 * Create a focus trap within a container
 */
export function createFocusTrap(
  container: Element,
  options: {
    initialFocus?: HTMLElement | string;
    returnFocus?: boolean;
    escapeDeactivates?: boolean;
    onEscape?: () => void;
  } = {}
): {
  activate: () => void;
  deactivate: () => void;
  updateElements: () => void;
} {
  const {
    initialFocus,
    returnFocus = true,
    escapeDeactivates = true,
    onEscape,
  } = options;

  let previouslyFocused: HTMLElement | null = null;
  let focusableElements: HTMLElement[] = [];
  let isActive = false;

  const updateElements = () => {
    focusableElements = getFocusableElements(container);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive) return;

    if (event.key === 'Tab') {
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    if (event.key === 'Escape' && escapeDeactivates) {
      event.preventDefault();
      onEscape?.();
    }
  };

  const activate = () => {
    if (isActive) return;

    isActive = true;
    previouslyFocused = document.activeElement as HTMLElement;
    updateElements();

    // Set initial focus
    let focusTarget: HTMLElement | null = null;
    if (typeof initialFocus === 'string') {
      focusTarget = container.querySelector(initialFocus);
    } else if (initialFocus) {
      focusTarget = initialFocus;
    } else {
      focusTarget = focusableElements[0] ?? null;
    }

    requestAnimationFrame(() => {
      focusTarget?.focus();
    });

    document.addEventListener('keydown', handleKeyDown);
  };

  const deactivate = () => {
    if (!isActive) return;

    isActive = false;
    document.removeEventListener('keydown', handleKeyDown);

    if (returnFocus && previouslyFocused) {
      previouslyFocused.focus();
    }
  };

  return { activate, deactivate, updateElements };
}

/**
 * Skip link helper
 */
export function createSkipLink(
  targetId: string,
  text = 'Skip to main content'
): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = text;
  link.className = 'skip-link';
  link.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    padding: 8px 16px;
    background: #000;
    color: #fff;
    z-index: 100000;
    transition: top 0.3s;
  `;

  link.addEventListener('focus', () => {
    link.style.top = '0';
  });

  link.addEventListener('blur', () => {
    link.style.top = '-40px';
  });

  return link;
}

/**
 * Check if an element is visible to screen readers
 */
export function isAccessiblyHidden(element: Element): boolean {
  const style = window.getComputedStyle(element);

  // Check display/visibility
  if (style.display === 'none' || style.visibility === 'hidden') {
    return true;
  }

  // Check aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') {
    return true;
  }

  // Check if hidden attribute
  if (element.hasAttribute('hidden')) {
    return true;
  }

  // Check if parent is hidden
  const parent = element.parentElement;
  if (parent && parent !== document.body) {
    return isAccessiblyHidden(parent);
  }

  return false;
}

/**
 * Get accessible name of an element
 */
export function getAccessibleName(element: Element): string {
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    return labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
  }

  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  // Check for associated label (form elements)
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent?.trim() ?? '';
      }
    }
  }

  // Check title
  const title = element.getAttribute('title');
  if (title) {
    return title;
  }

  // Fallback to text content for certain elements
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLAnchorElement
  ) {
    return element.textContent?.trim() ?? '';
  }

  // Check alt for images
  if (element instanceof HTMLImageElement) {
    return element.alt;
  }

  return '';
}

/**
 * Set ARIA attributes safely
 */
export function setAriaAttributes(
  element: Element,
  attributes: Partial<{
    role: AriaRole;
    label: string;
    labelledby: string;
    describedby: string;
    hidden: boolean;
    expanded: boolean;
    pressed: boolean | 'mixed';
    selected: boolean;
    checked: boolean | 'mixed';
    disabled: boolean;
    required: boolean;
    invalid: boolean;
    busy: boolean;
    live: AriaLive;
    atomic: boolean;
    relevant: 'additions' | 'removals' | 'text' | 'all';
    controls: string;
    owns: string;
    haspopup: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    level: number;
    valuemin: number;
    valuemax: number;
    valuenow: number;
    valuetext: string;
    modal: boolean;
    current: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
    sort: 'ascending' | 'descending' | 'none' | 'other';
    autocomplete: 'inline' | 'list' | 'both' | 'none';
    multiselectable: boolean;
    readonly: boolean;
    orientation: 'horizontal' | 'vertical';
    activedescendant: string;
    colcount: number;
    colindex: number;
    colspan: number;
    rowcount: number;
    rowindex: number;
    rowspan: number;
    setsize: number;
    posinset: number;
  }>
): void {
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;

    if (key === 'role') {
      element.setAttribute('role', value as string);
    } else {
      const ariaAttr = `aria-${key.toLowerCase()}`;
      if (typeof value === 'boolean') {
        element.setAttribute(ariaAttr, String(value));
      } else {
        element.setAttribute(ariaAttr, String(value));
      }
    }
  }
}

/**
 * Create accessible tooltip
 */
export function createTooltip(
  trigger: HTMLElement,
  content: string,
  options: {
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
  } = {}
): { destroy: () => void } {
  const { position = 'top', delay = 500 } = options;

  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
  let timeout: ReturnType<typeof setTimeout>;
  let tooltip: HTMLDivElement | null = null;

  const showTooltip = () => {
    timeout = setTimeout(() => {
      tooltip = document.createElement('div');
      tooltip.id = tooltipId;
      tooltip.role = 'tooltip';
      tooltip.textContent = content;
      tooltip.style.cssText = `
        position: absolute;
        z-index: 10000;
        padding: 4px 8px;
        background: #333;
        color: #fff;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
      `;

      document.body.appendChild(tooltip);

      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + 8;
          break;
      }

      tooltip.style.top = `${top + window.scrollY}px`;
      tooltip.style.left = `${left + window.scrollX}px`;

      trigger.setAttribute('aria-describedby', tooltipId);
    }, delay);
  };

  const hideTooltip = () => {
    clearTimeout(timeout);
    if (tooltip) {
      document.body.removeChild(tooltip);
      tooltip = null;
    }
    trigger.removeAttribute('aria-describedby');
  };

  trigger.addEventListener('mouseenter', showTooltip);
  trigger.addEventListener('mouseleave', hideTooltip);
  trigger.addEventListener('focus', showTooltip);
  trigger.addEventListener('blur', hideTooltip);

  return {
    destroy: () => {
      hideTooltip();
      trigger.removeEventListener('mouseenter', showTooltip);
      trigger.removeEventListener('mouseleave', hideTooltip);
      trigger.removeEventListener('focus', showTooltip);
      trigger.removeEventListener('blur', hideTooltip);
    },
  };
}

/**
 * Roving tabindex management for widget patterns
 */
export function createRovingTabIndex(
  container: Element,
  selector: string,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    onSelect?: (element: HTMLElement, index: number) => void;
  } = {}
): {
  update: () => void;
  setCurrentIndex: (index: number) => void;
  getCurrentIndex: () => number;
  destroy: () => void;
} {
  const { orientation = 'horizontal', wrap = true, onSelect } = options;

  let items: HTMLElement[] = [];
  let currentIndex = 0;

  const update = () => {
    items = Array.from(container.querySelectorAll<HTMLElement>(selector));
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === currentIndex ? '0' : '-1');
    });
  };

  const setCurrentIndex = (index: number) => {
    if (index >= 0 && index < items.length) {
      currentIndex = index;
      update();
      items[currentIndex]?.focus();
      onSelect?.(items[currentIndex], currentIndex);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';
    const isVertical = orientation === 'vertical' || orientation === 'both';

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        if (isHorizontal) {
          event.preventDefault();
          newIndex = wrap
            ? (currentIndex + 1) % items.length
            : Math.min(currentIndex + 1, items.length - 1);
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          event.preventDefault();
          newIndex = wrap
            ? (currentIndex - 1 + items.length) % items.length
            : Math.max(currentIndex - 1, 0);
        }
        break;
      case 'ArrowDown':
        if (isVertical) {
          event.preventDefault();
          newIndex = wrap
            ? (currentIndex + 1) % items.length
            : Math.min(currentIndex + 1, items.length - 1);
        }
        break;
      case 'ArrowUp':
        if (isVertical) {
          event.preventDefault();
          newIndex = wrap
            ? (currentIndex - 1 + items.length) % items.length
            : Math.max(currentIndex - 1, 0);
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  container.addEventListener('keydown', handleKeyDown as EventListener);
  update();

  return {
    update,
    setCurrentIndex,
    getCurrentIndex: () => currentIndex,
    destroy: () => {
      container.removeEventListener('keydown', handleKeyDown as EventListener);
    },
  };
}

/**
 * Reduce motion preference check
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Subscribe to reduced motion preference changes
 */
export function onReducedMotionChange(
  callback: (prefersReduced: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handler = (e: MediaQueryListEvent | MediaQueryList) => {
    callback(e.matches);
  };

  // Initial call
  callback(mediaQuery.matches);

  // Use modern API (legacy addListener/removeListener are deprecated)
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * High contrast mode detection
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Color scheme preference
 */
export function prefersColorScheme(): 'light' | 'dark' | 'no-preference' {
  if (typeof window === 'undefined') return 'no-preference';

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'no-preference';
}

/**
 * Create an accessible modal dialog
 */
export function createAccessibleDialog(
  dialogElement: HTMLElement,
  options: {
    labelledBy?: string;
    describedBy?: string;
    onClose?: () => void;
  } = {}
): {
  open: () => void;
  close: () => void;
  isOpen: boolean;
} {
  const { labelledBy, describedBy, onClose } = options;

  let isOpen = false;
  let focusTrap: ReturnType<typeof createFocusTrap>;

  // Setup dialog
  dialogElement.setAttribute('role', 'dialog');
  dialogElement.setAttribute('aria-modal', 'true');
  if (labelledBy) dialogElement.setAttribute('aria-labelledby', labelledBy);
  if (describedBy) dialogElement.setAttribute('aria-describedby', describedBy);

  focusTrap = createFocusTrap(dialogElement, {
    escapeDeactivates: true,
    onEscape: () => {
      close();
      onClose?.();
    },
    returnFocus: true,
  });

  const open = () => {
    if (isOpen) return;
    isOpen = true;

    dialogElement.removeAttribute('hidden');
    dialogElement.style.display = '';

    // Hide other content from screen readers
    Array.from(document.body.children).forEach(child => {
      if (child !== dialogElement && child instanceof HTMLElement) {
        child.setAttribute('aria-hidden', 'true');
        child.setAttribute('data-dialog-hidden', 'true');
      }
    });

    focusTrap.activate();
    announce('Dialog opened');
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;

    dialogElement.setAttribute('hidden', '');
    focusTrap.deactivate();

    // Restore hidden content
    Array.from(
      document.body.querySelectorAll('[data-dialog-hidden="true"]')
    ).forEach(el => {
      el.removeAttribute('aria-hidden');
      el.removeAttribute('data-dialog-hidden');
    });

    announce('Dialog closed');
  };

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
  };
}

/**
 * ARIA live region manager for dynamic content
 */
export function createLiveRegion(
  options: {
    role?: 'log' | 'status' | 'alert';
    ariaLive?: AriaLive;
    ariaAtomic?: boolean;
    ariaRelevant?: 'additions' | 'removals' | 'text' | 'all';
  } = {}
): {
  element: HTMLDivElement;
  update: (content: string) => void;
  clear: () => void;
  destroy: () => void;
} {
  const {
    role = 'status',
    ariaLive = 'polite',
    ariaAtomic = true,
    ariaRelevant = 'additions',
  } = options;

  const element = document.createElement('div');
  element.setAttribute('role', role);
  element.setAttribute('aria-live', ariaLive);
  element.setAttribute('aria-atomic', String(ariaAtomic));
  element.setAttribute('aria-relevant', ariaRelevant);
  element.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(element);

  return {
    element,
    update: (content: string) => {
      element.textContent = content;
    },
    clear: () => {
      element.textContent = '';
    },
    destroy: () => {
      document.body.removeChild(element);
    },
  };
}

/**
 * Contrast ratio calculation (WCAG)
 */
export function getContrastRatio(
  foreground: string,
  background: string
): number {
  const getLuminance = (color: string): number => {
    const rgb = parseColorToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      const sRGB = c / 255;
      return sRGB <= 0.03928
        ? sRGB / 12.92
        : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse color string to RGB values
 */
function parseColorToRgb(color: string): [number, number, number] | null {
  // Handle hex
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) {
    return [
      parseInt(hexMatch[1], 16),
      parseInt(hexMatch[2], 16),
      parseInt(hexMatch[3], 16),
    ];
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3]),
    ];
  }

  return null;
}

/**
 * Check WCAG compliance levels
 */
export function checkWcagCompliance(
  foreground: string,
  background: string
): {
  ratio: number;
  AA: { largeText: boolean; normalText: boolean };
  AAA: { largeText: boolean; normalText: boolean };
} {
  const ratio = getContrastRatio(foreground, background);

  return {
    ratio,
    AA: {
      largeText: ratio >= 3,
      normalText: ratio >= 4.5,
    },
    AAA: {
      largeText: ratio >= 4.5,
      normalText: ratio >= 7,
    },
  };
}
