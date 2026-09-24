import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUsersCollection } from '@/lib/db';
import { attachSession, normaliseUsername, verifyPassword } from '@/lib/auth';
import { hashBackupCode, verifyTotp } from '@/lib/totp';

/**
 * Sign in with either the username or the email address of the account.
 *
 * `identifier` is deliberately one field: applicants forget which of the two they
 * registered with, and making them pick the right kind of identifier is a needless
 * support burden. If the account has an authenticator app connected, the request must
 * also carry a 6-digit `code` (or a saved backup code).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier =
      typeof body?.identifier === 'string'
        ? body.identifier.trim()
        : typeof body?.email === 'string'
          ? body.email.trim()
          : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!identifier || !password) {
      return NextResponse.json({ ok: false, error: 'Enter your username or email, and your password.' }, { status: 400 });
    }

    const users = await getUsersCollection();
    const email = identifier.toLowerCase();
    const username = normaliseUsername(identifier);

    const user =
      (await users.findOne({ email })) ||
      (username ? await users.findOne({ username }) : null);

    if (!user) {
      return NextResponse.json({ ok: false, error: 'We could not find an account with those details.' }, { status: 401 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          ok: false,
          error: 'This account was created with Google. Use “Continue with Google” below, or set a password from Account & Security.',
          useGoogle: true,
        },
        { status: 409 }
      );
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: 'Incorrect password. Please try again.' }, { status: 401 });
    }

    const userId = user._id!.toString();
    const accountEmail = user.email;

    // ---- Second factor -------------------------------------------------------
    if (user.totp?.enabled) {
      if (!code) {
        return NextResponse.json(
          { ok: false, error: 'Enter the 6-digit code from your authenticator app.', requires2fa: true },
          { status: 401 }
        );
      }
      const backup = hashBackupCode(code);
      const backupIndex = (user.totp.backupCodes || []).indexOf(backup);
      const totpOk = verifyTotp(user.totp.secret, code);
      if (!totpOk && backupIndex === -1) {
        return NextResponse.json(
          { ok: false, error: 'That code is not valid any more. Codes change every 30 seconds — try the newest one.', requires2fa: true },
          { status: 401 }
        );
      }
      if (!totpOk && backupIndex !== -1) {
        // A recovery code is single-use: spend it the moment it works.
        const remaining = [...(user.totp.backupCodes || [])];
        remaining.splice(backupIndex, 1);
        await users.updateOne({ _id: user._id }, { $set: { 'totp.backupCodes': remaining, updatedAt: new Date() } });
      }
    }

    const now = new Date();
    const db = await getDb();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    await db.collection('session_logs').insertOne({
      userId,
      email: accountEmail,
      action: 'signin',
      ip,
      userAgent,
      createdAt: now,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email: accountEmail,
        name: user.name || '',
        username: user.username || '',
        createdAt: (user.createdAt as unknown as Date)?.toISOString?.() || now.toISOString(),
      },
    });

    attachSession(response, { id: userId, email: accountEmail, name: user.name || '' });
    return response;
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error during sign in.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
