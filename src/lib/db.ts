import { MongoClient, Db, Collection, Document, ObjectId } from 'mongodb';

/**
 * Connection is resolved from the server environment ONLY.
 *
 * The connection string used to be inlined here as a fallback. Because this file is
 * committed, that put the production database credentials in a public repository —
 * anyone reading the source could connect directly and bypass every API guard. The
 * fallback is gone on purpose: set MONGODB_URI (and optionally MONGODB_DB) in the
 * host's environment settings, or in `.env.local` for local development.
 */
function resolveUri(): string {
  const raw = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
  if (!raw) {
    throw new Error(
      'MONGODB_URI is not configured. Add it to the environment (see README → Environment) before starting the server.'
    );
  }
  if (!raw.startsWith('mongodb://') && !raw.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must be a valid mongodb:// or mongodb+srv:// connection string.');
  }
  return raw;
}

const dbName = (process.env.MONGODB_DB || 'auth_db').trim();

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = resolveUri();

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

/**
 * A CareerForm account.
 *
 * `username` may be absent on documents created before usernames existed, so every
 * reader has to tolerate that; `passwordHash` is absent on Google-only accounts, which
 * is exactly how "this account has no password yet" is detected.
 */
export interface UserDoc {
  _id?: ObjectId;
  name: string;
  email: string;
  username?: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  totp?: { secret: string; enabled: boolean; backupCodes: string[] };
  createdAt: Date;
  updatedAt: Date;
}

/** A single-use password reset token. Only the SHA-256 hash of the token is stored. */
export interface PasswordResetDoc {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface PDSProject {
  id: string;
  userId: string;
  title: string;
  description?: string;
  data: any;
  completionRate?: number;
  lastModified: string;
  createdAt: string;
  isFavorite?: boolean;
  kind?: 'pds' | 'cover-letter';
}

/** A job a signed-in user starred from the Government Jobs board. */
export interface JobBookmark {
  id: string;
  userId: string;
  jobId: string;
  job: Document;
  createdAt: string;
}

/** An in-app notification rendered under the dashboard bell. */
export interface UserNotification {
  id: string;
  userId: string;
  type: 'job' | 'system' | 'sync' | 'bookmark' | 'alert';
  title: string;
  body: string;
  href?: string;
  jobId?: string;
  read: boolean;
  createdAt: string;
}

/** A standing "notify me when this agency posts" subscription. */
export interface JobAlertSubscription {
  id: string;
  userId: string;
  agency: string;
  agencyAcronym: string;
  createdAt: string;
}

/**
 * The project shape the browser is allowed to see. Mongo's internal `_id` and the owning
 * `userId` stay server-side: nothing in the UI needs them, and publishing them would let
 * anyone reading DevTools enumerate accounts and document ownership.
 */
export type PublicProject = Omit<PDSProject, 'userId'>;

export function toPublicProject(p: PDSProject): PublicProject {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    data: p.data,
    completionRate: p.completionRate ?? 0,
    lastModified: p.lastModified,
    createdAt: p.createdAt,
    isFavorite: p.isFavorite ?? false,
    kind: p.kind ?? 'pds',
  };
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const db = await getDb();
  return db.collection<UserDoc>('users');
}

export async function getPasswordResetsCollection(): Promise<Collection<PasswordResetDoc>> {
  const db = await getDb();
  return db.collection<PasswordResetDoc>('password_resets');
}

export async function getProjectsCollection(): Promise<Collection<PDSProject>> {
  const db = await getDb();
  return db.collection<PDSProject>('pds_projects');
}

export async function getBookmarksCollection(): Promise<Collection<JobBookmark>> {
  const db = await getDb();
  return db.collection<JobBookmark>('job_bookmarks');
}

export async function getNotificationsCollection(): Promise<Collection<UserNotification>> {
  const db = await getDb();
  return db.collection<UserNotification>('user_notifications');
}

export async function getJobAlertsCollection(): Promise<Collection<JobAlertSubscription>> {
  const db = await getDb();
  return db.collection<JobAlertSubscription>('job_alert_subscriptions');
}

/** Queue one notification for a user. Never throws into the caller's request path. */
export async function pushNotification(
  userId: string,
  payload: Omit<UserNotification, 'id' | 'userId' | 'read' | 'createdAt'> & { read?: boolean }
): Promise<void> {
  try {
    const col = await getNotificationsCollection();
    await col.insertOne({
      id: 'ntf_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36),
      userId,
      read: payload.read ?? false,
      createdAt: new Date().toISOString(),
      type: payload.type,
      title: payload.title,
      body: payload.body,
      href: payload.href,
      jobId: payload.jobId,
    });
  } catch {
    /* a missing notification must never fail the action that triggered it */
  }
}
