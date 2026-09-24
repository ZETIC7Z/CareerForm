import type { NextRequest } from 'next/server';

/**
 * The origin the browser actually used — which is NOT always `new URL(req.url).origin`.
 *
 * Behind Vercel's proxy the request that reaches the function carries the internal host,
 * so reading the origin off `req.url` can produce a redirect_uri that Google never sees
 * in the address bar. Google compares the `redirect_uri` from `/authorize` with the one
 * sent to `/token` AND against the URIs registered in the Cloud Console, so one wrong
 * character is an immediate `redirect_uri_mismatch`.
 *
 * Reading the forwarded headers keeps localhost, preview deployments and the production
 * domain all correct with no per-environment configuration.
 */
export function requestOrigin(req: NextRequest): string {
  const forwardedHost = (req.headers.get('x-forwarded-host') || '').split(',')[0].trim();
  const host = forwardedHost || (req.headers.get('host') || '').trim();
  const forwardedProto = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim();
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const proto = forwardedProto || (isLocal ? 'http' : 'https');

  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}
