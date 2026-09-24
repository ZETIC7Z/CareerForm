import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { attachSession, getJwtSecret, usernameFromEmail } from '@/lib/auth';
import { getUsersCollection, pushNotification } from '@/lib/db';
import { ensurePatchNotifications, findUserById, notifySecurity, uniqueUsername } from '@/lib/account';
import { sendWelcomeEmail } from '@/lib/mailer';
import { PATCH_NOTES } from '@/lib/patch-notes';
import { requestOrigin } from '@/lib/request-origin';

/**
 * Step 2 of "Continue with Google".
 *
 * Three outcomes, in this order of preference:
 *   1. The Google account is already connected → sign that account in.
 *   2. The Google email matches an existing CareerForm account → connect Google to it and
 *      sign in. This is what makes "I signed up with my email, now I press Google with the
 *      same address" land on the SAME account instead of a confusing duplicate.
 *   3. Nothing matches → create the account from the Google profile. The Google display
 *      name becomes the CareerForm name, and a free username is derived from the address.
 */
function fail(origin: string, reason: string) {
  return NextResponse.redirect(`${origin}/?authError=${reason}#toolkit-and-updates`);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Must be identical to the value sent with /authorize, so it is derived the same way.
  const origin = requestOrigin(req);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const errorParam = url.searchParams.get('error');

  if (errorParam) return fail(origin, 'google_cancelled');
  if (!code) return fail(origin, 'google_failed');

  // ---- Validate the state we issued in /api/auth/google ----------------------
  const cookieState = req.cookies.get('pds_oauth_state')?.value || '';
  const [payload, signature] = state.split('.');
  const expected = crypto
    .createHmac('sha256', getJwtSecret())
    .update(payload || '')
    .digest('base64url');
  if (!payload || !signature || signature !== expected || signature !== cookieState.split('.')[1]) {
    return fail(origin, 'google_state');
  }

  let parsed: { mode: 'signin' | 'link'; userId?: string; exp: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return fail(origin, 'google_state');
  }
  if (!parsed.exp || parsed.exp < Date.now()) return fail(origin, 'google_expired');

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return fail(origin, 'google_unconfigured');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens?.access_token) return fail(origin, 'google_failed');

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = typeof profile?.email === 'string' ? profile.email.toLowerCase() : '';
    if (!profileRes.ok || !email || profile?.email_verified === false) return fail(origin, 'google_no_email');

    const googleId = String(profile.sub || '');
    const name = (profile.name || email.split('@')[0]).toString().slice(0, 80);
    const avatarUrl = typeof profile.picture === 'string' ? profile.picture : undefined;
    const users = await getUsersCollection();
    const now = new Date();

    // ---- Link mode: attach Google to the signed-in account -------------------
    if (parsed.mode === 'link' && parsed.userId) {
      const me = await findUserById(parsed.userId);
      if (!me) return fail(origin, 'google_state');
      const taken = await users.findOne({ googleId });
      if (taken && taken.email !== me.email) return fail(origin, 'google_in_use');
      await users.updateOne(
        { email: me.email },
        { $set: { googleId, avatarUrl, emailVerified: true, updatedAt: now } }
      );
      await notifySecurity(me.id, 'Google account connected', `${email} can now sign in to your CareerForm PH account.`);
      const done = NextResponse.redirect(`${origin}/dashboard?tab=security&linked=google`);
      done.cookies.delete('pds_oauth_state');
      return done;
    }

    // ---- Sign-in mode --------------------------------------------------------
    let existing = googleId ? await users.findOne({ googleId }) : null;
    if (!existing) existing = await users.findOne({ email });

    let userId: string;
    let finalName = name;

    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now, emailVerified: true };
      if (!existing.googleId) updates.googleId = googleId;
      if (avatarUrl) updates.avatarUrl = avatarUrl;
      // A Google-focused user never picked a username: derive one so both sign-in paths work.
      if (!existing.username) updates.username = await uniqueUsername(usernameFromEmail(email));
      await users.updateOne({ _id: existing._id }, { $set: updates });
      userId = existing._id!.toString();
      finalName = existing.name || name;

      // Only tell the user Google is now attached when we actually attached it.
      if (!existing.googleId) {
        await notifySecurity(
          userId,
          'Google sign-in connected',
          `${email} now opens this same account. Your email and password still work too.`
        );
      }
    } else {
      const username = await uniqueUsername(usernameFromEmail(email));
      const inserted = await users.insertOne({
        name,
        email,
        username,
        googleId,
        avatarUrl,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      } as never);
      userId = inserted.insertedId.toString();
      void sendWelcomeEmail(email, name, username);
    }

    await pushNotification(userId, {
      type: 'sync',
      title: 'Signed in with Google',
      body: 'Your projects, bookmarks, alerts and notifications are attached to this account.',
      href: '/dashboard',
      read: false,
    });

    // A fresh account still deserves the release notes the rest of the site sees.
    await ensurePatchNotifications(
      userId,
      PATCH_NOTES.slice(0, 2).map(n => ({ id: n.id, title: n.title, version: n.version, date: n.date }))
    );

    const redirect = NextResponse.redirect(`${origin}/dashboard`);
    attachSession(redirect, { id: userId, email, name: finalName });
    redirect.cookies.delete('pds_oauth_state');
    return redirect;
  } catch (error) {
    console.error('Google callback error:', error);
    return fail(origin, 'google_failed');
  }
}

export const dynamic = 'force-dynamic';
