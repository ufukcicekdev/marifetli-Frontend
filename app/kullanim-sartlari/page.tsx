import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kullanım Şartları',
  description:
    'Marifetli platformunu kullanırken uymanız gereken temel kuralları ve sorumlulukları bu kullanım şartlarında özetliyoruz.',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Kullanım Şartları</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
      </p>

      <div className="space-y-4 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
        <p>
          Marifetli&apos;yi kullanarak, aşağıda yer alan şart ve kuralları okuduğunuzu, anladığınızı ve kabul ettiğinizi
          beyan etmiş olursunuz. Bu metin, platformun güvenli ve saygılı bir ortam olarak kalmasını sağlamak için
          hazırlanmıştır.
        </p>

        <h2 className="font-semibold text-base mt-4">1. Genel Koşullar</h2>
        <p>
          Platformu kullanırken yürürlükteki mevzuata, kamu düzenine ve genel ahlak kurallarına uygun davranmanız,
          diğer kullanıcıların haklarına saygı göstermeniz beklenir. Hesabınız size özeldir; başkasına devredemez veya
          satamazsınız.
        </p>

        <h2 className="font-semibold text-base mt-4">2. İçerik Politikası</h2>
        <p>
          Marifetli&apos;de paylaştığınız soru, cevap, yorum ve diğer tüm içeriklerden siz sorumlusunuz. Aşağıdaki türde
          içerikler kesinlikle yasaktır:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Hakaret, küfür, nefret söylemi ve ayrımcı ifadeler,</li>
          <li>Şiddet ve istismar içeren içerikler,</li>
          <li>Yasalara aykırı, telif hakkı ihlali içeren veya kişisel verileri izinsiz paylaşan içerikler,</li>
          <li>Spam, reklam ve platformun yapısına uygun olmayan tanıtım içerikleri.</li>
        </ul>
        <p>
          Moderasyon sistemimiz, bu kurallara aykırı olduğu tespit edilen içerikleri kısmen veya tamamen
          kaldırabilir; ilgili hesaplara uyarı, geçici veya kalıcı kısıtlama uygulanabilir.
        </p>

        <h2 className="font-semibold text-base mt-4">3. Hesap Güvenliği</h2>
        <p>
          Giriş bilgilerinizin güvenliğinden siz sorumlusunuz. Şifrenizi kimseyle paylaşmamalı ve yetkisiz bir kullanım
          fark ettiğinizde derhal şifrenizi değiştirmeli ve bizimle iletişime geçmelisiniz.
        </p>

        <h2 className="font-semibold text-base mt-4">4. Platformun Kullanımı ve Değişiklikler</h2>
        <p>
          Marifetli, hizmetlerini dilediği zaman değiştirme, geçici olarak durdurma veya sonlandırma hakkını saklı
          tutar. Kullanım şartları zaman zaman güncellenebilir; önemli değişiklikler durumunda kullanıcılarımızı
          bilgilendirmeye çalışırız.
        </p>

        <h2 className="font-semibold text-base mt-4">5. İletişim</h2>
        <p>
          Kullanım şartlarıyla ilgili sorularınız, görüşleriniz veya itirazlarınız için bize{' '}
          <a
            href="mailto:hello@marifetli.com.tr"
            className="text-brand hover:underline font-medium"
          >
            hello@marifetli.com.tr
          </a>{' '}
          adresinden ulaşabilirsiniz.
        </p>
      </div>
    </div>
  );
}
