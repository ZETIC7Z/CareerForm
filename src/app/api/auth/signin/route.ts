import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const db = await getDb();
    const usersCol = db.collection('users');
    const logsCol = db.collection('session_logs');

    const user = await usersCol.findOne({ email: cleanEmail });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const userId = user._id.toString();
    const now = new Date();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Record login in session_logs
    await logsCol.insertOne({
      userId,
      email: cleanEmail,
      action: 'signin',
      ip,
      userAgent,
      createdAt: now,
    });

    const token = createToken({ id: userId, email: cleanEmail, name: user.name || '' });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email: cleanEmail,
        name: user.name || '',
        createdAt: user.createdAt?.toISOString?.() || now.toISOString(),
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error during sign in.' }, { status: 500 });
  }
}
