import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description:
    'Marifetli olarak kişisel verilerinizi nasıl işlediğimizi ve koruduğumuzu bu gizlilik politikasında açıklıyoruz.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Gizlilik Politikası</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
      </p>

      <div className="space-y-4 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
        <p>
          Marifetli olarak, platformumuzu kullanırken paylaştığınız kişisel verilerinizi korumaya büyük önem veriyoruz.
          Bu metin, hangi verileri hangi amaçlarla işlediğimizi ve haklarınızı özetler.
        </p>

        <h2 className="font-semibold text-base mt-4">Toplanan veriler</h2>
        <p>
          Kayıt olurken veya Google ile giriş yaptığınızda ad, soyad, e-posta adresi gibi temel hesap bilgilerinizi
          saklarız. Profilinizi doldururken paylaştığınız yaş aralığı, ilgi alanları, meslek gibi bilgiler de
          tercihleriniz doğrultusunda hesabınızla ilişkilendirilir.
        </p>

        <h2 className="font-semibold text-base mt-4">Verilerin kullanım amaçları</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Hesabınızı oluşturmak, giriş yapmanızı sağlamak ve güvenliği korumak,</li>
          <li>Size ilgi alanlarınıza uygun içerikler ve topluluklar önermek,</li>
          <li>Hizmetlerimizi geliştirmek, performansı ve kullanıcı deneyimini iyileştirmek,</li>
          <li>Zorunlu bilgilendirmeler ve isteğe bağlı bildirimleri göndermek.</li>
        </ul>

        <h2 className="font-semibold text-base mt-4">Çerezler ve izleme teknolojileri</h2>
        <p>
          Oturumunuzu sürdürmek, istatistik tutmak ve deneyimi kişiselleştirmek için çerezler ve benzeri teknolojiler
          kullanabiliriz. Siteye ilk girdiğinizde çerez tercihlerinizi (gerekli çerezler, analitik çerezler) seçmeniz
          için bir bilgilendirme gösteriyoruz; tercihleriniz cihazınızda saklanır ve tarayıcı ayarlarınızdan da
          çerezleri yönetebilirsiniz.
        </p>

        <h2 className="font-semibold text-base mt-4">Verilerin paylaşımı</h2>
        <p>
          Kişisel verilerinizi, yasal zorunluluklar veya hizmetin sunulması için gerekli durumlar dışında üçüncü
          kişilerle paylaşmayız. Alt yüklenicilerle çalışmamız halinde, bu taraflardan da aynı güvenlik ve gizlilik
          standartlarına uymalarını talep ederiz.
        </p>

        <h2 className="font-semibold text-base mt-4">Haklarınız</h2>
        <p>
          Geçerli mevzuat kapsamında, kişisel verilerinize erişme, düzeltme, silme, işlenmesini kısıtlama ve belirli
          işlemlere itiraz etme haklarına sahipsiniz. Bu haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.
        </p>

        <h2 className="font-semibold text-base mt-4">İletişim</h2>
        <p>
          Gizlilik politikamızla ilgili sorularınız veya talepleriniz için bize{' '}
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
