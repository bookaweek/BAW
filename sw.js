// ═══════════════════════════════════════════════════════════════
// BOOKAWEEK SERVICE WORKER — v9
// Self-contained reminder engine. Works when app is closed.
// Never crashes. Escalating urgency. Smart streak protection.
// ═══════════════════════════════════════════════════════════════

var CACHE     = 'bookaweek-v9';
var SHELL     = ['bookwarriors-login.html', 'manifest.json'];

// ── Schedule stored in SW memory (refreshed from page on login) ──
var _schedule = {
  enabled:  false,
  member:   '',
  streak:   0,
  lastLog:  '',        // YYYY-MM-DD
  times:    [8, 14, 20] // WAT hours
};
var _checkTimer = null;

// ═══════════════════════
// INSTALL
// ═══════════════════════
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(SHELL).catch(function() {});
    })
  );
});

// ═══════════════════════
// ACTIVATE — wipe old caches
// ═══════════════════════
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// ═══════════════════════
// FETCH — network-first for HTML, cache-first for assets
// ═══════════════════════
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Never intercept GAS or external API calls
  if (url.includes('script.google.com') ||
      url.includes('docs.google.com') ||
      url.includes('googleapis.com') ||
      url.includes('fonts.gstatic') ||
      url.includes('gstatic.com') ||
      url.includes('api.brevo')) {
    return; // let browser handle it natively
  }

  // HTML: always network-first so updates are instant
  var isNav = e.request.mode === 'navigate' ||
              (e.request.method === 'GET' && e.request.headers.get('accept') &&
               e.request.headers.get('accept').includes('text/html'));

  if (isNav) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(function(r) {
          if (r && r.ok) {
            // Clone FIRST, synchronously, before the body is ever read.
            // Caching the clone is fire-and-forget; the original `r` goes
            // straight back to the page untouched.
            var toCache = r.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, toCache); });
          }
          return r;
        })
        .catch(function() {
          return caches.match('bookwarriors-login.html')
              || caches.match(e.request);
        })
    );
    return;
  }

  // Everything else: cache-first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(r) {
        if (r && r.ok && e.request.method === 'GET') {
          // Clone FIRST, synchronously — fixes "Response body is already used"
          // which happened when c.put() ran its .clone() AFTER the page had
          // already started reading r's body via .text()/.json().
          var toCache = r.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, toCache); });
        }
        return r;
      }).catch(function() { return new Response('', { status: 503 }); });
    })
  );
});

// ═══════════════════════
// MESSAGES from page
// ═══════════════════════
self.addEventListener('message', function(e) {
  if (!e.data) return;
  var type = e.data.type;

  // Page tells SW to skip waiting and reload all clients
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    self.clients.matchAll().then(function(clients) {
      clients.forEach(function(c) { c.postMessage({ type: 'RELOAD' }); });
    });
    return;
  }

  // Page sends schedule config on login
  if (type === 'SCHEDULE') {
    var p = e.data.payload || {};
    _schedule.enabled = !!p.enabled;
    _schedule.member  = p.member  || '';
    _schedule.streak  = p.streak  || 0;
    _schedule.lastLog = p.lastLog || '';
    _schedule.times   = p.times   || [8, 14, 20];
    startScheduler();
    return;
  }

  // Page asks SW to show a notification directly
  if (type === 'SHOW_NOTIF') {
    var payload = e.data.payload || {};
    showNotification(payload.title, payload.body, payload.tag, payload.data);
    return;
  }

  // Page responds with today's log status
  if (type === 'LOG_STATUS') {
    _schedule.lastLog = e.data.logged
      ? new Date().toISOString().slice(0, 10)
      : (_schedule.lastLog || '');
    _schedule.streak  = e.data.streak || _schedule.streak;
    _schedule.member  = e.data.member || _schedule.member;
    return;
  }
});

// ═══════════════════════
// PUSH (from server — future use)
// ═══════════════════════
self.addEventListener('push', function(e) {
  var data = { title: 'BookAWeek 📚', body: 'Time to log your reading session!' };
  try { data = e.data.json(); } catch(ex) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:     data.body,
      icon:     'icon-192.png',
      badge:    'icon-72.png',
      tag:      'baw-push',
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url: 'bookwarriors-login.html' }
    })
  );
});

// ═══════════════════════
// NOTIFICATION CLICK
// ═══════════════════════
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var action = e.action; // 'log', 'later', or '' (body tap)

  if (action === 'later') {
    // Snooze 2 hours: show brief confirmation, reschedule, do NOT open app
    self.registration.showNotification('Snoozed \u2014 see you in 2 hours', {
      body: 'We\u2019ll remind you again in 2 hours. Keep that streak!',
      icon: 'icon-192.png', tag: 'baw-snooze-confirm', silent: true
    });
    // Auto-dismiss the snooze confirmation after 4 seconds
    setTimeout(function() {
      self.registration.getNotifications({ tag: 'baw-snooze-confirm' })
        .then(function(ns) { ns.forEach(function(n) { n.close(); }); });
    }, 4000);
    // Re-fire the actual reminder after 2 hours
    setTimeout(function() {
      self.registration.showNotification('\u23F0 Time to Log, BookWarrior!', {
        body: 'You asked for a reminder. Your streak is waiting \uD83D\uDD25',
        icon: 'icon-192.png', badge: 'icon-192.png', tag: 'baw-reminder',
        requireInteraction: true,
        actions: [
          { action: 'log',   title: '\uD83D\uDCDD Log Now' },
          { action: 'later', title: '\u23F0 Later' }
        ]
      });
    }, 2 * 60 * 60 * 1000);
    return; // do NOT open the app for a snooze tap
  }

  // 'log' action OR direct body tap — open/focus the app
  var target = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url
    : 'bookwarriors-login.html';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(list) {
        for (var i = 0; i < list.length; i++) {
          var c = list[i];
          if (c.url.includes('bookwarriors') && 'focus' in c) {
            return c.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      })
  );
});

