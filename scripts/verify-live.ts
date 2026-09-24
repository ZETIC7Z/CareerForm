/**
 * Post-deploy smoke test against the LIVE deployment.
 *
 *   npm run verify:live
 *   LIVE_BASE=https://careerform-ph.vercel.app npm run verify:live
 *
 * `verify:accounts` proves the account system against a server you are running yourself;
 * this proves the one you actually shipped. It signs a throwaway account up through the
 * public API, confirms the session it issues verifies (which is what catches a missing or
 * mismatched JWT_SECRET in the host's environment), walks the dashboard guard, renames the
 * profile, signs out, and checks that a deleted account's token stops working. That token
 * also shows the honest limit of stateless sessions: signing out clears the browser's
 * cookie, but only deleting the account revokes a token someone has already copied.
 *
 * It deletes every row it created, so it is safe to run against production.
 */
import fs from 'node:fs';
import { MongoClient } from 'mongodb';

const BASE = process.env.LIVE_BASE || 'https://careerform-ph.vercel.app';

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

let pass = 0;
const fail: string[] = [];
const check = (label: string, ok: boolean, detail = '') => {
  if (ok) {
    pass += 1;
    console.log(`  ✓ ${label}`);
  } else {
    fail.push(label);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const stamp = Date.now().toString(36);
const email = `live.${stamp}@careerform.test`;
const username = `live${stamp}`;
const password = 'LiveCheck1234!';

const cookies = (res: Response) =>
  (typeof (res.headers as any).getSetCookie === 'function'
    ? (res.headers as any).getSetCookie()
    : [res.headers.get('set-cookie') || ''])
    .filter(Boolean)
    .map((c: string) => c.split(';')[0])
    .join('; ');

async function main() {
  console.log(`\n=== Live check: ${BASE} ===\n`);

  const signup = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Live Check', username, email, password, confirmPassword: password }),
  });
  const signupData = await signup.json().catch(() => ({}));
  check(
    'sign-up works in production',
    signup.ok && signupData?.ok === true,
    `status ${signup.status} ${JSON.stringify(signupData).slice(0, 120)}`
  );
  const cookie = cookies(signup);
  check('a session cookie is issued', /pds_auth_token=/.test(cookie));

  const me = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } }).then(r => r.json());
  check(
    'the production session verifies (JWT_SECRET is configured)',
    me?.ok === true && me?.user?.email === email,
    JSON.stringify(me).slice(0, 140)
  );
  check('me carries the username chosen at sign-up', me?.user?.username === username);
  check('me carries a real join date', !Number.isNaN(Date.parse(me?.user?.createdAt || '')));

  const anon = await fetch(`${BASE}/dashboard`, { redirect: 'manual' });
  check('a signed-out visitor is redirected off /dashboard', anon.status >= 300 && anon.status < 400, `status ${anon.status}`);

  const signedIn = await fetch(`${BASE}/dashboard`, { headers: { cookie }, redirect: 'manual' });
  check('the signed-in visitor gets the dashboard', signedIn.status === 200, `status ${signedIn.status}`);

  const security = await fetch(`${BASE}/api/auth/security`, { headers: { cookie } }).then(r => r.json());
  check('Account & Security reports the sign-up email', security?.account?.email === email, JSON.stringify(security).slice(0, 120));
  check('Account & Security reports the username', security?.account?.username === username);
  check('Account & Security reports a member-since date', Boolean(security?.account?.createdAt));

  const renamed = await fetch(`${BASE}/api/auth/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ name: 'Live Renamed' }),
  });
  const renamedData = await renamed.json().catch(() => ({}));
  check('a profile rename is accepted in production', renamed.ok && renamedData?.user?.name === 'Live Renamed');

  const out = await fetch(`${BASE}/api/auth/signout`, { method: 'POST', headers: { cookie } });
  check('sign-out succeeds', out.ok);
  const cleared = ((out.headers as any).getSetCookie?.() || [out.headers.get('set-cookie') || '']).join(' ');
  check('the session cookie is expired, not left behind', /pds_auth_token=;/.test(cleared), cleared.slice(0, 80));

  // Signed out means the browser holds nothing, so this is the state a real visitor is in.
  const afterOut = await fetch(`${BASE}/dashboard`, { redirect: 'manual' });
  check('a signed-out visitor cannot open /dashboard', afterOut.status >= 300 && afterOut.status < 400, `status ${afterOut.status}`);

  console.log('\nCleanup');
  const client = new MongoClient(process.env.MONGODB_URI as string, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'auth_db');
  const found = await db.collection('users').findOne({ email });
  check('the test account reached production MongoDB', Boolean(found));
  check('the renamed profile is what production stored', found?.name === 'Live Renamed');
  const userId = found?._id?.toString();

  // Deleting the account is what actually revokes a session server-side: sessions are
  // stateless signed tokens, so the only way to invalidate one is to make its subject stop
  // existing. Proven here with a token that was valid moments ago.
  await db.collection('users').deleteMany({ email } as never);
  const ghost = await fetch(`${BASE}/dashboard`, { headers: { cookie }, redirect: 'manual' });
  check('a token whose account was deleted cannot open /dashboard', ghost.status >= 300 && ghost.status < 400, `status ${ghost.status}`);
  const ghostMe = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } }).then(r => r.json());
  check('a token whose account was deleted reports no user', ghostMe?.ok === false && ghostMe?.user === null);

  for (const [name, filter] of [
    ['user_notifications', { userId }],
    ['pds_projects', { userId }],
    ['job_bookmarks', { userId }],
    ['job_alerts', { userId }],
    ['session_logs', { email }],
  ] as const) {
    await db.collection(name).deleteMany(filter as never);
  }
  check('the test account was removed', (await db.collection('users').countDocuments({ email })) === 0);
  await client.close();

  console.log(`\n=== ${pass} checks passed, ${fail.length} failed ===`);
  if (fail.length) {
    console.log('Failures:\n' + fail.map(f => ` - ${f}`).join('\n'));
    process.exitCode = 1;
  }
}

main().catch(e => {
  console.error('Live check crashed:', e);
  process.exitCode = 1;
});
