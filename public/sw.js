const CACHE = 'codex-local-shell-v3';
const STATIC_ASSETS = ['/icons/codex-local.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('codex-local-shell-') && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      request.mode === 'navigate' || url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/_next/')) return;
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
