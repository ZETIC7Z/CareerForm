import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
import { getUsersCollection } from '@/lib/db';
import {
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  totpUri,
  verifyTotp,
} from '@/lib/totp';
import { getUserOrNull, notifySecurity } from '@/lib/account';

/**
 * Authenticator-app two-factor, in one endpoint with an `action` switch:
 *
 *   setup   → mint a fresh secret and hand back the otpauth:// URI, a scannable QR data
 *             URL and the emergency manual-entry key. The secret is stored but stays
 *             DISABLED until a valid code proves the app really holds it.
 *   enable  → verify the first code, flip the flag on, and return the single-use backup
 *             codes (the only time they are ever readable).
 *   disable → switch it back off. Requires the account password, or a live code for
 *             Google-only accounts that have no password.
 *
 * Google Authenticator, Microsoft Authenticator, Authy, 1Password and Bitwarden all read
 * the same otpauth URI, so one implementation covers every phone.
 */
export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : '';
    const user = await getUserOrNull(session.email);
    if (!user) return NextResponse.json({ ok: false, error: 'Account not found.' }, { status: 404 });

    const users = await getUsersCollection();

    if (action === 'setup') {
      const secret = generateTotpSecret();
      await users.updateOne(
        { email: user.email },
        { $set: { totp: { secret, enabled: false, backupCodes: [] }, updatedAt: new Date() } }
      );
      const uri = totpUri(secret, user.email);
      const qr = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
      return NextResponse.json({
        ok: true,
        secret,
        otpauth: uri,
        qr,
        // Grouped in fours the way phones show it, for people who must type it by hand.
        manualKey: secret.replace(/(.{4})/g, '$1 ').trim(),
      });
    }

    if (action === 'enable') {
      const code = typeof body?.code === 'string' ? body.code : '';
      if (!user.totp?.secret) {
        return NextResponse.json({ ok: false, error: 'Start the setup again — no authenticator key is waiting.' }, { status: 400 });
      }
      if (!verifyTotp(user.totp.secret, code)) {
        return NextResponse.json(
          { ok: false, error: 'That code did not match. Make sure your phone clock is automatic and enter the current 6 digits.' },
          { status: 400 }
        );
      }
      const backupCodes = generateBackupCodes(10);
      await users.updateOne(
        { email: user.email },
        {
          $set: {
            totp: { secret: user.totp.secret, enabled: true, backupCodes: backupCodes.map(hashBackupCode) },
            updatedAt: new Date(),
          },
        }
      );
      await notifySecurity(
        user.id,
        'Authenticator app connected',
        'Two-factor sign-in is now on. Keep your backup codes somewhere safe.'
      );
      return NextResponse.json({
        ok: true,
        backupCodes,
        message:
          'Authenticator connected. From now on, signing in asks for the 6-digit code your app shows.',
      });
    }

    if (action === 'disable') {
      const password = typeof body?.password === 'string' ? body.password : '';
      const code = typeof body?.code === 'string' ? body.code : '';
      const passwordOk = user.passwordHash ? verifyPassword(password, user.passwordHash) : false;
      const codeOk = user.totp?.secret ? verifyTotp(user.totp.secret, code) : false;
      if (!passwordOk && !codeOk) {
        return NextResponse.json(
          { ok: false, error: 'Confirm with your account password or a current authenticator code.' },
          { status: 401 }
        );
      }
      await users.updateOne({ email: user.email }, { $unset: { totp: '' } });
      await users.updateOne({ email: user.email }, { $set: { updatedAt: new Date() } });
      await notifySecurity(user.id, 'Authenticator app removed', 'Two-factor sign-in was switched off for this account.');
      return NextResponse.json({ ok: true, message: 'Authenticator removed. Sign-in now only needs your password.' });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('TOTP error:', error);
    return NextResponse.json({ ok: false, error: 'Could not complete the authenticator request.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
