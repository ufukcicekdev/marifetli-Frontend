import type { ReactNode } from 'react';

const proseMain =
  'space-y-4 text-sm leading-relaxed text-gray-800 dark:text-gray-200 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold';

const proseKids =
  'space-y-4 text-sm leading-relaxed text-violet-950 dark:text-violet-100/90 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-violet-900 dark:[&_h2]:text-violet-100';

type LegalBodyProps = {
  children: ReactNode;
  className?: string;
  variant?: 'main' | 'kids';
};

export function LegalBody({ children, className = '', variant = 'main' }: LegalBodyProps) {
  const prose = variant === 'kids' ? proseKids : proseMain;
  return <div className={`${prose} ${className}`.trim()}>{children}</div>;
}

type KidsLegalSectionProps = { variant?: 'main' | 'kids' };

export function MarifetliKidsTermsContent({ variant = 'main' }: KidsLegalSectionProps) {
  return (
    <LegalBody variant={variant}>
      <h2>1. Hizmet Tanımı</h2>
      <p>
        Marifetli Kids, çocukların güvenli bir ortamda öğrenmesi, paylaşım yapması ve etkileşim kurması için
        geliştirilmiş bir dijital platformdur.
      </p>

      <h2>2. Üyelik ve Yaş Sınırı</h2>
      <p>18 yaş altı kullanıcılar yalnızca ebeveyn veya öğretmen onayı ile platformu kullanabilir.</p>

      <h2>3. Kullanıcı Sorumlulukları</h2>
      <p>
        <strong>Kullanıcılar, veli ve öğretmenler:</strong>
      </p>
      <ul>
        <li>Zararlı, uygunsuz veya şiddet içeren içerik paylaşamaz,</li>
        <li>Kişisel bilgilerini açık şekilde paylaşamaz,</li>
        <li>Başkalarını rahatsız edici davranışlarda bulunamaz.</li>
      </ul>
      <p>
        Marifetli Kids platformunda gerçekleştirilen tüm içerik paylaşımları, çocuk kullanıcıların güvenliğini sağlamak
        amacıyla veli ve/veya öğretmen onay mekanizmasına tabi olarak yürütülmektedir.
      </p>
      <p>
        Çocuk kullanıcılar tarafından paylaşılacak proje ve görsellerin yayına alınması, veli hesabı üzerinden
        gerçekleştirilen şifre doğrulaması ve onayı ile mümkün olmaktadır. Bu kapsamda, platform üzerindeki tüm içerik
        paylaşımlarının nihai sorumluluğu ilgili veli/öğretmen denetimi çerçevesinde değerlendirilir.
      </p>
      <p>
        <strong>Velilerin</strong> hesap bilgilerini ve şifrelerini üçüncü kişilerle paylaşmamaları ve
        çocuklarının gerçekleştireceği paylaşımları önceden kontrol etmeleri önemle tavsiye edilir.
      </p>
      <p>
        Marifetli Kids, kullanıcılar tarafından oluşturulan içerikleri sürekli denetlemekle birlikte, kullanıcı kaynaklı
        paylaşımlardan doğabilecek hukuki ve içerik sorumluluğunu kabul etmez. Ancak, platform politikalarına aykırı
        içeriklerin tespiti halinde gerekli müdahaleler yapılır.
      </p>

      <h2>4. İçerik Denetimi</h2>
      <p>Marifetli, çocuk güvenliği kapsamında içerikleri kaldırma ve kullanıcıyı engelleme hakkını saklı tutar.</p>

      <h2>5. Hesap Güvenliği</h2>
      <p>
        Kullanıcı hesaplarının güvenliği kullanıcı ve veli sorumluluğundadır. Veli, çocuk paylaşımlarına şifre ile onay
        verir; çocuklarınızla şifre paylaşımı yapmayınız.
      </p>

      <h2>6. Sorumluluk Reddi</h2>
      <p>Platform eğitim ve paylaşım amacıyla sunulmaktadır. İçeriklerin doğruluğu garanti edilmez.</p>

      <h2>7. Hukuk</h2>
      <p>Uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır.</p>
    </LegalBody>
  );
}

