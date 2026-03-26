import { NextResponse } from 'next/server';

export const revalidate = 3600;

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.marifetli.com.tr').replace(/\/$/, '');

export async function GET() {
  try {
    const now = new Date().toISOString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-questions.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-blog.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-designs.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${baseUrl}/sitemap-static.xml</loc></sitemap>
  <sitemap><loc>${baseUrl}/sitemap-questions.xml</loc></sitemap>
</sitemapindex>`;
    return new NextResponse(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
