import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getJwtSecret } from '@/lib/auth';
import { requestOrigin } from '@/lib/request-origin';

/**
 * Step 1 of "Continue with Google" (OAuth 2.0 authorization-code flow, no SDK).
 *
 * ?mode=signin → sign in / sign up. If the Google email matches an existing account the
 *                user is signed into that same account, exactly as if they had typed it.
 * ?mode=link   → connect Google to the account that is already signed in (Account &
 *                Security → Connect Google).
 *
 * The `state` value is signed with the same secret as the session token and echoed back
 * through an httpOnly cookie, so a callback that we did not start cannot be replayed at
 * us (CSRF on the login endpoint).
 */
const SCOPE = 'openid email profile';

function sign(value: string): string {
  return crypto.createHmac('sha256', getJwtSecret()).update(value).digest('base64url');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') === 'link' ? 'link' : 'signin';
  // The public origin, not whatever host the proxy handed the function — Google matches
  // the redirect_uri byte for byte against the Cloud Console entry.
  const origin = requestOrigin(req);

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    // Not configured yet: send the user back with a readable reason instead of a dead end.
    return NextResponse.redirect(`${origin}/?authError=google_unconfigured#toolkit-and-updates`);
  }

  let userId = '';
  if (mode === 'link') {
    const session = await getCurrentUser();
    if (!session) return NextResponse.redirect(`${origin}/?authError=signin_required`);
    userId = session.id;
  }

  const payload = Buffer.from(
    JSON.stringify({ mode, userId, nonce: crypto.randomBytes(12).toString('hex'), exp: Date.now() + 10 * 60 * 1000 })
  ).toString('base64url');
  const state = `${payload}.${sign(payload)}`;

  const redirectUri = `${origin}/api/auth/google/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPE);
  authUrl.searchParams.set('state', state);
  // Always let the applicant choose the Google account — many share a device.
  authUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set({
    name: 'pds_oauth_state',
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}

export const dynamic = 'force-dynamic';
