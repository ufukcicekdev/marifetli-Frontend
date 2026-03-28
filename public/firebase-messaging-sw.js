// Firebase Cloud Messaging Service Worker
// This file is loaded from the public folder and runs in the browser

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config will be set from the main app via postMessage
let firebaseConfig = null;

// Listen for config from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    if (firebaseConfig && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  }
});

// Get messaging instance
const getMessagingInstance = () => {
  if (!firebase.apps.length && firebaseConfig) {
    firebase.initializeApp(firebaseConfig);
  }
  return firebase.messaging();
};

// Handle background messages
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
    const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new notification';
    const iconType = payload.data?.icon_type || 'default';
    // İkonlar public/icons/ altında: notification-like.png, notification-comment.png vb.
    const iconPath = iconType === 'default'
      ? '/android-chrome-192x192.png'
      : '/icons/notification-' + iconType + '.png';
    const imageUrl = payload.notification?.image || payload.data?.image || null;

    const notificationOptions = {
      body: notificationBody,
      icon: iconPath,
      badge: '/icons/badge-icon.png',
      image: imageUrl || undefined,
      tag: payload.data?.tag || payload.data?.type || 'default',
      data: payload.data || {},
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: 'Görüntüle' },
        { action: 'close', title: 'Kapat' }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error('Error handling push:', error);
  }
});

// Handle notification click — her zaman tam URL ile aç (PWA kapalı veya açık)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const dataUrl = (event.notification.data && event.notification.data.url) || '';
  const fullUrl = dataUrl.startsWith('http')
    ? dataUrl
    : (self.location.origin + (dataUrl || '/bildirimler'));
  const urlToOpen = fullUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Önce mevcut pencerede navigate dene (PWA açıksa aynı pencerede ilgili sayfaya git)
      for (const client of clientList) {
        if (typeof client.navigate === 'function') {
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }
      // Pencere yoksa veya navigate yoksa yeni aç (PWA kapalıyken)
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
