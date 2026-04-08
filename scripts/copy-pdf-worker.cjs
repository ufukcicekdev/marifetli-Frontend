'use strict';
/**
 * pdfjs-dist 4.x: `build/pdf.worker.min.mjs` yok; legacy giriş noktası `legacy/build/pdf.worker.mjs`.
 * kids-pdf-to-images.ts → `pdfjs-dist/legacy/build/pdf.mjs` ile aynı worker kullanılmalı.
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const dest = path.join(publicDir, 'pdf.worker.min.mjs');

let pkgRoot;
try {
  pkgRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
} catch {
  console.warn('[copy-pdf-worker] pdfjs-dist yok, atlanıyor.');
  process.exit(0);
}

const candidates = [
  path.join(pkgRoot, 'legacy', 'build', 'pdf.worker.mjs'),
  path.join(pkgRoot, 'build', 'pdf.worker.mjs'),
  path.join(pkgRoot, 'build', 'pdf.worker.min.mjs'),
];

const src = candidates.find((c) => fs.existsSync(c));
if (!src) {
  console.error('[copy-pdf-worker] Worker bulunamadı. Denenen yollar:\n', candidates.join('\n'));
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('[copy-pdf-worker]', path.relative(path.join(__dirname, '..'), src), '→ public/pdf.worker.min.mjs');
