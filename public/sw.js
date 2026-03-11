/**
 * PWA: Sayfayı kontrol eden ana service worker.
 * Chrome "Uygulama olarak yükle" göstermek için scope "/" ve fetch handler gerekir.
 * Push bildirimleri firebase-messaging-sw.js tarafından işlenir.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
