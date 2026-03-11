/**
 * Tarayıcıda FCM token alıp backend'e kaydetmek için.
 * .env.local'de NEXT_PUBLIC_FIREBASE_* ve NEXT_PUBLIC_FIREBASE_VAPID_KEY gerekli.
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
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getMessaging, getToken } = await import('firebase/messaging');

    const app = getApps().length > 0
      ? getApp()
      : initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
          projectId,
          appId,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        });
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey });
    if (!token) return { ok: false, reason: 'Token alınamadı' };
    await registerToken(token, 'Web');
    return { ok: true, token };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: msg };
  }
}

export function canRequestPush(): boolean {
  if (typeof window === 'undefined') return false;
  const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  return Boolean(vapid && projectId);
}

/**
 * FCM foreground handler'ı her sayfada çalışsın diye Firebase app'i izin/token olmadan başlatır.
 * Token kaydı hâlâ Bildirimler sayfasında "Bildirimleri aç" ile yapılır.
 */
export async function ensureFirebaseApp(): Promise<boolean> {
  if (typeof window === 'undefined' || !canRequestPush()) return false;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  if (!projectId || !appId) return false;
  try {
    const { getApps, getApp, initializeApp } = await import('firebase/app');
    if (getApps().length > 0) return true;
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      projectId,
      appId,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sekme açıkken gelen push'u göstermek için (ön planda FCM sistem bildirimi çıkmaz, toast kullanıyoruz).
 */
export function setupForegroundMessageHandler(
  onMessage: (title: string, body: string) => void,
): () => void {
  if (typeof window === 'undefined' || !canRequestPush()) return () => {};
  let cancelled = false;
  (async () => {
    try {
      const { getApps, getApp } = await import('firebase/app');
      const { getMessaging, onMessage: onMessageFn } = await import('firebase/messaging');
      if (getApps().length === 0 || cancelled) return;
      const messaging = getMessaging(getApp());
      onMessageFn(messaging, (payload) => {
        if (cancelled) return;
        const title = payload.notification?.title ?? 'Marifetli';
        const body = payload.notification?.body ?? '';
        onMessage(title, body);
      });
    } catch {
      // Firebase henüz başlatılmamış veya izin yok
    }
  })();
  return () => { cancelled = true; };
}
