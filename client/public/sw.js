/* Dukani Service Worker — BHABY GROUP LTD */
const CACHE = 'dukani-v1';
const OFFLINE_URL = '/';

// Assets to pre-cache on install
const PRECACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests; skip API calls (always fresh)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.startsWith('/assets/') || url.pathname === '/')) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match(OFFLINE_URL)))
  );
});

// Push notification handler (for future use)
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dukani', {
      body: data.body || 'You have a new notification',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'dukani-notification',
      data: data.url ? { url: data.url } : {}
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
