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

// Debug: Log config on load
if (typeof window !== 'undefined') {
  console.log('Firebase Config loaded:', {
    apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
    projectId: firebaseConfig.projectId || '✗ Missing',
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ? '✓ Set' : '✗ Missing',
  });
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
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    console.log('Starting notification permission request...');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return null;
    }

    // Check if messaging is supported
    const supported = await isSupported();
    console.log('Firebase messaging supported:', supported);
    
    if (!supported) {
      console.error('Firebase messaging is not supported');
      return null;
    }

    // Initialize messaging
    const messagingInstance = getMessaging(app);
    console.log('Messaging instance created');

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    if (permission === 'granted') {
      console.log('Notification permission granted, getting token...');
      
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      console.log('VAPID key:', vapidKey ? '✓ Present' : '✗ Missing');
      
      if (!vapidKey) {
        console.error('VAPID key is missing! Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to .env.local');
        return null;
      }
      
      // Get FCM token
      const token = await getToken(messagingInstance, {
        vapidKey: vapidKey,
      });
      
      console.log('FCM Token generated:', token ? `${token.substring(0, 20)}...` : 'null');
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
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
        console.log('Message received in foreground:', payload);
        resolve(payload);
      });
    }
  });

export { app, messaging };
