/* eslint-disable no-restricted-globals */
/**
 * Firebase Cloud Messaging - Service Worker
 * Bu dosya .env.local'den generate edilir (npm run dev / npm run build öncesi).
 */
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDfmF6g2v7vhVZfj7Vx82UsWZkvu_ZvANE',
  authDomain: 'marifetli-3d2d9.firebaseapp.com',
  projectId: 'marifetli-3d2d9',
  storageBucket: 'marifetli-3d2d9.firebasestorage.app',
  messagingSenderId: '1031342814672',
  appId: '1:1031342814672:web:1f800659a3787aa5f075d5',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const title = payload.notification && payload.notification.title ? payload.notification.title : 'Marifetli';
  const body = payload.notification && payload.notification.body ? payload.notification.body : '';
  const options = {
    body: body,
    icon: (payload.notification && payload.notification.icon) ? payload.notification.icon : '/favicon.ico',
    tag: 'marifetli-push',
    renotify: true,
    requireInteraction: false,
  };
  return self.registration.showNotification(title, options);
});
