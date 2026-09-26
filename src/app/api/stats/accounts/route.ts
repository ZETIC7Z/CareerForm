import { NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * How many accounts this site has — the only public number it publishes.
 *
 * Every account lives in the one `users` collection whether it was created with an email
 * and password or with Google (`googleId` instead of `passwordHash`), so a plain count of
 * that collection is the honest total: nothing is filtered, nothing is estimated, and a
 * brand-new registration moves it by exactly one.
 *
 * Public and unauthenticated on purpose — it is a fact about the site, not about a person,
 * and the header shows it to visitors who are not signed in yet. Nothing else about the
 * collection is exposed: no ids, no addresses, no per-day breakdown.
 */
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } as const;

/**
 * Every open tab asks for this on a timer, so the same answer is reused for a beat. Long
 * enough that a burst of tabs collapses into one read, short enough that the person who
 * just signed up sees their own registration counted on the next poll.
 */
const MEMO_MS = 4000;
let memo: { total: number; at: number } | null = null;

export async function GET() {
  try {
    if (!memo || Date.now() - memo.at > MEMO_MS) {
      const users = await getUsersCollection();
      memo = { total: await users.countDocuments({}), at: Date.now() };
    }
    return NextResponse.json({ ok: true, total: memo.total }, { headers: NO_STORE });
  } catch {
    // The counter is decorative next to the rest of the site: if the database cannot be
    // reached the badge quietly keeps its last number rather than shouting at the visitor.
    return NextResponse.json(
      { ok: false, error: 'The account total is unavailable right now.' },
      { status: 503, headers: NO_STORE }
    );
  }
}
