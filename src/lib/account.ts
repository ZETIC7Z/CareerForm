import { ObjectId } from 'mongodb';
import { getUsersCollection, pushNotification, type UserDoc } from './db';
import { normaliseUsername } from './auth';
import { sendSecurityAlertEmail } from './mailer';

/**
 * The account record as the API layer wants it: the Mongo document plus the string id
 * the session token carries.
 */
export interface AccountUser extends UserDoc {
  id: string;
}

function toAccount(doc: UserDoc & { _id?: ObjectId }): AccountUser | null {
  if (!doc?._id) return null;
  return { ...doc, id: doc._id.toString() };
}

/** Look an account up by email OR username — the same either/or the sign-in form accepts. */
export async function getUserOrNull(identifier: string): Promise<AccountUser | null> {
  const users = await getUsersCollection();
  const email = (identifier || '').trim().toLowerCase();
  const username = normaliseUsername(identifier);

  let doc = email ? ((await users.findOne({ email })) as (UserDoc & { _id?: ObjectId }) | null) : null;
  if (!doc && username) doc = (await users.findOne({ username })) as (UserDoc & { _id?: ObjectId }) | null;
  return doc ? toAccount(doc) : null;
}

export async function findUserById(id: string): Promise<AccountUser | null> {
  if (!ObjectId.isValid(id)) return null;
  const users = await getUsersCollection();
  const doc = (await users.findOne({ _id: new ObjectId(id) })) as (UserDoc & { _id?: ObjectId }) | null;
  return doc ? toAccount(doc) : null;
}

export async function findUserByEmail(email: string): Promise<AccountUser | null> {
  const users = await getUsersCollection();
  const doc = (await users.findOne({ email: (email || '').trim().toLowerCase() })) as
    | (UserDoc & { _id?: ObjectId })
    | null;
  return doc ? toAccount(doc) : null;
}

/**
 * Pick a username nobody has claimed yet. Used when an account arrives from Google and
 * has never chosen one, and when a hand-made username collides.
 */
export async function uniqueUsername(seed: string): Promise<string> {
  const users = await getUsersCollection();
  const base = normaliseUsername(seed).slice(0, 20) || 'applicant';
  let candidate = base.length >= 3 ? base : `${base}user`.slice(0, 20);
  for (let i = 0; i < 25; i += 1) {
    const taken = await users.findOne({ username: candidate });
    if (!taken) return candidate;
    candidate = `${base}${Math.floor(100 + Math.random() * 900)}`.slice(0, 24);
  }
  return `applicant${Date.now().toString(36).slice(-6)}`;
}

/**
 * Security notice, by bell and by mailbox (never fails the request that caused it).
 *
 * The bell only reaches someone who is already signed in and looking, which is exactly
 * the person who does not need to be told. The email is for the other case — a password
 * changed at 3am by someone who is not the account holder — so both are sent for the same
 * event and the mail is deliberately not awaited.
 */
export async function notifySecurity(
  userId: string,
  title: string,
  body: string,
  href = '/dashboard?tab=security'
): Promise<void> {
  await pushNotification(userId, { type: 'system', title, body, href, read: false });
  const user = await findUserById(userId).catch(() => null);
  if (user) void sendSecurityAlertEmail(user.email, user.name, title, body);
}

/**
 * Give an account the Site Updates & Patch Notes digest exactly once per published
 * release. Deterministic notification ids make this idempotent, so it is safe to call on
 * every dashboard load: existing rows are simply skipped.
 */
export async function ensurePatchNotifications(
  userId: string,
  notes: { id: string; title: string; version: string; date: string }[]
): Promise<number> {
  if (!notes.length) return 0;
  const { getNotificationsCollection } = await import('./db');
  const col = await getNotificationsCollection();
  const ids = notes.map(n => `ntf_patch_${n.id}`);
  const existing = await col.find({ userId, id: { $in: ids } }).toArray();
  const have = new Set(existing.map(n => n.id));

  const fresh = notes.filter(n => !have.has(`ntf_patch_${n.id}`));
  if (!fresh.length) return 0;

  await col.insertMany(
    fresh.map(n => ({
      id: `ntf_patch_${n.id}`,
      userId,
      type: 'system' as const,
      title: `Site Updates & Patch Notes — ${n.version}`,
      body: `${n.title}. ${n.date} — tap to read everything that changed.`,
      href: '/#toolkit-and-updates',
      read: false,
      createdAt: new Date().toISOString(),
    }))
  );
  return fresh.length;
}
