/**
 * PWA ikonlarını manifest'te yazılan boyutlara (512x512, 192x192) kesin olarak yeniden boyutlandırır.
 * Çalıştırma: node scripts/resize-pwa-icons.js (sharp gerekir: npm install -D sharp)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

async function run() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp yüklü değil. Çalıştır: npm install -D sharp');
    process.exit(1);
  }

  const files = [
    { name: 'android-chrome-512x512.png', width: 512, height: 512 },
    { name: 'android-chrome-192x192.png', width: 192, height: 192 },
  ];

  for (const { name, width, height } of files) {
    const src = path.join(PUBLIC, name);
    if (!fs.existsSync(src)) {
      console.warn('Atlanıyor (yok):', name);
      continue;
    }
    await sharp(src)
      .resize(width, height)
      .toFile(src + '.tmp');
    fs.renameSync(src + '.tmp', src);
    console.log(name, '->', width + 'x' + height);
  }
  console.log('PWA ikonları boyutlandırıldı.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
