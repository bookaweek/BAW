// ═══════════════════════════════════════════════════════════════
// firebase-messaging-sw.js — BOOKAWEEK
//
// Firebase Cloud Messaging requires its OWN dedicated service worker
// file at this exact filename, registered separately from the app's
// main sw.js (which handles caching/offline/local daily reminders).
// This is Firebase's own architectural requirement — the FCM SDK
// looks for a service worker that calls firebase.messaging() so it
// can receive and display push messages while the app is fully
// closed or in the background.
//
// IMPORTANT: replace the firebaseConfig values below with YOUR
// actual Firebase project's config (Firebase Console -> Project
// Settings -> General -> "Your apps" -> Web app -> SDK setup and
// configuration -> Config). These values (apiKey, projectId, etc.)
// are NOT secret — they are meant to be public/client-side, unlike
// the service account JSON used server-side in the GAS script.
// ═══════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyC6mkwN9HQZfU8b9gyOSNX4obioNDYKoNs',
  authDomain:        'bookaweek-28db4.firebaseapp.com',
  projectId:         'bookaweek-28db4',
  storageBucket:     'bookaweek-28db4.firebasestorage.app',
  messagingSenderId: '535012269322',
  appId:             '1:535012269322:web:2a602b996590385ac3aef3'
});

var messaging = firebase.messaging();

// Background message handler — fires when a push arrives while the
// app is closed or not in focus.
//
// IMPORTANT (verified against Firebase's own docs and real-world
// reports): automatic notification display behavior for FCM v1 API
// pushes is NOT perfectly consistent across browsers/SDK versions —
// some setups display it automatically from the webpush.notification
// payload, others don't display anything at all unless
// showNotification() is called explicitly here. Firebase's own
// official documentation example explicitly calls
// self.registration.showNotification() in this exact handler. To
// guarantee the notification reliably appears on every browser,
// every time, we do the same — reading title/body straight from the
// payload GAS sent.
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  // GAS sends a pure DATA message (not a notification-type message) —
  // see the comment in _sendPushToAllExcept in the GAS script for why.
  // This guarantees onBackgroundMessage is ALWAYS invoked and this is
  // the ONLY code path that ever calls showNotification(), eliminating
  // any risk of the notification firing twice.
  var d = payload.data || {};
  var title = d.title || 'BOOKAWEEK';
  var body  = d.body  || 'A BookWarrior just logged a session!';
  var link  = d.link  || '/';

  self.registration.showNotification(title, {
    body: body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: link }
  });
});

// Clicking the notification brings the app into focus (or opens it in
// a new tab if not already open) — same UX as the existing daily
// reminder notifications in the main sw.js, kept consistent here.
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
