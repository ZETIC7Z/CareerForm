import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, getCurrentUser } from '@/lib/auth';
import { getUserOrNull } from '@/lib/account';

/**
 * The signed-in user, as the header, dashboard and profile panels need it.
 *
 * The session cookie only carries the id / email / name that were true at sign-in time.
 * Reading the record back means a profile rename, a username chosen later, and — the one
 * that matters here — the real `createdAt` show up straight away instead of waiting for
 * the next sign-in. `no-store` keeps a shared machine from replaying someone else's
 * session payload out of a cache.
 */
export async function GET() {
  const noStore = { 'Cache-Control': 'no-store' } as const;
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ ok: false, user: null }, { status: 200, headers: noStore });
  }

  const account = await getUserOrNull(session.email);

  // A cookie stays valid for 30 days. If the account behind it is gone — deleted on
  // request, or wiped during a migration — the session must not keep describing a user
  // that no longer exists. Answer "no user" and expire the cookie so every caller (the
  // header, the dashboard guard) sees the same signed-out state.
  if (!account) {
    const expired = NextResponse.json({ ok: false, user: null, reason: 'account_removed' }, { headers: noStore });
    expired.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return expired;
  }

  const createdAt = account.createdAt;
  const user = {
    id: account.id,
    email: account.email,
    name: account.name,
    username: account.username || '',
    hasPassword: Boolean(account.passwordHash),
    googleLinked: Boolean(account.googleId),
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : (createdAt as string | undefined),
  };

  return NextResponse.json({ ok: true, user }, { headers: noStore });
}

export const dynamic = 'force-dynamic';
