'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', color: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: '4rem', fontWeight: 700, color: 'rgba(239, 68, 68, 0.3)', margin: 0 }}>500</p>
          <h1 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>Kritik hata</h1>
          <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
            Uygulama beklenmeyen bir hata ile karşılaştı. Lütfen sayfayı yenileyin veya ana sayfaya gidin.
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '0.625rem 1.25rem',
                background: '#f97316',
                color: 'white',
                fontWeight: 500,
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              Tekrar dene
            </button>
            <Link
              href="/"
              style={{
                padding: '0.625rem 1.25rem',
                border: '1px solid #d1d5db',
                color: '#374151',
                fontWeight: 500,
                borderRadius: '0.5rem',
                textDecoration: 'none',
              }}
            >
              Ana sayfaya dön
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
