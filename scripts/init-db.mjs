/**
 * Create the collections' indexes. Safe to run against a live database at any time.
 *
 *   node scripts/init-db.mjs
 *
 * Reads MONGODB_URI / MONGODB_DB from the environment (or .env.local) exactly like the
 * application does. It creates indexes and nothing else: it never drops a database, never
 * deletes documents, and it holds no credentials of its own.
 */
import fs from 'node:fs';
import { MongoClient } from 'mongodb';

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const uri = (process.env.MONGODB_URI || '').trim().replace(/^["']|["']$/g, '');
if (!uri) {
  console.error('MONGODB_URI is not set. Add it to the environment or .env.local first.');
  process.exitCode = 1;
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || 'auth_db';

/** collection → list of [keys, options] that must exist. */
const INDEXES = {
  users: [
    [{ email: 1 }, { unique: true, name: 'email_unique' }],
    [{ username: 1 }, { unique: true, sparse: true, name: 'username_unique' }],
    [{ googleId: 1 }, { sparse: true, name: 'googleId_sparse' }],
  ],
  password_resets: [
    [{ tokenHash: 1 }, { unique: true, name: 'tokenHash_unique' }],
    [{ userId: 1, createdAt: -1 }, { name: 'user_created' }],
  ],
  session_logs: [
    [{ userId: 1 }, { name: 'userId' }],
    [{ createdAt: -1 }, { name: 'createdAt_desc' }],
  ],
  pds_projects: [
    [{ userId: 1, lastModified: -1 }, { name: 'user_recent' }],
  ],
  job_bookmarks: [
    [{ userId: 1 }, { name: 'userId' }],
    [{ userId: 1, jobId: 1 }, { unique: true, name: 'user_job_unique' }],
  ],
  user_notifications: [
    [{ userId: 1, createdAt: -1 }, { name: 'user_recent' }],
    [{ userId: 1, id: 1 }, { unique: true, name: 'user_notification_unique' }],
  ],
  job_alert_subscriptions: [
    [{ userId: 1, agency: 1 }, { unique: true, name: 'user_agency_unique' }],
  ],
};

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

try {
  await client.connect();
  const db = client.db(dbName);
  console.log(`Connected. Initialising indexes in "${dbName}"…`);

  for (const [collection, wanted] of Object.entries(INDEXES)) {
    for (const [keys, options] of wanted) {
      try {
        await db.collection(collection).createIndex(keys, options);
        console.log(`  ✓ ${collection} · ${options.name}`);
      } catch (error) {
        // A unique index can legitimately fail if older duplicate rows exist; report it
        // rather than aborting the whole run.
        console.warn(`  ! ${collection} · ${options.name} — ${error.message}`);
      }
    }
  }

  console.log('Done. No documents were modified.');
} finally {
  await client.close();
}
