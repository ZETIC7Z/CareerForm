import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { getUsersCollection } from '@/lib/db';
import { getUserOrNull, notifySecurity } from '@/lib/account';

/**
 * Change (or, for a Google-only account, set) the account password from Account &
 * Security. Knowing the current password is required whenever one already exists — a
 * stolen session must not be enough to lock the owner out of their own account.
 */
export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return NextResponse.json(
        { ok: false, error: 'New password must be at least 8 characters and mix letters with numbers.' },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ ok: false, error: 'The two new passwords do not match.' }, { status: 400 });
    }

    const user = await getUserOrNull(session.email);
    if (!user) return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 });

    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ ok: false, error: 'Enter your current password to make this change.' }, { status: 400 });
      }
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return NextResponse.json({ ok: false, error: 'Your current password is incorrect.' }, { status: 401 });
      }
      if (verifyPassword(newPassword, user.passwordHash)) {
        return NextResponse.json({ ok: false, error: 'Choose a password you have not used here before.' }, { status: 400 });
      }
    }

    const users = await getUsersCollection();
    await users.updateOne(
      { email: user.email },
      { $set: { passwordHash: hashPassword(newPassword), updatedAt: new Date() } }
    );

    await notifySecurity(
      user.id,
      user.passwordHash ? 'Your password was changed' : 'Password added to your account',
      user.passwordHash
        ? 'Your account password changed. If this was not you, reset it immediately.'
        : 'You can now sign in with your email or username and this password, not only with Google.'
    );

    return NextResponse.json({ ok: true, message: 'Password updated.' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ ok: false, error: 'Could not update the password right now.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
