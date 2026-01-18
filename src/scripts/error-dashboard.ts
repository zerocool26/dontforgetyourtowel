/**
 * ⚠️ NOTICE: This file is not compatible with static GitHub Pages deployment.
 *
 * The error dashboard was designed for a dynamic environment with API endpoints.
 * It makes calls to:
 * - /api/error-reviewer/analyze
 * - /api/error-reviewer/auto-fix
 * - /api/export-report
 *
 * These endpoints do not exist in a static build and will fail.
 *
 * This file is excluded from TypeScript compilation (see tsconfig.json).
 *
 * Options:
 * 1. Keep this file for reference/documentation purposes only
 * 2. Delete if you're certain you'll only use static hosting
 * 3. Implement a serverless backend (Netlify Functions, Vercel, etc.) to support these features
 *
 * The static narrative page at /error-dashboard provides an alternative approach
 * that documents the error review workflow without requiring live APIs.
 */

type StatusType = 'info' | 'success' | 'error' | 'warning';

type SummaryData = {
  totalIssues?: number;
  criticalIssues?: number;
  autoFixableIssues?: number;
  healthScore?: number;
};

type AnalysisResponse = {
  summary?: SummaryData;
};

type AutoFixResponse = {
  success?: boolean;
  fixed?: number;
  failed?: number;
  error?: string;
};

type DashboardEventDetail = {
  timestamp: number;
  message?: string;
  error?: string;
  statusType?: StatusType;
};

declare global {
  interface Window {
    __errorDashboardBound?: boolean;
  }
}

const STATUS_ICONS: Record<StatusType, string> = {
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
};

const STATUS_COLORS: Record<StatusType, string> = {
  info: 'bg-blue-600',
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-600',
};

const getElement = <T extends HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

const emitDashboardEvent = (
  event: string,
  detail: Partial<DashboardEventDetail> = {}
): void => {
  document.dispatchEvent(
    new CustomEvent(`error-dashboard:${event}`, {
      detail: {
        timestamp: Date.now(),
        ...detail,
      },
    })
  );
};

const showStatus = (message: string, type: StatusType = 'info'): void => {
  const container = getElement<HTMLDivElement>('status-indicators');
  if (!container) {
    return;
  }

  const statusEl = document.createElement('div');
  statusEl.className = `${STATUS_COLORS[type]} text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 transform transition-all duration-300 translate-y-4 opacity-0`;

  const iconSpan = document.createElement('span');
  iconSpan.textContent = STATUS_ICONS[type];

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;

  statusEl.appendChild(iconSpan);
  statusEl.appendChild(messageSpan);

  container.appendChild(statusEl);
  emitDashboardEvent('status', { message, statusType: type });

  requestAnimationFrame(() => {
    statusEl.classList.remove('translate-y-4', 'opacity-0');
    statusEl.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    statusEl.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => {
      if (statusEl.parentElement === container) {
        container.removeChild(statusEl);
      }
    }, 300);
  }, 4000);
};

