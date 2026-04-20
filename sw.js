// ============================================================
// BookAWeek Service Worker v3 — FIXED
// Fixes: Duplicate code × 5, No daily notification mechanism,
//        Missing periodicSync, Badge icon mismatch
// ============================================================

const CACHE_NAME = 'bookaweek-v3';
const ASSETS = [
  'bookwarriors-login.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// ─── DAILY NOTIFICATION CONFIG ────────────────────────────
// Fires at this hour (24h format) in the user's LOCAL time
const NOTIFY_HOUR = 9; // 9:00 AM daily
const NOTIFY_MINUTE = 0;

const MESSAGES = [
  { body: '📖 Time to log your reading session! Every page counts.', },
  { body: '🔥 BookWarriors don\'t skip days. Open the app and log your read!', },
  { body: '📚 Your reading streak is waiting. Don\'t break the chain!', },
  { body: '⚡ Champions read daily. Log today\'s session now!', },
  { body: '🏆 One book a week starts with one page today. Let\'s go!', },
];

// ─── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(ASSETS).catch(err => console.warn('[BAW SW] Cache addAll partial fail:', err))
    )
  );
  self.skipWaiting();
});

// ─── ACTIVATE ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => {
      self.clients.claim();
      // Schedule the first daily notification check after activation
      scheduleDailyNotification();
    })
  );
});

// ─── FETCH (Network-first with cache fallback) ─────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Never intercept external API calls
  if (
    url.includes('script.google.com') ||
    url.includes('api.brevo.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (
          event.request.method === 'GET' &&
          response &&
          response.status === 200
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('bookwarriors-login.html');
        }
      });
    })
  );
});

// ─── PUSH (Server-sent push notifications) ─────────────────
self.addEventListener('push', event => {
  let data = {
    title: '📖 BookAWeek',
    body: 'Time to log your reading session! Open the app now.',
    icon: 'icon-192.png'
  };

  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch (e) {}
  }

  event.waitUntil(showBookNotification(data.title, data.body, data.icon));
});

// ─── PERIODIC BACKGROUND SYNC (Daily notifications) ────────
// This fires when the browser allows periodic background sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'bookaweek-daily-reminder') {
    event.waitUntil(fireLocalDailyNotification());
  }
});

// ─── MESSAGE (From main page → SW) ────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_DAILY') {
    scheduleDailyNotification();
  }
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    fireLocalDailyNotification();
  }
  if (event.data && event.data.type === 'SYNC_LOGS') {
    self.clients.matchAll().then(list =>
      list.forEach(c => c.postMessage({ type: 'SYNC_LOGS' }))
    );
  }
});

// ─── SYNC (One-time background sync) ───────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-logs') {
    self.clients.matchAll().then(list =>
      list.forEach(c => c.postMessage({ type: 'SYNC_LOGS' }))
    );
  }
});

// ─── NOTIFICATION CLICK ────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Focus existing open window if found
      for (const c of list) {
        if (c.url.includes('bookwarriors') && 'focus' in c) return c.focus();
      }
      // Otherwise open fresh
      if (clients.openWindow) return clients.openWindow('bookwarriors-login.html');
    })
  );
});

// ─── HELPERS ───────────────────────────────────────────────

/**
 * Shows a BookAWeek branded notification via the SW registration.
 */
function showBookNotification(title, body, icon = 'icon-192.png') {
  return self.registration.showNotification(title, {
    body,
    icon,
    badge: 'icon-192.png',   // FIXED: was icon-72.png (not cached / likely missing)
    tag: 'bookaweek-reminder',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: 'bookwarriors-login.html' }
  });
}

/**
 * Picks a random motivational message and fires the daily notification.
 */
function fireLocalDailyNotification() {
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  return showBookNotification('📖 BookAWeek Daily Reminder', msg.body);
}

/**
 * CLIENT-SIDE DAILY SCHEDULER
 *
 * Calculates ms until the next NOTIFY_HOUR:NOTIFY_MINUTE,
 * sets a setTimeout to fire the notification, then re-schedules
 * itself for the next day.
 *
 * This runs inside the SW and works WITHOUT a push server.
 * Note: SW can be killed by the browser — periodicSync is the
 * more reliable mechanism for daily triggers. Both are implemented.
 */
function scheduleDailyNotification() {
  const now = new Date();
  const next = new Date();

  next.setHours(NOTIFY_HOUR, NOTIFY_MINUTE, 0, 0);

  // If we've already passed today's notification time, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  const msUntilNext = next - now;

  // setTimeout inside SW — fires once at the scheduled time
  setTimeout(() => {
    fireLocalDailyNotification();
    // Re-schedule for the next day
    scheduleDailyNotification();
  }, msUntilNext);

  console.log(
    `[BAW SW] Daily notification scheduled in ${Math.round(msUntilNext / 60000)} minutes`,
    `(at ${next.toLocaleTimeString()})`
  );
}
