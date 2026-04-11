import { app } from '@/src/lib/firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

/* ------------------------------------------------------------------ */
/* Platform detection                                                   */
/* ------------------------------------------------------------------ */

/**
 * Capacitor native ortamında (iOS/Android) mı çalışıyor?
 * SSR sırasında false döner.
 */
function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core') as typeof import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function getNativePlatformName(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core') as typeof import('@capacitor/core');
    return Capacitor.getPlatform() === 'ios' ? 'iOS' : 'Android';
  } catch {
    return 'Mobile';
  }
}

/* ------------------------------------------------------------------ */
/* Error helpers                                                        */
/* ------------------------------------------------------------------ */

const FCM_401_MESSAGE =
  "Google Cloud'da Web API anahtarı veya FCM API ayarı gerekli. API anahtarında HTTP referanslara localhost ekleyin, API kısıtlamalarına \"Firebase Cloud Messaging API\" ekleyin veya FCM API'yi etkinleştirin.";

function normalizeFCMError(msg: string): string {
  if (
    msg.includes('401') ||
    msg.includes('authentication credential') ||
    msg.includes('token-subscribe-failed') ||
    msg.includes('Unauthorized')
  ) {
    return FCM_401_MESSAGE;
  }
  return msg;
}

/* ------------------------------------------------------------------ */
/* Pending navigation — uygulama kapalıyken bildirim tıklaması        */
/* ------------------------------------------------------------------ */

/**
 * Uygulama henüz mount olmadan önce gelen bildirim tap URL'ini saklar.
 * FirebasePushHandler mount olunca bunu okuyup navigation yapar.
 */
let _pendingNotificationUrl: string | null = null;

export function getPendingNotificationUrl(): string | null {
  return _pendingNotificationUrl;
}

export function clearPendingNotificationUrl(): void {
  _pendingNotificationUrl = null;
}

/* ------------------------------------------------------------------ */
/* Native (Capacitor) push — @capacitor-firebase/messaging             */
/* ------------------------------------------------------------------ */

async function getNativeFCMToken(): Promise<string | null> {
  try {
    const { receive } = await FirebaseMessaging.requestPermissions();
    if (receive !== 'granted') return null;
    const { token } = await FirebaseMessaging.getToken();
    return token ?? null;
  } catch (e) {
    console.warn('[FCM native] token alınamadı:', e);
    return null;
  }
}

/**
 * Native foreground mesaj dinleyici.
 * Uygulama açıkken gelen push'ları yakalar; geri dönen fonksiyon dinleyiciyi kaldırır.
 */
export function setupNativeForegroundHandler(
  onMessageCb: (title: string, body: string) => void,
): () => void {
  if (!isNative()) return () => {};
  let cancelled = false;
  FirebaseMessaging.addListener('notificationReceived', (event) => {
    if (cancelled) return;
    const title = event.notification.title ?? 'Marifetli';
    const body = event.notification.body ?? '';
    onMessageCb(title, body);
  }).catch((e) => console.warn('[FCM native] foreground handler kurulamadı:', e));
  return () => { cancelled = true; };
}

/**
 * Bildirim datasından hedef URL'i çıkarır.
 * Ana bildirimler `url`, Kids bildirimleri `click_url` alanı kullanır.
 */
export function extractNotificationUrl(data: Record<string, string> | undefined): string {
  return data?.url || data?.click_url || '';
}

/**
 * URL'den path çıkarır (tam URL veya path kabul eder).
 */
export function notificationUrlToPath(url: string): string {
  if (!url) return '/bildirimler';
  try {
    if (url.startsWith('http')) {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search + parsed.hash;
    }
    return url;
  } catch {
    return '/bildirimler';
  }
}

/**
 * Native bildirim tıklanma dinleyicisini mümkün olan en erken an kurar.
 * Uygulama kapalıyken gelen tap URL'ini _pendingNotificationUrl'de saklar.
 * FirebasePushHandler mount olunca bu URL'i okur.
 */
