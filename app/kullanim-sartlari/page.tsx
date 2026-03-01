import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Kullanım Şartları</h1>
        <div className="bg-white rounded-lg shadow p-8 prose max-w-none">
          <p className="text-gray-700 mb-4">
            Marifetli platformunu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.
          </p>
          <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. Genel Koşullar</h2>
          <p className="text-gray-700 mb-4">
            Platformumuzu kullanırken yasalara uygun davranmanız ve diğer kullanıcılara saygı göstermeniz beklenmektedir.
          </p>
          <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. İçerik Politikası</h2>
          <p className="text-gray-700 mb-4">
            Paylaştığınız içeriklerden siz sorumlusunuz. Spam, zararlı veya yasadışı içerik paylaşımı yasaktır.
          </p>
          <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. Hesap Güvenliği</h2>
          <p className="text-gray-700">
            Hesap bilgilerinizi güvende tutmak sizin sorumluluğunuzdadır.
          </p>
        </div>
      </main>
    </div>
  );
}
