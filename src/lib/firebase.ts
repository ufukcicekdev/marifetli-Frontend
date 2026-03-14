import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// .env.local sadece "next dev" / "next build" başlarken okunur. Değiştirdiysen sunucuyu yeniden başlat.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const hasApiKey = Boolean(firebaseConfig.apiKey);
  const hasProjectId = Boolean(firebaseConfig.projectId);
  const hasVapid = Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
  console.log('Firebase Config loaded:', {
    apiKey: hasApiKey ? '✓ Set' : '✗ Missing',
    projectId: hasProjectId ? '✓ Set' : '✗ Missing',
    vapidKey: hasVapid ? '✓ Set' : '✗ Missing',
  });
  if (!hasApiKey || !hasProjectId || !hasVapid) {
    console.warn(
      '[Marifetli] .env.local okunmamış olabilir. NEXT_PUBLIC_FIREBASE_* değişkenlerini kontrol edin ve "npm run dev"i yeniden başlatın.'
    );
  }
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Send config to service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({
      type: 'FIREBASE_CONFIG',
      config: firebaseConfig
    });
  });
}

// Initialize Firebase Cloud Messaging
let messaging: any = null;

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

/**
 * Request notification permission and get FCM token
 */
const isDev = process.env.NODE_ENV === 'development';

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    if (isDev) console.log('Starting notification permission request...');

    // Check if notifications are supported
    if (!('Notification' in window)) {
      if (isDev) console.error('This browser does not support notifications');
      return null;
    }

    // Check if messaging is supported
    const supported = await isSupported();
    if (isDev) console.log('Firebase messaging supported:', supported);

    if (!supported) {
      if (isDev) console.error('Firebase messaging is not supported');
      return null;
    }

    // Initialize messaging
    const messagingInstance = getMessaging(app);
    if (isDev) console.log('Messaging instance created');

    // Request permission
    const permission = await Notification.requestPermission();
    if (isDev) console.log('Notification permission:', permission);

    if (permission === 'granted') {
      if (isDev) console.log('Notification permission granted, getting token...');

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (isDev) console.log('VAPID key:', vapidKey ? '✓ Present' : '✗ Missing');

      if (!vapidKey) {
        if (isDev) console.error('VAPID key is missing! Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to .env.local');
        return null;
      }

      // Get FCM token
      const token = await getToken(messagingInstance, {
        vapidKey: vapidKey,
      });

      if (isDev) console.log('FCM Token generated:', token ? `${token.substring(0, 20)}...` : 'null');
      return token;
    } else {
      if (isDev) console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    if (isDev) console.error('Error getting notification permission:', error);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        if (isDev) console.log('Message received in foreground:', payload);
        resolve(payload);
      });
    }
  });

export { app, messaging };
