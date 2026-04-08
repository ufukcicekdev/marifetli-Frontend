/**
 * Öğretmen test çıkarımı: PDF sayfalarını PNG File listesine çevirir (tarayıcı).
 * Sadece istemci tarafında çağrılmalıdır.
 */

const PDF_WORKER_SRC = '/pdf.worker.min.mjs';

export type KidsPdfToPngOptions = {
  /** Toplam kaynak sayfa limitiyle uyumlu (varsayılan 10). */
  maxPages?: number;
  /** Görüntü netliği; ~2 iyi okunurluk verir. */
  scale?: number;
};

export async function kidsPdfFileToPngFiles(
  file: File,
  opts: KidsPdfToPngOptions = {},
): Promise<File[]> {
  if (typeof window === 'undefined') {
    throw new Error('PDF dönüşümü yalnızca tarayıcıda kullanılabilir.');
  }

  const maxPages = Math.max(1, Math.min(30, opts.maxPages ?? 10));
  const scale = opts.scale ?? 2;

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

  const ab = await file.arrayBuffer();
  const data = new Uint8Array(ab.slice(0));

  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const n = Math.min(pdf.numPages, maxPages);
  const baseName = (file.name.replace(/\.pdf$/i, '') || 'sayfa').slice(0, 80);
  const out: File[] = [];

  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas desteklenmiyor.');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) continue;
    const pngFile = new File([blob], `${baseName}-p${i}.png`, { type: 'image/png' });
    if (pngFile.size > 0) out.push(pngFile);
  }

  await pdf.destroy().catch(() => undefined);

  if (out.length === 0) {
    throw new Error('PDF dosyasından sayfa görüntüsü çıkarılamadı.');
  }
  return out;
}
