import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.resolve(__dirname),
  },
  // marifetli.com.tr → www.marifetli.com.tr (301 kalıcı yönlendirme)
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'marifetli.com.tr' }],
        destination: 'https://www.marifetli.com.tr/:path*',
        permanent: true,
      },
    ];
  },
  // Görsel optimizasyonu (Lighthouse – LCP, mobil)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'web-production-5404d.up.railway.app', pathname: '/**' },
      { protocol: 'https', hostname: '*.up.railway.app', pathname: '/**' },
      { protocol: 'https', hostname: 'cekfisi.fra1.digitaloceanspaces.com', pathname: '/**' },
      { protocol: 'https', hostname: 'fra1.digitaloceanspaces.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.digitaloceanspaces.com', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**', port: '8000' },
    ],
  },
};

export default nextConfig;