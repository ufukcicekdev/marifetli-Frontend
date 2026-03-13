# Bildirim ikonları

Push bildirimlerinde türe göre ikon kullanılır. Bu klasör (`public/icons/`) service worker tarafından **/icons/** path’i ile çağrılır.

Önerilen boyut: 96x96 veya 192x192 PNG.

- `notification-like.png` — beğeni (soru/cevap)
- `notification-comment.png` — yorum/cevap
- `notification-follow.png` — takip
- `notification-mention.png` — mention
- `notification-community.png` — topluluk daveti
- `badge-icon.png` — bildirim rozeti (küçük ikon)

Dosya yoksa varsayılan uygulama ikonu (`/android-chrome-192x192.png`) kullanılır.
