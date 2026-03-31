// BookAWeek Service Worker v1.0
// Handles: offline caching + push notifications

const CACHE_NAME = 'bookaweek-v1';
const OFFLINE_URLS = ['/bookwarriors-login.html'];

// ── INSTALL: cache the app shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: serve from cache when offline ──
self.addEventListener('fetch', event => {
  // Only intercept same-origin GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, return the app
          if (event.request.mode === 'navigate') {
            return caches.match('/bookwarriors-login.html');
          }
        });
      })
  );
});

// ── PUSH: receive push notifications ──
self.addEventListener('push', event => {
  let data = { title: 'BookAWeek', body: 'Time to log your session. We Read. We Reflect. We Execute.', icon: '/icon-192.png' };
  try { data = { ...data, ...event.data.json() }; } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-96.png',
      vibrate: [200, 100, 200],
      tag: 'bookaweek-reminder',
      renotify: true,
      data: { url: data.url || '/bookwarriors-login.html' }
    })
  );
});

// ── NOTIFICATION CLICK: open the app ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('bookwarriors-login') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/bookwarriors-login.html');
      }
    })
  );
});
