// firebase-messaging-sw.js
// This file MUST be at the root of your public folder.
// It runs as a service worker to receive push notifications when the app is closed.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Must match your firebase-config.js ──────────────────────────────────────
firebase.initializeApp({
  apiKey: "AIzaSyBYJUPnri_lLMFqmZ2-sEKDki-TGqVSYSo",

  authDomain: "kys-blood-connect.firebaseapp.com",

  projectId: "kys-blood-connect",

  storageBucket: "kys-blood-connect.firebasestorage.app",

  messagingSenderId: "1017049020883",

  appId: "1:1017049020883:web:dc8ad0dea46d399944d726"

});

const messaging = firebase.messaging();

// ── Background message handler ───────────────────────────────────────────────
// Fires when the app is closed or in the background.
messaging.onBackgroundMessage(payload => {
  const { title, body, image } = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(title || 'New Request', {
    body:    body || 'A new service request has been submitted.',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    tag:     data.requestId || 'ngo-request',  // prevents duplicate notifs
    data:    { requestId: data.requestId, url: self.location.origin },
    actions: [
      { action: 'open',   title: 'View request' },
      { action: 'dismiss',title: 'Dismiss' }
    ]
  });
});

// ── Notification click handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app already open, focus it
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Offline cache (shell caching) ────────────────────────────────────────────
const CACHE_NAME = 'ngo-app-v1';
const SHELL_FILES = ['/', '/index.html', '/app.css', '/app.js', '/firebase-config.js', '/icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
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
  // Network-first for API calls, cache-first for shell
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
