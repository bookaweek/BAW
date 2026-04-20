// BookAWeek Service Worker v2 — Offline + Push Notifications
// Uses relative paths — works on GitHub Pages subdirectories

const CACHE_NAME = 'bookaweek-v2';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['bookwarriors-login.html','manifest.json','icon-192.png','icon-512.png']).catch(()=>{})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('api.brevo.com') ||
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('bookwarriors-login.html');
      });
    })
  );
});

self.addEventListener('push', event => {
  let data = { title:'BookAWeek', body:'Time to log your reading session! Open the app now.', icon:'icon-192.png' };
  try { data = event.data.json(); } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: data.icon || 'icon-192.png',
      badge: 'icon-72.png', tag: 'bookaweek-reminder', renotify: true,
      data: { url: 'bookwarriors-login.html' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      for (const c of list) if (c.url.includes('bookwarriors') && 'focus' in c) return c.focus();
      if (clients.openWindow) return clients.openWindow('bookwarriors-login.html');
    })
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-logs')
    self.clients.matchAll().then(list => list.forEach(c => c.postMessage({ type:'SYNC_LOGS' })));
});// BookAWeek Service Worker v2 — Offline + Push Notifications
// Uses relative paths — works on GitHub Pages subdirectories

const CACHE_NAME = 'bookaweek-v2';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['bookwarriors-login.html','manifest.json','icon-192.png','icon-512.png']).catch(()=>{})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('api.brevo.com') ||
      event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('bookwarriors-login.html');
      });
    })
  );
});

self.addEventListener('push', event => {
  let data = { title:'BookAWeek', body:'Time to log your reading session! Open the app now.', icon:'icon-192.png' };
  try { data = event.data.json(); } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: data.icon || 'icon-192.png',
      badge: 'icon-72.png', tag: 'bookaweek-reminder', renotify: true,
      data: { url: 'bookwarriors-login.html' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      for (const c of list) if (c.url.includes('bookwarriors') && 'focus' in c) return c.focus();
      if (clients.openWindow) return clients.openWindow('bookwarriors-login.html');
    })
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-logs')
    self.clients.matchAll().then(list => list.forEach(c => c.postMessage({ type:'SYNC_LOGS' })));
});
