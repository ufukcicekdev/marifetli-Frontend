import type { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
      '/api/',
      '/auth/',
      '/ayarlar',
      '/admin',
      '/giris',
      '/kayit',
      '/onboarding',
      '/bildirimler',
      '/kids/admin',
      '/kids/panel',
      '/kids/profil',
      '/kids/mesajlar',
      '/kids/bildirimler',
      '/kids/ogretmen/panel',
      '/kids/ogrenci/panel',
      '/kids/veli/panel',
      '/reset-password/',
      '/verify-email/',
      '/sifre-sifirla/',
    ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
