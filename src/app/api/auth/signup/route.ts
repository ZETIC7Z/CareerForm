import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ ok: false, error: 'Full name is required (min 2 characters).' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'A valid email address is required.' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ ok: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const db = await getDb();
    const usersCol = db.collection('users');
    const logsCol = db.collection('session_logs');

    // Check existing
    const existing = await usersCol.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json({ ok: false, error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const now = new Date();

    const result = await usersCol.insertOne({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    const userId = result.insertedId.toString();

    // Log to session_logs
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    await logsCol.insertOne({
      userId,
      email: cleanEmail,
      action: 'signup',
      ip,
      userAgent,
      createdAt: now,
    });

    const token = createToken({ id: userId, email: cleanEmail, name: cleanName });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email: cleanEmail,
        name: cleanName,
        createdAt: now.toISOString(),
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
    console.error('Signup error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error during registration.' }, { status: 500 });
  }
}
