import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const KIDS_HEADER = 'x-marifetli-kids';

function kidsHostSet(): Set<string> {
  const s = new Set(['cocuk.marifetli.com.tr']);
  const one = process.env.NEXT_PUBLIC_KIDS_HOST?.trim().toLowerCase();
  if (one) s.add(one);
  const csv = process.env.NEXT_PUBLIC_KIDS_EXTRA_HOSTS ?? '';
  for (const h of csv.split(',')) {
    const t = h.trim().toLowerCase();
    if (t) s.add(t);
  }
  return s;
}

function isSkippedPath(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api')) return true;
  return /\.[a-zA-Z0-9]+$/i.test(pathname);
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';
  const pathname = request.nextUrl.pathname;
  const isKidsHost = kidsHostSet().has(host);
  const isKidsPath = pathname === '/kids' || pathname.startsWith('/kids/');

  const reqHeaders = new Headers(request.headers);

  if (isKidsHost && !isSkippedPath(pathname)) {
    if (!pathname.startsWith('/kids')) {
      const url = request.nextUrl.clone();
      const rest = pathname === '/' ? '' : pathname;
      url.pathname = `/kids${rest}`;
      reqHeaders.set(KIDS_HEADER, '1');
      return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
    }
  }

  if (isKidsPath || (isKidsHost && pathname.startsWith('/kids'))) {
    reqHeaders.set(KIDS_HEADER, '1');
    return NextResponse.next({ request: { headers: reqHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
