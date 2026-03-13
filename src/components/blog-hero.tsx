'use client';

/**
 * Blog sayfası üstü — renkler globals.css'teki CSS değişkenleriyle (dark/light).
 * dark: sınıfları yok → sunucu ve istemci aynı HTML üretir, hydration uyarısı olmaz.
 */
export function BlogHero() {
  return (
    <section className="blog-hero rounded-xl border px-5 py-6 sm:px-6 sm:py-8 mb-6 sm:mb-8">
      <div className="max-w-2xl">
        <h1 className="blog-hero-title text-2xl sm:text-3xl font-bold mb-2">
          Marifetli Blog
        </h1>
        <p className="blog-hero-text text-sm sm:text-base leading-relaxed">
          Örgü, dikiş, nakış ve el sanatları üzerine ipuçları, rehberler ve topluluk yazıları. 
          Yeni fikirler keşfet, projelerini paylaş.
        </p>
      </div>
    </section>
  );
}
