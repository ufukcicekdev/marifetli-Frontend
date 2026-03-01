import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-3 sm:px-4 py-8 max-w-4xl min-w-0 overflow-x-hidden">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Marifetli Hakkında</h1>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-8">
          <div className="prose max-w-none dark:prose-invert">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">El İşi & El Sanatları Topluluğu</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Marifetli, el işi ve el sanatları tutkunlarının buluşma noktasıdır. Örgü, dikiş, nakış, takı tasarımı, makrome, amigurumi, keçe ve daha birçok el emeği alanında deneyimlerinizi paylaşabilir, sorularınızı sorabilir, birbirinden ilham alabilirsiniz.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Platformumuzda, yeni başlayanlar deneyimli ellerden tavsiye alırken; ustalar da bildiklerini paylaşarak topluluğun gelişmesine katkı sağlıyor. Her el işi meraklısının bir yeri var.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-3">Misyonumuz</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              El emeğinin değerini yüceltmek, herkesin el işi deneyimlerini paylaşmasına olanak sağlamak ve geleneksel el sanatlarını gelecek nesillere taşımaktır.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-6 mb-3">Vizyonumuz</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Türkiye&apos;nin en güvenilir ve sıcak el işi topluluğu olmayı hedefliyoruz. Birlikte öğreniyor, paylaşıyor ve üretiyoruz.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2026 Marifetli. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
