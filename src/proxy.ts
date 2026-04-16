import { NextResponse, type NextRequest } from 'next/server';
import { isSameOriginRequest } from '@/lib/origin-check';

export function proxy(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return NextResponse.next();
  }
  if (!isSameOriginRequest(request)) {
    return new NextResponse(
      JSON.stringify({ error: 'Cross-origin request blocked' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
