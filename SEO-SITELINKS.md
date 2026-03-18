# Sitelinks (Google’da Alt Linkler) Neden Çıkmıyor?

TEB gibi sitelerde görünen, ana sonucun altındaki **sitelinks** (İnternet Şubesi, Kredi Hesaplama, İletişim vb.) Google’ın **otomatik** eklediği öğelerdir. Bunları doğrudan “açma” veya zorunlu kılma imkânı yok; algoritma karar verir.

## Neden Marifetli’de (henüz) yok?

1. **Otorite / marka bilinirliği**  
   Sitelinks genelde daha yüksek otorite ve trafik alan sitelerde gösterilir. TEB gibi büyük markalar yıllardır index’te ve çok tıklanıyor; yeni veya daha az bilinen sitelerde daha geç çıkabilir.

2. **Zaman**  
   Yeni veya az trafik alan sitelerde sitelinks bazen aylar, bazen 1–2 yıl sonra görünmeye başlar.

3. **Yapı ve linkler**  
   Ana sayfadan önemli sayfalara (Sorular, Kategoriler, Blog, İletişim vb.) net, anlamlı linkler olması sitelinks ihtimalini artırır. Menü ve footer’daki linkler bu açıdan önemli.

## Bizim yaptığımız iyileştirmeler

- **WebSite şeması:** `layout.tsx` içinde `WebSite` + `SearchAction` (arama URL’si: `/sorular?q={search_term_string}`) eklendi. Bu, sitenin “arama yapılabilir” bir site olarak anlaşılmasını ve bazen sitelinks’te arama kutusu çıkmasını destekler.
- **Mevcut yapı:** Organization, WebSite, sitemap, canonical URL’ler zaten var; sitelinks için gerekli temel sinyaller veriliyor.

## Ne yapabilirsin?

- **Google Search Console:** Siteni ekleyip indexlenmeyi ve hataları takip et.
- **İç linkleme:** Ana sayfa ve önemli sayfalardan Sorular, Kategoriler, Blog, Topluluklar, İletişim, Hakkımızda gibi sayfalara anlamlı anchor metinlerle link ver (zaten menü/footer’da büyük ölçüde var).
- **İçerik ve trafik:** Kaliteli içerik ve organik trafik otoriteyi artırır; sitelinks zamanla çıkma ihtimali yükselir.

Özet: Sitelinks tamamen Google’ın inisiyatifinde; yapı ve şemayı doğru kurduk, geri kalanı otorite ve zamanla gelir.
