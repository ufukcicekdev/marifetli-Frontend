# Marifetli – Android & iOS (Capacitor)

Bu proje **Capacitor** ile Android ve iOS uygulaması olarak derlenebilir. Web sitesi (Next.js) mobil için static export edilir, Capacitor bu çıktıyı native WebView içinde çalıştırır.

## Gereksinimler

- **Node.js** 18+
- **Android:** [Android Studio](https://developer.android.com/studio) (SDK, emülatör veya cihaz)
- **iOS:** macOS + [Xcode](https://developer.apple.com/xcode/) 15+ ve **CocoaPods** (`brew install cocoapods`). Xcode lisansını kabul et: `sudo xcodebuild -license`

## Kurulum (ilk kez)

```bash
cd marifetli/frontend
npm install
```

Android ve iOS platformlarını ekleyin (henüz yoksa):

```bash
npx cap add android
npx cap add ios
```

## Mobil build ve çalıştırma

### 1. Web’i static export et + Capacitor’a kopyala

```bash
npm run cap:sync
```

Bu komut sırayla:

- `BUILD_MOBILE=1 next build` ile **mobil için** static export yapar (çıktı: `.next-mobile/`)
- `npx cap sync` ile `.next-mobile/` içeriğini `android/` ve `ios/` projelerine kopyalar

### 2. Android’de çalıştır

Emülatör veya bağlı cihaz:

```bash
npm run cap:android
```

Sadece Android Studio’da açmak için:

```bash
npm run cap:open:android
```

### 3. iOS’ta çalıştır (sadece macOS)

Simulator veya bağlı iPhone:

```bash
npm run cap:ios
```

Sadece Xcode’da açmak için:

```bash
npm run cap:open:ios
```

Xcode açıldığında “çalıştırılacak bir şey yok” gibi görünüyorsa:

1. **Sol üstte scheme** (hedef) seçili olsun: **App** (dropdown’da “App” yazıyor olmalı).
2. Hemen yanındaki **cihaz** listesinden **iPhone 15** (veya başka bir Simulator) ya da bağlı **iPhone**’unu seç.
3. **Run** (▶) tuşuna bas veya `Cmd + R`.

Eğer Xcode klasör açıyorsa, workspace’i doğrudan aç: `npm run cap:open:ios:workspace` (veya Terminal’de: `open ios/App/App.xcworkspace`).

**Xcode'da dosyaları göremiyorsan:**

- **Dosyalar Xcode uygulamasında görünür** (Cursor/VS Code değil). `open ios/App/App.xcworkspace` ile açılan **ayrı Xcode penceresine** bak; sol taraftaki dosya listesi oradadır.

1. **Sol panel (Project Navigator) kapalı olabilir** → Üst menüden **View → Navigators → Show Project Navigator** (veya kısayol **Cmd + 1**).
2. Sol listede **App** (mavi proje ikonu) görünmeli; tıkla. Altında şunlar olur: **App** (sarı klasör), **Products**, **Pods**, **Frameworks**.
3. **App** (sarı klasörünü) aç: **AppDelegate.swift**, **Main.storyboard**, **Assets.xcassets**, **LaunchScreen.storyboard**, **public** (web build), **capacitor.config.json** görünür.
4. Sol panel hiç yoksa: **View → Navigators → Show Navigator** (Cmd + 0) ile navigator’ı aç, sonra en üstteki **proje** ikonuna (📄) tıkla.
5. **Finder'dan aç:** Finder'da `frontend → ios → App` klasörüne gir, **App.xcworkspace** dosyasına çift tıkla. Xcode'da **Cmd + 1** yapıp **App** üçgenini aç.
6. Dosya isimleri **kırmızı** görünüyorsa klasör yolundaki **İ** sorun çıkarıyor olabilir; projeyi İ içermeyen bir yola kopyalayıp oradan workspace aç.

## Script özeti

| Komut | Açıklama |
|-------|----------|
| `npm run build:mobile` | Sadece mobil static export (`out/`) |
| `npm run cap:sync` | Mobil build + `cap sync` |
| `npm run cap:android` | Sync + Android’de çalıştır |
| `npm run cap:ios` | Sync + iOS’ta çalıştır |
| `npm run cap:open:android` | Android Studio’da aç |
| `npm run cap:open:ios` | Xcode’da aç |
| `npm run cap:open:ios:workspace` | Xcode’da doğrudan workspace aç (App.xcworkspace) |

## Yapılandırma

- **Mobil Next config:** `next.config.mobile.ts` — `output: 'export'`, `images.unoptimized: true`, `trailingSlash: true`. Web deploy için kullanılan `next.config.ts` değişmez.
- **Capacitor:** `capacitor.config.ts` — `appId: 'tr.com.marifetli.app'`, `webDir: '.next-mobile'` (mobil build çıktısı). Uygulama adı: **Marifetli**.

## Store’a çıkış (kısaca)

- **Android:** `android/` projesini Android Studio’da aç → Build → Generate Signed Bundle/APK → Play Console’a yükle.
- **iOS:** `ios/` projesini Xcode’da aç → Signing & Capabilities → Archive → App Store Connect’e yükle.

## Sorun giderme (iOS)

- **"You have not agreed to the Xcode license"** → Terminal'de: `sudo xcodebuild -license` çalıştırıp lisansı kabul et.
- **"CocoaPods is not installed"** → CocoaPods kur: `brew install cocoapods`. Ardından `npx cap sync` veya `cd ios/App && pod install` tekrar dene.
- **"IDESimulatorFoundation couldn't be loaded" / "xcodebuild failed to load a required plug-in"** → Xcode eklentileri ilk kurulum veya güncellemeden sonra yüklenmemiş olabilir. Terminal'de: `xcodebuild -runFirstLaunch` çalıştır (Xcode’u bir kez açıp kapatmak da işe yarar). Hata devam ederse Xcode’u App Store üzerinden güncelle veya yeniden kur.

Web asset'ler kopyalandıktan sonra sadece `pod install` fail oluyorsa Android tarafı hazırdır; iOS için yukarıdakileri yaptıktan sonra `npx cap sync` veya Xcode'dan projeyi açıp Run yeterli.

## Notlar

- Web deploy (Vercel vb.) **normal** `next build` ve `next.config.ts` ile yapılır; Capacitor sadece mobil build’i etkiler.
- API adresi mobil uygulamada da `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_SITE_URL` ile aynı production URL’lere gider; mobil build sırasında bu env’lerin doğru olması gerekir.






lk mobil build ve sync

cd marifetli/frontend
npm run cap:sync
Bu, önce out/ üretir, sonra bu çıktıyı android ve ios projelerine kopyalar. İlk seferde “missing out directory” uyarısı artık oluşmaz.

Android’de çalıştırmak

Android Studio kuruluysa: npm run cap:open:android ile projeyi aç, Run’a bas.
Veya: npm run cap:android (emülatör/cihaz gerekir).
iOS’ta çalıştırmak (sadece macOS)

Xcode kuruluysa: npm run cap:open:ios ile projeyi aç, simulator veya cihaz seçip Run’a bas.
Veya: npm run cap:ios.
Store’a çıkış

Android: Android Studio → Build → Generate Signed Bundle/APK → Play Console.
iOS: Xcode → Signing & Capabilities → Archive → App Store Connect.
Detaylı adımlar ve notlar frontend/CAPACITOR.md dosyasında. Web deploy (Vercel vb.) için hâlâ normal npm run build ve next.config.ts kullanıyorsun; Capacitor sadece mobil build’i etkiler.