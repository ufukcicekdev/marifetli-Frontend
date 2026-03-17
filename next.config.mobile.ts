/**
 * Next.js config sadece Capacitor (Android/iOS) build için.
 * Web deploy için next.config.ts kullanılır; mobil için: next build -c next.config.mobile.ts
 */
import type { NextConfig } from "next";
import path from "path";

const nextConfigMobile: NextConfig = {
  output: "export",
  trailingSlash: true,
  distDir: ".next-mobile",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "web-production-5404d.up.railway.app", pathname: "/**" },
      { protocol: "https", hostname: "*.up.railway.app", pathname: "/**" },
      { protocol: "https", hostname: "cekfisi.fra1.digitaloceanspaces.com", pathname: "/**" },
      { protocol: "https", hostname: "fra1.digitaloceanspaces.com", pathname: "/**" },
      { protocol: "https", hostname: "*.digitaloceanspaces.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**", port: "8000" },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      { source: "/badge-icon.png", destination: "/icons/badge-icon.png", permanent: false },
    ];
  },
};

export default nextConfigMobile;
