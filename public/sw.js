const STATIC_ASSET_PATHS = [
  '',
  'about/',
  'services/',
  'pricing/',
  'contact/',
  'privacy/',
  'terms/',
  'demo-lab/',
  'shop-demo/',
  'offline/',
  'manifest.webmanifest',
  'favicon.svg',
  'favicon-192.png',
  'favicon-512.png',
];

const isLocalHost = (() => {
  try {
    return (
      self.location.hostname === 'localhost' ||
      self.location.hostname === '127.0.0.1' ||
      self.location.hostname === '[::1]'
    );
  } catch {
    return false;
  }
})();

const trimSlashes = value => value.replace(/^\/+|\/+$/g, '');

const resolveBasePath = () => {
  try {
    const scopeUrl = new URL(self.registration?.scope ?? self.location.href);
    const pathname = scopeUrl.pathname.replace(/\/+$/, '');
    return pathname || '/';
  } catch (error) {
    console.error('[Service Worker] Failed to derive base path:', error);
    return '/';
  }
};

const BASE_PATH = resolveBasePath();
const BASE_PREFIX = BASE_PATH === '/' ? '' : `/${trimSlashes(BASE_PATH)}`;
const CACHE_VERSION = new URL(self.location.href).searchParams.get('v') || '1';
const CACHE_NAME = `github-pages-project-${CACHE_VERSION}-${(trimSlashes(BASE_PATH) || 'root').replace(/[^a-z0-9-]/gi, '-')}`;

const withBase = path => {
  const cleanedPath = (path || '').replace(/^\/+/, '');

  if (!cleanedPath) {
    return BASE_PREFIX ? `${BASE_PREFIX}/` : '/';
  }

  return `${BASE_PREFIX}/${cleanedPath}`;
};

// Assets to cache on install
const STATIC_ASSETS = STATIC_ASSET_PATHS.map(withBase);

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');

  // Local preview/dev: don't cache or control requests.
  if (isLocalHost) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async cache => {
        console.log('[Service Worker] Caching static assets');
        const results = await Promise.all(
          STATIC_ASSETS.map(async asset => {
            try {
              await cache.add(asset);
              return { asset, ok: true };
            } catch (error) {
              console.warn(
                '[Service Worker] Skipping asset (cache error):',
                asset,
                error
              );
              return { asset, ok: false };
            }
          })
        );
        const failed = results.filter(entry => !entry.ok);
        if (failed.length) {
          console.warn(
            `[Service Worker] Cached with ${failed.length} skipped asset(s):`,
            failed.map(f => f.asset)
          );
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      // Local preview/dev: remove ourselves and any caches.
      if (isLocalHost) {
        await Promise.all(
          cacheNames
            .filter(name => name.startsWith('github-pages-project-'))
            .map(name => caches.delete(name))
        );
        try {
          await self.registration.unregister();
        } catch {
          // ignore
        }
        return;
      }

      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      await self.clients.claim();
    })()
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;

  // Local preview/dev: do not intercept network at all.
  if (isLocalHost) {
    return;
  }

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  const isNavigationRequest = request.mode === 'navigate';
  const isAstroBundleAsset = pathname.includes('/_astro/');

  // Avoid SW-caching navigations or hashed bundle assets.
  // These are the most common sources of “stale HTML -> missing hashed JS” after deploy.
  const shouldCache =
    !isNavigationRequest &&
    !isAstroBundleAsset &&
    request.destination !== 'script' &&
    request.destination !== 'style' &&
    !pathname.endsWith('.js') &&
    !pathname.endsWith('.css') &&
    !pathname.endsWith('.map');

  // For navigations, bypass the HTTP cache to reduce “stale HTML -> missing hashed asset” issues.
  const networkRequest = isNavigationRequest
    ? new Request(request, { cache: 'reload' })
    : request;

  event.respondWith(
    fetch(networkRequest)
      .then(async response => {
        // Cache successful responses
        if (response && response.status === 200) {
          if (shouldCache) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }

        // If the network returned a non-200 (e.g., 404 for an old hashed asset),
        // try the cache before giving up.
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return (
              caches.match(withBase('/offline/')) ||
              caches.match(withBase('/offline.html')) ||
              new Response('<h1>Offline</h1>', {
                headers: { 'Content-Type': 'text/html' },
              })
            );
          }

          // Return generic offline response
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});

// Message event - handle commands from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});
