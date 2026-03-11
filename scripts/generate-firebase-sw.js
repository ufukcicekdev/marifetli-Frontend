/**
 * .env.local içindeki NEXT_PUBLIC_FIREBASE_* değerlerini okuyup
 * public/firebase-messaging-sw.js dosyasını üretir.
 * Service worker statik dosya olduğu için process.env kullanamaz; build/dev öncesi bu script çalıştırılır.
 *
 * Kullanım: node scripts/generate-firebase-sw.js (frontend dizininden)
 * package.json: "predev": "node scripts/generate-firebase-sw.js", "prebuild": "node scripts/generate-firebase-sw.js"
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env.local');
const OUT_PATH = path.join(ROOT, 'public', 'firebase-messaging-sw.js');

function loadEnv() {
  const env = {};
  if (!fs.existsSync(ENV_PATH)) return env;
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
}

const template = `/* eslint-disable no-restricted-globals */
/**
 * Firebase Cloud Messaging - Service Worker
 * Bu dosya .env.local'den generate edilir (npm run dev / npm run build öncesi).
 */
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '{{API_KEY}}',
  authDomain: '{{AUTH_DOMAIN}}',
  projectId: '{{PROJECT_ID}}',
  storageBucket: '{{STORAGE_BUCKET}}',
  messagingSenderId: '{{MESSAGING_SENDER_ID}}',
  appId: '{{APP_ID}}',
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
`;

const fileEnv = loadEnv();
// process.env (Vercel/CI) öncelikli; yoksa .env.local
const get = (key) => process.env[key] || fileEnv[key] || '';

const replacements = {
  '{{API_KEY}}': get('NEXT_PUBLIC_FIREBASE_API_KEY'),
  '{{AUTH_DOMAIN}}': get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  '{{PROJECT_ID}}': get('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  '{{STORAGE_BUCKET}}': get('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  '{{MESSAGING_SENDER_ID}}': get('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  '{{APP_ID}}': get('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

let output = template;
Object.entries(replacements).forEach(([key, value]) => {
  output = output.split(key).join(value);
});

fs.writeFileSync(OUT_PATH, output, 'utf8');
console.log('firebase-messaging-sw.js generated from .env.local');
