import { app } from '@/src/lib/firebase';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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

/**
 * Tarayıcıda FCM token alıp backend'e kaydetmek için.
 * firebase.ts ile tek app kullanılır; config SW'e oradan gönderilir.
 */
export async function getFCMTokenAndRegister(
  registerToken: (token: string, deviceName?: string) => Promise<unknown>,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'SSR' };
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

export function canRequestPush(): boolean {
  if (typeof window === 'undefined') return false;
  const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  return Boolean(vapid && projectId);
}

/**
 * İzin zaten "granted" ise token alıp kaydeder; istemez, sadece kayıt yapar.
 * Her cihazda (telefon, PC) token'ın kayıtlı olması için uygulama açıldığında çağrılabilir.
 */
export async function getFCMTokenIfGranted(
  registerToken: (token: string, deviceName?: string) => Promise<unknown>,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'SSR' };
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return { ok: false, reason: 'İzin yok' };
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  if (!vapidKey || !projectId || !appId) return { ok: false, reason: 'Firebase config yok' };
  try {
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
 * FCM foreground handler için app hazır mı? firebase.ts zaten app'i oluşturur.
 */
export async function ensureFirebaseApp(): Promise<boolean> {
  if (typeof window === 'undefined' || !canRequestPush()) return false;
  return Boolean(app);
}

/**
 * Sekme açıkken gelen push'u göstermek için (ön planda FCM sistem bildirimi çıkmaz, toast kullanıyoruz).
 * firebase.ts'teki app ile messaging kullanılır.
 */
export function setupForegroundMessageHandler(
  onMessageCb: (title: string, body: string) => void,
): () => void {
  if (typeof window === 'undefined' || !canRequestPush() || !app) return () => {};
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
