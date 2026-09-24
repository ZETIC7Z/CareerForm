import { NextResponse } from 'next/server';
import { attachSession, getCurrentUser } from '@/lib/auth';
import { getUserOrNull } from '@/lib/account';
import { getUsersCollection } from '@/lib/db';

/**
 * Manage Profile writes.
 *
 * Only the display name is editable here. The email address is the identity the account
 * was created with and every security notice is keyed to it, and the username is the
 * second sign-in credential — changing either silently would break a sign-in the person
 * is already relying on, so both stay read-only in the UI.
 *
 * The session cookie is re-issued with the new name so the header chip stops showing the
 * old one on the very next navigation rather than at the next sign-in.
 */
export async function PATCH(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'You need to be signed in.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String((body as { name?: unknown })?.name ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json(
      { ok: false, error: 'Please use a name between 2 and 80 characters.' },
      { status: 400 }
    );
  }

  const users = await getUsersCollection();
  await users.updateOne({ email: session.email }, { $set: { name, updatedAt: new Date() } });

  const account = await getUserOrNull(session.email);
  const response = NextResponse.json({
    ok: true,
    message: 'Profile name updated.',
    user: {
      id: account?.id || session.id,
      email: account?.email || session.email,
      name,
      username: account?.username || '',
      createdAt:
        account?.createdAt instanceof Date ? account.createdAt.toISOString() : (account?.createdAt as string | undefined),
    },
  });

  attachSession(response, { id: session.id, email: session.email, name });
  return response;
}

export const dynamic = 'force-dynamic';