const animateScore = (element: HTMLElement, from: number, to: number): void => {
  const startTime = performance.now();
  const duration = 1000;

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    const value = Math.round(from + (to - from) * easedProgress);
    element.textContent = value.toString();

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

const updateQuickStats = (summary?: SummaryData): void => {
  if (!summary) {
    return;
  }

  const totalIssues = getElement<HTMLDivElement>('total-issues');
  if (totalIssues) {
    totalIssues.textContent = String(summary.totalIssues ?? 0);
  }

  const criticalIssues = getElement<HTMLDivElement>('critical-issues');
  if (criticalIssues) {
    criticalIssues.textContent = String(summary.criticalIssues ?? 0);
  }

  const autoFixable = getElement<HTMLDivElement>('auto-fixable');
  if (autoFixable) {
    autoFixable.textContent = String(summary.autoFixableIssues ?? 0);
  }

  const healthElement = getElement<HTMLDivElement>('health-score');
  if (healthElement) {
    const currentScore = Number.parseInt(healthElement.textContent ?? '0', 10);
    const targetScore = summary.healthScore ?? 90;
    animateScore(
      healthElement,
      Number.isNaN(currentScore) ? 0 : currentScore,
      targetScore
    );
  }
};

const refreshAnalysis = async (): Promise<void> => {
  showStatus('Refreshing analysis...', 'info');

  try {
    const response = await fetch('/api/error-reviewer/analyze');
    const data = (await response.json()) as AnalysisResponse;

    updateQuickStats(data.summary);
    showStatus('Analysis refreshed successfully!', 'success');
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    emitDashboardEvent('refresh-error', {
      error: error instanceof Error ? error.message : String(error),
    });
    showStatus('Failed to refresh analysis', 'error');
  }
};

const runAutoFix = async (): Promise<void> => {
  showStatus('Running auto-fix...', 'info');

  try {
    const response = await fetch('/api/error-reviewer/auto-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const result = (await response.json()) as AutoFixResponse;

    if (result.success) {
      showStatus(
        `Auto-fix completed: ${result.fixed ?? 0} fixed, ${
          result.failed ?? 0
        } failed`,
        'success'
      );
      setTimeout(refreshAnalysis, 2000);
    } else {
      const message = result.error ?? 'Auto-fix failed';
      emitDashboardEvent('auto-fix-warning', { message });
      showStatus(message, 'error');
    }
  } catch (error) {
    emitDashboardEvent('auto-fix-error', {
      error: error instanceof Error ? error.message : String(error),
    });
    showStatus('Auto-fix failed', 'error');
  }
};

const exportReport = async (): Promise<void> => {
  const format = prompt('Export format (json/markdown/html):', 'markdown');
  if (!format) {
    return;
  }

  showStatus(`Exporting ${format} report...`, 'info');

  try {
    const response = await fetch(`/api/export-report?format=${format}`);

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `error-report.${format}`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      showStatus('Report exported successfully!', 'success');
    } else {
      throw new Error('Export failed');
    }
  } catch (error) {
    emitDashboardEvent('export-error', {
      error: error instanceof Error ? error.message : String(error),
    });
    showStatus('Export failed', 'error');
  }
};

const runFullAnalysis = async (): Promise<void> => {
  showStatus('Running comprehensive analysis...', 'info');

  try {
    const response = await fetch(
      '/api/error-reviewer/analyze?deployment=true&git=true'
    );
    const data = (await response.json()) as AnalysisResponse;

    updateQuickStats(data.summary);
    showStatus('Full analysis completed!', 'success');
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    emitDashboardEvent('full-analysis-error', {
      error: error instanceof Error ? error.message : String(error),
    });
    showStatus('Full analysis failed', 'error');
  }
};

const handleKeyboardShortcuts = (event: KeyboardEvent): void => {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  const actions: Record<string, () => void> = {
    r: refreshAnalysis,
    f: runAutoFix,
    e: exportReport,
    a: runFullAnalysis,
  };

  const action = actions[event.key.toLowerCase()];
  if (action) {
    event.preventDefault();
    action();
  }
};

const initializeDashboard = (): void => {
  // Only activate on pages that actually render the dashboard.
  const statusContainer = getElement<HTMLDivElement>('status-indicators');
  if (!statusContainer) return;

  // Bind once (Astro view transitions can re-run init).
  if (window.__errorDashboardBound) return;
  window.__errorDashboardBound = true;

  getElement<HTMLButtonElement>('refresh-btn')?.addEventListener(
    'click',
    refreshAnalysis
  );
  getElement<HTMLButtonElement>('auto-fix-btn')?.addEventListener(
    'click',
    runAutoFix
  );
  getElement<HTMLButtonElement>('export-btn')?.addEventListener(
    'click',
    exportReport
  );
  getElement<HTMLButtonElement>('run-analysis-btn')?.addEventListener(
    'click',
    runFullAnalysis
  );

  document.addEventListener('keydown', handleKeyboardShortcuts);

  showStatus('Elite Error Reviewer Dashboard loaded', 'success');
  setTimeout(() => {
    showStatus(
      'Tip: Use Ctrl+R to refresh, Ctrl+F to auto-fix, Ctrl+E to export',
      'info'
    );
  }, 2000);
};

const runDashboardInit = () => initializeDashboard();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runDashboardInit);
} else {
  runDashboardInit();
}

document.addEventListener('astro:page-load', runDashboardInit);
