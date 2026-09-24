import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (user) {
      const db = await getDb();
      const logsCol = db.collection('session_logs');
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
      const userAgent = req.headers.get('user-agent') || 'Unknown';
      await logsCol.insertOne({
        userId: user.id,
        email: user.email,
        action: 'signout',
        ip,
        userAgent,
        createdAt: new Date(),
      });
    }
  } catch {}

  const response = NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  // Written explicitly rather than via `delete()` so the expiry carries exactly the same
  // path and flags the cookie was set with — a mismatch there leaves a live cookie behind
  // and the browser keeps sending it.
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
