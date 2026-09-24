import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'pds_auth_token';

/**
 * The signing key for session tokens and the OAuth state value, resolved from the
 * environment ONLY.
 *
 * This used to fall back to a literal string that was committed to the repository. Because
 * session tokens are plain HMAC-SHA256 JWTs, anybody who can read that literal — and the
 * repository is the first place anyone looks — could mint a token for any account on any
 * deployment that had not overridden it. The fallback is gone for the same reason the
 * database fallback in `db.ts` is gone: a missing secret must fail loudly at deploy time
 * rather than quietly ship a forgeable one.
 */
export function getJwtSecret(): string {
  const secret = (process.env.JWT_SECRET || '').trim().replace(/^["']|["']$/g, '');
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not configured. Add it to the environment (README → Environment) before starting the server.'
    );
  }
  return secret;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  createdAt: string;
}

/** Session lifetime: 30 days, matching the cookie's maxAge below. */
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Attach the session cookie to a response.
 *
 * httpOnly keeps the token out of JavaScript (so an XSS foothold cannot lift it),
 * sameSite=lax lets the emailed reset link and the Google redirect both come back
 * with the session intact while still blocking cross-site POSTs, and `secure` is on
 * for every production deploy.
 */
export function attachSession(
  response: NextResponse,
  payload: { id: string; email: string; name: string }
): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createToken(payload),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

/**
 * Usernames are the second way to sign in, so they have to be normalised the same way
 * on write and on read: lowercase, 3–24 characters, letters/numbers/dot/underscore.
 */
export function normaliseUsername(input: string): string {
  return (input || '').trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
}

export function isValidUsername(input: string): boolean {
  return /^[a-z0-9._]{3,24}$/.test(normaliseUsername(input));
}

/** Best-effort unique username from an email local part (used by Google sign-up). */
export function usernameFromEmail(email: string): string {
  const base = normaliseUsername((email || '').split('@')[0]).replace(/^[._]+|[._]+$/g, '') || 'applicant';
  return base.slice(0, 20).padEnd(3, '0');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

export function createToken(payload: { id: string; email: string; name: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { id: string; email: string; name: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { id: payload.id, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
