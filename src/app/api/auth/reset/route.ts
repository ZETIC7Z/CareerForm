import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection, getPasswordResetsCollection } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { notifySecurity } from '@/lib/account';

/**
 * Finish the password reset: the token from the email plus a confirmed new password.
 *
 * The token is matched by hash, must be unused, and must be unexpired. Every other
 * outstanding reset for that account is burned at the same time, so an older email
 * cannot be replayed afterwards.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!token) {
      return NextResponse.json({ ok: false, error: 'This reset link is incomplete. Request a new one.' }, { status: 400 });
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 8 characters and mix letters with numbers.' },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ ok: false, error: 'The two passwords do not match.' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resets = await getPasswordResetsCollection();
    const record = await resets.findOne({ tokenHash });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: 'This reset link has expired or was already used. Request a new one.' },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    await users.updateOne(
      { email: record.email },
      { $set: { passwordHash: hashPassword(password), updatedAt: new Date() } }
    );

    await resets.updateOne({ tokenHash }, { $set: { usedAt: new Date() } });
    await resets.deleteMany({ email: record.email, tokenHash: { $ne: tokenHash } });

    await notifySecurity(
      record.userId,
      'Your password was reset',
      'A new password was set from an emailed reset link. If this was not you, reset it again immediately.'
    );

    return NextResponse.json({ ok: true, message: 'Password updated. You can sign in with your new password now.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ ok: false, error: 'Could not reset the password right now. Please try again.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
