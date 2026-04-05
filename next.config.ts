import type { NextConfig } from "next";
import path from "path";

const isMobileBuild = process.env.BUILD_MOBILE === "1";

const nextConfig: NextConfig = {
  ...(isMobileBuild
    ? {
        output: "export" as const,
        trailingSlash: true,
        distDir: ".next-mobile",
        images: { unoptimized: true },
      }
    : { output: "standalone" }),
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Uzun önbellek: static chunk'lar (Lighthouse – verimli önbellek)
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  // marifetli.com.tr → www.marifetli.com.tr (301 kalıcı yönlendirme)
  async redirects() {
    return [
      // Eski SW veya tarayıcı /badge-icon.png isterse /icons/badge-icon.png'e yönlendir (404 önleme)
      { source: '/badge-icon.png', destination: '/icons/badge-icon.png', permanent: false },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'marifetli.com.tr' }],
        destination: 'https://www.marifetli.com.tr/:path*',
        permanent: true,
      },
    ];
  },
  // Görsel optimizasyonu (Lighthouse – LCP, mobil). Capacitor build'de unoptimized: true
  images: {
    ...(isMobileBuild ? { unoptimized: true } : {}),
    remotePatterns: [
      { protocol: 'https', hostname: 'web-production-5404d.up.railway.app', pathname: '/**' },
      { protocol: 'https', hostname: '*.up.railway.app', pathname: '/**' },
      { protocol: 'https', hostname: 'cekfisi.fra1.digitaloceanspaces.com', pathname: '/**' },
      { protocol: 'https', hostname: 'fra1.digitaloceanspaces.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.digitaloceanspaces.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**', port: '8000' },
      /** Kids landing mockup / AIDA önizleme görselleri */
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
    ],
  },
};

export default nextConfig;