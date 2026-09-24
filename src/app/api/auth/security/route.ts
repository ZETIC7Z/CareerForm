import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserOrNull } from '@/lib/account';

/**
 * Everything Account & Security needs to render its true state: whether the account has
 * a password of its own, whether Google is connected, and whether an authenticator app
 * is protecting sign-in. Nothing here is a secret — no hashes, no TOTP secret.
 */
export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const user = await getUserOrNull(session.email);
  if (!user) return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 });

  return NextResponse.json(
    {
      ok: true,
      account: {
        name: user.name,
        email: user.email,
        username: user.username || '',
        hasPassword: Boolean(user.passwordHash),
        googleLinked: Boolean(user.googleId),
        totpEnabled: Boolean(user.totp?.enabled),
        backupCodesLeft: user.totp?.enabled ? (user.totp.backupCodes || []).length : 0,
        createdAt: user.createdAt,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export const dynamic = 'force-dynamic';
