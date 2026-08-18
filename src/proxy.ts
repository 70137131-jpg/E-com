import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-session';

/**
 * Gate on /admin — PRD 13.5.
 *
 * The PRD names this file `middleware.ts`; that convention is deprecated in
 * Next.js 16 and renamed to `proxy.ts`, with identical behaviour. Proxy defaults
 * to the Node.js runtime in v16, so the HMAC verification below can use
 * node:crypto via lib/signing.
 *
 * This is a first line of defence only. Every admin page calls requireAdmin()
 * and every admin action calls assertAdmin(), per PRD 14.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (verifySessionToken(token)) return NextResponse.next();

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything under /admin except the login page itself, which must stay
  // reachable while unauthenticated.
  matcher: ['/admin', '/admin/((?!login).*)'],
};
