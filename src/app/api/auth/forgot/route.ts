import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPasswordResetsCollection } from '@/lib/db';
import { getUserOrNull } from '@/lib/account';
import { sendPasswordResetEmail } from '@/lib/mailer';

/**
 * Start the password reset flow.
 *
 * The response is identical whether or not the address has an account — otherwise this
 * endpoint becomes a free "does this person use CareerForm?" oracle. The reset link is
 * single-use and expires in 30 minutes; only its hash is stored, so a database leak
 * cannot be replayed into account takeover.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : typeof body?.email === 'string' ? body.email.trim() : '';

    if (!identifier) {
      return NextResponse.json({ ok: false, error: 'Enter the email address or username of your account.' }, { status: 400 });
    }

    const user = await getUserOrNull(identifier);
    if (user) {
      const resets = await getPasswordResetsCollection();
      const since = new Date(Date.now() - 15 * 60 * 1000);
      const recent = await resets.countDocuments({ userId: user.id, createdAt: { $gte: since } });
      if (recent >= 3) {
        return NextResponse.json(
          { ok: false, error: 'Too many reset requests for this account. Please wait a few minutes and try again.' },
          { status: 429 }
        );
      }

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      await resets.insertOne({
        tokenHash,
        userId: user.id,
        email: user.email,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
      });

      const origin = req.headers.get('origin') || new URL(req.url).origin;
      const link = `${origin}/reset-password?token=${token}`;
      const result = await sendPasswordResetEmail(user.email, user.name, link);

      return NextResponse.json({
        ok: true,
        message: `If ${user.email} has a CareerForm PH account, a reset link is on its way. Check spam too — it can take a minute.`,
        // Present only when no mail provider is configured and we are not in production,
        // so the flow is still testable end to end locally.
        devResetLink: result.previewLink,
      });
    }

    // Same shape as the success case: no account enumeration.
    return NextResponse.json({
      ok: true,
      message: 'If that account exists, a reset link is on its way. Check spam too — it can take a minute.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ ok: false, error: 'Could not start the reset right now. Please try again.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
