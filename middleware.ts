import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const KIDS_HEADER = 'x-marifetli-kids';
const KIDS_COOKIE = 'marifetli_kids_portal';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isKidsPath = pathname === '/kids' || pathname.startsWith('/kids/');

  const reqHeaders = new Headers(request.headers);

  if (isKidsPath) {
    reqHeaders.set(KIDS_HEADER, '1');
    const res = NextResponse.next({ request: { headers: reqHeaders } });
    res.cookies.set(KIDS_COOKIE, '1', {
      path: '/kids',
      sameSite: 'lax',
      httpOnly: false,
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
