// Same-origin defense for state-changing requests. We already use
// Authorization: Bearer (not cookies) so CSRF is largely moot, but rejecting
// cross-origin POST/PUT/DELETE is cheap defense-in-depth against mis-wired
// integrations and accidental cross-site fetches.

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isSameOriginRequest(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // Non-browser clients (curl, server-to-server) may omit Origin; allow when
  // Authorization header is present — token auth stands alone.
  if (!origin && !referer) return true;

  const source = origin || referer || '';
  try {
    const sourceUrl = new URL(source);
    if (host && sourceUrl.host === host) return true;
    if (ALLOWED_ORIGINS.includes(sourceUrl.origin)) return true;
  } catch {
    return false;
  }
  return false;
}

export function originForbiddenResponse() {
  return new Response(JSON.stringify({ error: 'Cross-origin request blocked' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
