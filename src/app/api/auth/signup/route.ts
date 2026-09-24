import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUsersCollection, pushNotification } from '@/lib/db';
import { attachSession, hashPassword, isValidUsername, normaliseUsername } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/mailer';

/**
 * Create an account.
 *
 * Sign-up collects four things: full name, username, email and a confirmed password.
 * Both the username and the email are unique keys, because either one can be used to
 * sign in later — see /api/auth/signin.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const username = normaliseUsername(typeof body?.username === 'string' ? body.username : '');
    const password = typeof body?.password === 'string' ? body.password : '';
    const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';

    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: 'Please enter your full name.' }, { status: 400 });
    }
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { ok: false, error: 'Username must be 3–24 characters — letters, numbers, dots or underscores.' },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
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

    const users = await getUsersCollection();

    // One round trip answers both uniqueness questions rather than two sequential ones.
    const clash = await users.findOne({ $or: [{ email }, { username }] });
    if (clash) {
      if (clash.email === email) {
        return NextResponse.json(
          { ok: false, error: 'An account with this email already exists. Sign in instead — or use Google.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { ok: false, error: 'That username is taken. Try another one.' },
        { status: 409 }
      );
    }

    const now = new Date();
    const doc = {
      name,
      email,
      username,
      passwordHash: hashPassword(password),
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await users.insertOne(doc as never);
    const userId = result.insertedId.toString();

    const db = await getDb();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    await db.collection('session_logs').insertOne({
      userId,
      email,
      action: 'signup',
      ip,
      userAgent,
      createdAt: now,
    });

    await pushNotification(userId, {
      type: 'system',
      title: `Welcome to CareerForm PH, ${name.split(' ')[0]}!`,
      body: 'Your projects, cover letters, bookmarks and job alerts now follow this account on every device.',
      href: '/dashboard',
      read: false,
    });

    // A missing mailbox must never fail a sign-up, so this is fire-and-forget.
    void sendWelcomeEmail(email, name, username);

    const response = NextResponse.json({
      ok: true,
      user: { id: userId, email, name, username, createdAt: now.toISOString() },
    });

    attachSession(response, { id: userId, email, name });
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error during registration.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
