import { BASE_PATH } from '../consts';
import { getLocalStorage, setLocalStorage } from './storage';
import { withBasePath } from './helpers';

export interface RecentRoute {
  url: string;
  title: string;
  description: string;
  category: string;
  timestamp: number;
}

export const ROUTE_MEMORY_STORAGE_KEY = 'olive-recent-routes';
const MAX_RECENT_ROUTES = 6;

const stripBasePath = (value: string): string => {
  const pathname = value || '/';
  if (!BASE_PATH || BASE_PATH === '/') return pathname;

  const normalizedBase = BASE_PATH.replace(/\/+$/, '');
  if (pathname === normalizedBase) return '/';
  if (pathname.startsWith(`${normalizedBase}/`)) {
    return pathname.slice(normalizedBase.length) || '/';
  }

  return pathname;
};

export const normalizeRouteUrl = (urlish: string): string => {
  if (!urlish) return '/';

  try {
    const parsed = new URL(urlish, 'https://olive.local');
    const normalizedPath = stripBasePath(parsed.pathname).replace(/\/+$/, '');
    const path = normalizedPath.length ? normalizedPath : '/';
    const search = parsed.search || '';
    const hash = parsed.hash || '';
    return `${path}${search}${hash}`;
  } catch {
    const [pathPart = '/', hashPart = ''] = urlish.split('#');
    const [pathname = '/', searchPart = ''] = pathPart.split('?');
    const normalizedPath = stripBasePath(pathname).replace(/\/+$/, '');
    const path = normalizedPath.length ? normalizedPath : '/';
    const search = searchPart ? `?${searchPart}` : '';
    const hash = hashPart ? `#${hashPart}` : '';
    return `${path}${search}${hash}`;
  }
};

export const toNavigableRouteUrl = (url: string): string => {
  const normalized = normalizeRouteUrl(url);
  if (normalized === '/') return withBasePath('/');
  return withBasePath(normalized.replace(/^\//, ''));
};

export const isTrackableRoute = (url: string): boolean => {
  const normalized = normalizeRouteUrl(url);
  return !/\.(json|xml|txt|webmanifest)$/i.test(normalized);
};

export const readRecentRoutes = (): RecentRoute[] => {
  const items = getLocalStorage<RecentRoute[]>(ROUTE_MEMORY_STORAGE_KEY, []);
  if (!Array.isArray(items)) return [];

  return items
    .filter(
      item =>
        item &&
        typeof item.url === 'string' &&
        typeof item.title === 'string' &&
        typeof item.description === 'string' &&
        typeof item.category === 'string'
    )
    .sort((a, b) => b.timestamp - a.timestamp);
};

export const pushRecentRoute = (
  route: Omit<RecentRoute, 'timestamp'> & { timestamp?: number }
): void => {
  if (typeof window === 'undefined') return;

  const normalizedUrl = normalizeRouteUrl(route.url);
  if (!isTrackableRoute(normalizedUrl)) return;

  const nextEntry: RecentRoute = {
    ...route,
    url: normalizedUrl,
    timestamp: route.timestamp ?? Date.now(),
  };

  const nextItems = [
    nextEntry,
    ...readRecentRoutes().filter(item => item.url !== normalizedUrl),
  ].slice(0, MAX_RECENT_ROUTES);

  setLocalStorage(ROUTE_MEMORY_STORAGE_KEY, nextItems);
  window.dispatchEvent(new CustomEvent('olive:route-memory-updated'));
};

export const clearRecentRoutes = (): void => {
  if (typeof window === 'undefined') return;
  setLocalStorage<RecentRoute[]>(ROUTE_MEMORY_STORAGE_KEY, []);
  window.dispatchEvent(new CustomEvent('olive:route-memory-updated'));
};
