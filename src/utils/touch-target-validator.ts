/**
 * Touch Target Validator
 * Ensures all interactive elements meet WCAG AAA touch target size (48x48px minimum)
 */

export interface TouchTargetIssue {
  element: HTMLElement;
  width: number;
  height: number;
  minDimension: number;
  selector: string;
  severity: 'error' | 'warning';
  suggestion: string;
}

const WCAG_AAA_MIN_SIZE = 48; // 48x48px
const WCAG_AA_MIN_SIZE = 44; // 44x44px

/** Interactive elements that should have touch targets */
const INTERACTIVE_SELECTORS = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="menuitem"]',
  '[tabindex]',
  '[onclick]',
  '.btn',
  '.button',
];

/**
 * Get a descriptive selector for an element
 */
function getElementSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) return `.${classes.join('.')}`;
  }
  return element.tagName.toLowerCase();
}

/**
 * Check if an element has adequate touch target size
 */
export function validateTouchTarget(
  element: HTMLElement,
  minSize: number = WCAG_AAA_MIN_SIZE
): TouchTargetIssue | null {
  const rect = element.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const minDimension = Math.min(width, height);

  if (minDimension < minSize) {
    const severity = minDimension < WCAG_AA_MIN_SIZE ? 'error' : 'warning';
    const selector = getElementSelector(element);

    let suggestion = '';
    if (width < minSize && height < minSize) {
      suggestion = `Increase both width and height to at least ${minSize}px`;
    } else if (width < minSize) {
      suggestion = `Increase width to at least ${minSize}px`;
    } else {
      suggestion = `Increase height to at least ${minSize}px`;
    }

    return {
      element,
      width,
      height,
      minDimension,
      selector,
      severity,
      suggestion,
    };
  }

  return null;
}

/**
 * Validate all interactive elements on the page
 */
export function validateAllTouchTargets(
  minSize: number = WCAG_AAA_MIN_SIZE
): TouchTargetIssue[] {
  const issues: TouchTargetIssue[] = [];
  const selector = INTERACTIVE_SELECTORS.join(', ');
  const elements = document.querySelectorAll<HTMLElement>(selector);

  elements.forEach(element => {
    // Skip hidden elements
    if (
      element.offsetParent === null ||
      window.getComputedStyle(element).display === 'none'
    ) {
      return;
    }

    const issue = validateTouchTarget(element, minSize);
    if (issue) {
      issues.push(issue);
    }
  });

  return issues;
}

/**
 * Generate a console report of touch target issues
 */
export function reportTouchTargetIssues(
  issues: TouchTargetIssue[] = validateAllTouchTargets()
): void {
  if (issues.length === 0) {
    console.log(
      '%c✓ All touch targets meet WCAG AAA guidelines (48x48px)',
      'color: #22c55e; font-weight: bold;'
    );
    return;
  }

  console.group(
    `%c⚠ Found ${issues.length} touch target issue(s)`,
    'color: #f59e0b; font-weight: bold;'
  );

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (errors.length > 0) {
    console.group(`%c✖ Errors (${errors.length})`, 'color: #ef4444;');
    errors.forEach(issue => {
      console.log(
        `%c${issue.selector}%c - ${issue.width.toFixed(0)}x${issue.height.toFixed(0)}px (min: ${issue.minDimension.toFixed(0)}px)`,
        'font-weight: bold;',
        'font-weight: normal;'
      );
      console.log(`  ${issue.suggestion}`);
      console.log('  Element:', issue.element);
    });
    console.groupEnd();
  }

  if (warnings.length > 0) {
    console.group(`%c⚠ Warnings (${warnings.length})`, 'color: #f59e0b;');
    warnings.forEach(issue => {
      console.log(
        `%c${issue.selector}%c - ${issue.width.toFixed(0)}x${issue.height.toFixed(0)}px (min: ${issue.minDimension.toFixed(0)}px)`,
        'font-weight: bold;',
        'font-weight: normal;'
      );
      console.log(`  ${issue.suggestion}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Auto-fix touch targets by adding appropriate classes
 */
export function autoFixTouchTargets(
  issues: TouchTargetIssue[] = validateAllTouchTargets(),
  className: string = 'tap-target'
): number {
  let fixed = 0;

  issues.forEach(issue => {
    const { element } = issue;

    // Add tap target class
    element.classList.add(className);

    // Ensure minimum size via inline style as fallback
    const currentWidth = parseFloat(
      window.getComputedStyle(element).width || '0'
    );
    const currentHeight = parseFloat(
      window.getComputedStyle(element).height || '0'
    );

    if (currentWidth < WCAG_AAA_MIN_SIZE) {
      element.style.minWidth = `${WCAG_AAA_MIN_SIZE}px`;
    }
    if (currentHeight < WCAG_AAA_MIN_SIZE) {
      element.style.minHeight = `${WCAG_AAA_MIN_SIZE}px`;
    }

    fixed++;
  });

  return fixed;
}

/**
 * Visual debug overlay for touch targets
 */
export function showTouchTargetOverlay(
  issues: TouchTargetIssue[] = validateAllTouchTargets()
): void {
  // Remove existing overlays
  document.querySelectorAll('.touch-target-overlay').forEach(el => el.remove());

  issues.forEach(issue => {
    const { element } = issue;
    const rect = element.getBoundingClientRect();

    const overlay = document.createElement('div');
    overlay.className = 'touch-target-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${issue.severity === 'error' ? '#ef4444' : '#f59e0b'};
      background: ${issue.severity === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
      pointer-events: none;
      z-index: 999999;
      border-radius: 4px;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      background: ${issue.severity === 'error' ? '#ef4444' : '#f59e0b'};
      color: white;
      padding: 2px 6px;
      font-size: 10px;
      font-family: monospace;
      border-radius: 2px;
      white-space: nowrap;
    `;
    label.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    overlay.appendChild(label);

    document.body.appendChild(overlay);
  });
}

/**
 * Initialize touch target validation in development mode
 */
export function initTouchTargetValidation(
  options: {
    autoFix?: boolean;
    showOverlay?: boolean;
    logToConsole?: boolean;
  } = {}
): void {
  const { autoFix = false, showOverlay = false, logToConsole = true } = options;

  // Only run in development
  if (import.meta.env.PROD && !import.meta.env.DEV) return;

  const runValidation = () => {
    const issues = validateAllTouchTargets();

    if (logToConsole) {
      reportTouchTargetIssues(issues);
    }

    if (autoFix && issues.length > 0) {
      const fixed = autoFixTouchTargets(issues);
      console.log(`%c✓ Auto-fixed ${fixed} touch target(s)`, 'color: #22c55e;');
    }

    if (showOverlay) {
      showTouchTargetOverlay(issues);
    }
  };

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runValidation);
  } else {
    runValidation();
  }

  // Re-run on page transitions
  document.addEventListener('astro:page-load', runValidation);
}