export function MarifetliKidsKvkkContent({ variant = 'main' }: KidsLegalSectionProps) {
  return (
    <LegalBody variant={variant}>
      <p>
        <strong>Veri sorumlusu:</strong> Startup Sales Support
      </p>
      <p>Marifetli Kids olarak çocuk kullanıcıların kişisel verilerini yüksek hassasiyetle koruyoruz.</p>

      <h2>1. Toplanan Veriler</h2>
      <ul>
        <li>Kullanıcı adı</li>
        <li>E-posta (veli/öğretmen)</li>
        <li>IP adresi</li>
        <li>Kullanım verileri</li>
      </ul>

      <h2>2. İşleme Amaçları</h2>
      <ul>
        <li>Platform hizmetlerini sunmak</li>
        <li>Kullanıcı güvenliğini sağlamak</li>
        <li>Eğitim süreçlerini desteklemek</li>
      </ul>

      <h2>3. Hukuki Sebep</h2>
      <p>KVKK kapsamında:</p>
      <ul>
        <li>Açık rıza</li>
        <li>Veli/öğretmen onayı</li>
        <li>Sözleşmenin ifası</li>
      </ul>

      <h2>4. Özel Durum (Çocuk Verisi)</h2>
      <p>18 yaş altı kullanıcıların verileri yalnızca ebeveyn/öğretmen onayı ile işlenir.</p>

      <h2>5. Veri Aktarımı</h2>
      <p>Veriler hosting sağlayıcıları ve analitik araçlar ile sınırlı olarak paylaşılabilir.</p>

      <h2>6. Haklar</h2>
      <p>KVKK madde 11 kapsamında:</p>
      <ul>
        <li>Veri talep etme</li>
        <li>Silme</li>
        <li>Düzeltme</li>
        <li>İtiraz</li>
      </ul>
      <p>
        <strong>Başvuru:</strong>{' '}
        <a href="mailto:hello@marifetli.com.tr" className="font-medium text-brand hover:underline">
          hello@marifetli.com.tr
        </a>
      </p>
    </LegalBody>
  );
}

export function MarifetliKidsPrivacyContent({ variant = 'main' }: KidsLegalSectionProps) {
  return (
    <LegalBody variant={variant}>
      <p>Marifetli Kids, çocukların gizliliğini korumayı öncelik olarak kabul eder.</p>

      <h2>1. Veri Güvenliği</h2>
      <p>Veriler teknik ve idari önlemlerle korunur.</p>

      <h2>2. Çocuk Güvenliği</h2>
      <p>
        Marifetli Kids platformunda gerçekleştirilen tüm içerik paylaşımları, çocuk kullanıcıların güvenliğini sağlamak
        amacıyla veli ve/veya öğretmen onay mekanizmasına tabi olarak yürütülmektedir.
      </p>
      <p>
        Çocuk kullanıcılar tarafından paylaşılacak proje ve görsellerin yayına alınması, veli hesabı üzerinden
        gerçekleştirilen şifre doğrulaması ve onayı ile mümkün olmaktadır. Bu kapsamda, platform üzerindeki tüm içerik
        paylaşımlarının nihai sorumluluğu ilgili veli/öğretmen denetimi çerçevesinde değerlendirilir.
      </p>
      <p>
        Velilerin hesap bilgilerini ve şifrelerini üçüncü kişilerle paylaşmamaları ve çocuklarının gerçekleştireceği
        paylaşımları önceden kontrol etmeleri önemle tavsiye edilir.
      </p>
      <p>
        Marifetli Kids, kullanıcılar tarafından oluşturulan içerikleri sürekli denetlemekle birlikte, kullanıcı kaynaklı
        paylaşımlardan doğabilecek hukuki ve içerik sorumluluğunu kabul etmez. Ancak, platform politikalarına aykırı
        içeriklerin tespiti halinde gerekli müdahaleler yapılır.
      </p>

      <h2>3. Veri Kullanımı</h2>
      <p>Veriler yalnızca platform geliştirme ve güvenlik amaçlı kullanılır.</p>

      <h2>4. Üçüncü Taraflar</h2>
      <p>Veriler ticari amaçla paylaşılmaz.</p>

      <h2>5. Saklama Süresi</h2>
      <p>Veriler gerekli süre boyunca saklanır, ardından silinir.</p>
    </LegalBody>
  );
}

export function MarifetliKidsCookiesContent({ variant = 'main' }: KidsLegalSectionProps) {
  return (
    <LegalBody variant={variant}>
      <p>Marifetli Kids, minimum veri prensibi ile çerez kullanır.</p>

      <h2>1. Kullanılan Çerezler</h2>
      <ul>
        <li>Zorunlu çerezler</li>
        <li>Analitik çerezler (anonim)</li>
      </ul>

      <h2>2. Amaç</h2>
      <ul>
        <li>Platformun çalışması</li>
        <li>Performans ölçümü</li>
      </ul>

      <h2>3. Reklam Çerezleri</h2>
      <p>Çocuk kullanıcılar için reklam hedefleme yapılmaz.</p>

      <h2>4. Kontrol</h2>
      <p>Çerezler tarayıcı ayarlarından yönetilebilir.</p>
    </LegalBody>
  );
}
