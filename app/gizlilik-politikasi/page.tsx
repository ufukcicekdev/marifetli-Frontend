import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Gizlilik Politikası</h1>
        <div className="bg-white rounded-lg shadow p-8 prose max-w-none">
          <p className="text-gray-700 mb-4">
            Marifetli olarak gizliliğinize önem veriyoruz. Bu politika, kişisel verilerinizin nasıl toplandığını ve kullanıldığını açıklar.
          </p>
          <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Toplanan Veriler</h2>
          <p className="text-gray-700 mb-4">
            E-posta adresi, kullanıcı adı ve platform kullanım verileri toplanabilir.
          </p>
          <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Veri Kullanımı</h2>
          <p className="text-gray-700">
            Toplanan veriler hizmetlerimizi iyileştirmek ve kullanıcı deneyimini geliştirmek için kullanılır.
          </p>
        </div>
      </main>
    </div>
  );
}