export function setupNativeNotificationTapHandler(
  onTapCb: (url: string) => void,
): () => void {
  if (!isNative()) return () => {};
  let cancelled = false;

  FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
    const url = extractNotificationUrl(
      event.notification.data as Record<string, string> | undefined,
    );
    const path = notificationUrlToPath(url);
    if (cancelled) {
      // Handler henüz hazır değil — sakla, mount olunca işlenecek
      _pendingNotificationUrl = path;
      return;
    }
    onTapCb(path);
  }).catch((e) => console.warn('[FCM native] tap handler kurulamadı:', e));

  return () => { cancelled = true; };
}

/**
 * Uygulama başlarken kaydedilmiş bekleyen bildirim URL'ini başlatır.
 * Uygulama kapalıyken bildirime tıklanıp açıldıysa bu fonksiyon URL'i döner.
 */
export async function getAndClearLaunchNotificationUrl(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { notifications } = await FirebaseMessaging.getDeliveredNotifications();
    if (notifications?.length) {
      const last = notifications[notifications.length - 1];
      const url = extractNotificationUrl(last?.data as Record<string, string> | undefined);
      const path = url ? notificationUrlToPath(url) : null;
      await FirebaseMessaging.removeAllDeliveredNotifications().catch(() => {});
      return path;
    }
  } catch {
    // getDeliveredNotifications desteklenmeyebilir
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Unified public API — web + native                                   */
/* ------------------------------------------------------------------ */

export function canRequestPush(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNative()) return true;
  const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  return Boolean(vapid && projectId);
}

/**
 * FCM token al + backend'e kaydet.
 * Native'de @capacitor-firebase/messaging, web'de Firebase Web SDK kullanır.
 */
export async function getFCMTokenAndRegister(
  registerToken: (token: string, deviceName?: string) => Promise<unknown>,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'SSR' };

  // --- Native (iOS / Android) ---
  if (isNative()) {
    const token = await getNativeFCMToken();
    if (!token) return { ok: false, reason: 'Native token alınamadı veya izin verilmedi' };
    await registerToken(token, getNativePlatformName());
    return { ok: true, token };
  }

  // --- Web ---
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  if (!vapidKey) return { ok: false, reason: 'VAPID key yok' };
  if (!projectId || !appId) return { ok: false, reason: 'Firebase projectId/appId yok' };

  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return { ok: false, reason: 'Bildirim izni verilmedi' };
    }
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey });
    if (!token) return { ok: false, reason: 'Token alınamadı' };
    await registerToken(token, 'Web');
    return { ok: true, token };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: normalizeFCMError(msg) };
  }
}

/**
 * İzin zaten "granted" ise token alıp sessizce kaydeder.
 * Uygulama her açıldığında çağrılabilir.
 */
export async function getFCMTokenIfGranted(
  registerToken: (token: string, deviceName?: string) => Promise<unknown>,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'SSR' };

  if (isNative()) {
    return getFCMTokenAndRegister(registerToken);
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return { ok: false, reason: 'İzin yok' };
  }
  return getFCMTokenAndRegister(registerToken);
}

/**
 * Firebase app'i doğrular (web için).
 */
export async function ensureFirebaseApp(): Promise<boolean> {
  if (typeof window === 'undefined' || !canRequestPush()) return false;
  if (isNative()) return true;
  return Boolean(app);
}

/**
 * Foreground mesaj handler — web sekmesi açıkken (native için setupNativeForegroundHandler'a yönlendirir).
 */
export function setupForegroundMessageHandler(
  onMessageCb: (title: string, body: string) => void,
): () => void {
  if (typeof window === 'undefined' || !canRequestPush()) return () => {};
  if (isNative()) return setupNativeForegroundHandler(onMessageCb);
  if (!app) return () => {};

  let cancelled = false;
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      if (cancelled) return;
      const title = payload.notification?.title ?? 'Marifetli';
      const body = payload.notification?.body ?? '';
      onMessageCb(title, body);
    });
  } catch {
    // Messaging henüz hazır olmayabilir
  }
  return () => { cancelled = true; };
}
