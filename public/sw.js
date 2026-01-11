const STATIC_ASSET_PATHS = [
  '',
  'about/',
  'services/',
  'pricing/',
  'contact/',
  'privacy/',
  'terms/',
  'demo-lab/',
  'offline/',
  'manifest.webmanifest',
  'favicon.svg',
  'favicon-192.png',
  'favicon-512.png',
];

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
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
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