// ═══════════════════════════════════════════════════════════════
// REMINDER SCHEDULER ENGINE
// Runs a timer inside the SW that checks every 60 seconds.
// Fires when: current hour matches a schedule window AND
//             member hasn't logged today.
// Escalates urgency as the day goes on without a log.
// ═══════════════════════════════════════════════════════════════

var _firedToday = {}; // { 'YYYY-MM-DD_HH': true } — track per-slot fires

function startScheduler() {
  if (_checkTimer) clearInterval(_checkTimer);
  if (!_schedule.enabled) return;
  // Check immediately, then every 60 seconds
  checkAndFire();
  _checkTimer = setInterval(checkAndFire, 60 * 1000);
}

function checkAndFire() {
  if (!_schedule.enabled) return;

  var now     = new Date();
  var todayStr = now.toISOString().slice(0, 10);
  var hour    = now.getHours();

  // Has member already logged today?
  var loggedToday = (_schedule.lastLog === todayStr);
  if (loggedToday) return; // great — nothing to do

  // Ask the page if they've logged (if app is open)
  self.clients.matchAll({ type: 'window' }).then(function(clients) {
    if (clients.length > 0) {
      // App is open — ask it for live log status
      clients[0].postMessage({ type: 'CHECK_LOGGED' });
    } else {
      // App is closed — fire based on schedule
      fireIfScheduled(hour, todayStr);
    }
  });
}

function fireIfScheduled(hour, todayStr) {
  var times = _schedule.times || [8, 14, 20];

  for (var i = 0; i < times.length; i++) {
    var t       = times[i];
    var slotKey = todayStr + '_' + t;

    // Fire if within the 5-minute window after the scheduled hour
    // AND we haven't fired this slot today
    if (hour === t && !_firedToday[slotKey]) {
      _firedToday[slotKey] = true;
      fireReminderNotification(hour, times);
      // Clean up old slot keys (keep only today)
      cleanSlotKeys(todayStr);
      return;
    }
  }
}

function fireReminderNotification(hour, times) {
  var member  = _schedule.member || 'BookWarrior';
  var streak  = _schedule.streak || 0;
  var name    = member.split(' ')[0];

  // Determine urgency based on which window we're in
  var lastTime = times[times.length - 1];
  var isLastChance = (hour >= lastTime);
  var isMidDay     = (hour >= 12 && hour < 18);

  var title, body;

  if (isLastChance && streak >= 3) {
    title = '🔥 Last chance! ' + streak + '-day streak at risk';
    body  = name + ', you haven\'t logged today. Your ' + streak + '-day streak breaks at midnight. Log now.';
  } else if (isLastChance) {
    title = '⏰ Last reminder for today, ' + name;
    body  = 'Don\'t let today pass unlogged. A BookWarrior reads every day. Open the app now.';
  } else if (streak >= 7) {
    title = '🏆 ' + streak + '-day streak! Keep it alive';
    body  = name + ', ' + streak + ' days of reading. Log today\'s session to protect it.';
  } else if (streak >= 3) {
    title = '🔥 ' + streak + '-day streak going strong!';
    body  = 'Keep the chain unbroken, ' + name + '. Log your session today.';
  } else if (isMidDay) {
    var midMsgs = [
      'Your book is waiting, ' + name + '. Even 20 minutes counts.',
      'Halfway through the day. Have you read yet, ' + name + '?',
      'The covenant calls, ' + name + '. We Read. We Reflect. We Execute.'
    ];
    title = '📖 BookAWeek Reminder';
    body  = midMsgs[Math.floor(Math.random() * midMsgs.length)];
  } else {
    var morningMsgs = [
      'Good morning, ' + name + '! Set your reading intention for today.',
      name + ', start the day with your book. Even 10 pages.',
      'The best time to read is morning. Open your book now, ' + name + '.'
    ];
    title = '🌅 Good morning, ' + name + '!';
    body  = morningMsgs[Math.floor(Math.random() * morningMsgs.length)];
  }

  showNotification(title, body, 'baw-daily-' + hour, { url: 'bookwarriors-login.html' });
}

function showNotification(title, body, tag, data) {
  if (!self.registration) return;
  self.registration.showNotification(title || 'BookAWeek', {
    body:       body  || 'Time to log your reading session!',
    icon:       'icon-192.png',
    badge:      'icon-72.png',
    tag:        tag   || 'baw-reminder',
    renotify:   true,
    vibrate:    [150, 80, 150, 80, 300],
    requireInteraction: false,
    data:       data  || { url: 'bookwarriors-login.html' },
    actions: [
      { action: 'log',   title: '📝 Log Now' },
      { action: 'later', title: '⏰ Later'   }
    ]
  }).catch(function() {}); // never crash the SW
}

function cleanSlotKeys(todayStr) {
  Object.keys(_firedToday).forEach(function(k) {
    if (!k.startsWith(todayStr)) delete _firedToday[k];
  });
}

// ═══════════════════════
// PERIODIC SYNC (Chrome background sync)
// Fires every ~hour even when app is closed — keeps SW alive
// ═══════════════════════
self.addEventListener('periodicsync', function(e) {
  if (e.tag === 'baw-reminder') {
    e.waitUntil(Promise.resolve(checkAndFire()));
  }
});

self.addEventListener('sync', function(e) {
  if (e.tag === 'baw-sync') {
    e.waitUntil(Promise.resolve(checkAndFire()));
  }
});
