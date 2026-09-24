/**
 * End-to-end verification of the account system against a real running server and a real
 * database.
 *
 *   npm run build && npm run start -- -p 3000
 *   npx tsx scripts/verify-account-flows.ts
 *
 * It signs a throwaway account up, drives every sign-in path (username, email, Google
 * entry point, authenticator app, backup code, forgot/reset, password change), checks the
 * Site Updates & Patch Notes notification, then opens MongoDB directly to prove the rows
 * really exist — and finally deletes everything it created.
 *
 * Point it at another port with QA_BASE, and at another server log with QA_SERVER_LOG.
 */
import fs from 'node:fs';
import { MongoClient } from 'mongodb';
import { currentTotpCode } from '../src/lib/totp';

const BASE = process.env.QA_BASE || 'http://127.0.0.1:3000';
const SERVER_LOG = process.env.QA_SERVER_LOG || 'tmp/qa/server.log';

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

let passed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function cookieFrom(res: Response): string {
  const header = res.headers as unknown as { getSetCookie?: () => string[] };
  const raw = typeof header.getSetCookie === 'function' ? header.getSetCookie() : [res.headers.get('set-cookie') || ''];
  return raw.filter(Boolean).map(c => c.split(';')[0]).join('; ');
}

async function post(path: string, body: unknown, cookie?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const stamp = Date.now().toString(36);
const email = `qa.${stamp}@careerform.test`;
const username = `qa${stamp}`;
const password = 'QaTest1234!';
const newPassword = 'QaTest5678!';

async function main() {
  console.log(`\n=== CareerForm PH account verification (${BASE}) ===\n`);

  // ---------------------------------------------------------------- pages
  console.log('Pages & markup');
  const homeRes = await fetch(`${BASE}/`);
  const home = await homeRes.text();
  check('GET / returns 200', homeRes.status === 200);
  check('home renders the new logo mark', home.includes('careerform-logo'));
  check('home carries the “what a free account gets you” column', home.includes('What a free account gets you'));
  check('no GitHub links remain in the home page', !/github\.com/i.test(home));
  check('no database vendor branding in the home page', !/mongodb|atlas/i.test(home));

  for (const route of ['/jobs', '/dashboard', '/builder', '/coverletter', '/reset-password', '/about', '/contact']) {
    const res = await fetch(`${BASE}${route}`);
    check(`GET ${route} returns 200`, res.status === 200, `status ${res.status}`);
  }
  check('/jobs shows the brand mark', (await fetch(`${BASE}/jobs`).then(r => r.text())).includes('careerform-logo'));

  // ---------------------------------------------------------------- headers
  console.log('\nSecurity headers');
  const apiHeaders = (await fetch(`${BASE}/api/auth/me`)).headers;
  check('X-Content-Type-Options: nosniff', apiHeaders.get('x-content-type-options') === 'nosniff');
  check('X-Frame-Options set', Boolean(apiHeaders.get('x-frame-options')));
  check('API responses are no-store', (apiHeaders.get('cache-control') || '').includes('no-store'));
  check('API does not advertise the server stack', !apiHeaders.get('x-powered-by'));

  // ---------------------------------------------------------------- signup
  console.log('\nSign-up (username + confirmed password)');
  const shortPw = await post('/api/auth/signup', { name: 'QA Applicant', username, email, password: 'short', confirmPassword: 'short' });
  check('weak password is rejected', shortPw.res.status === 400);

  const mismatch = await post('/api/auth/signup', { name: 'QA Applicant', username, email, password, confirmPassword: 'Different123!' });
  check('mismatched confirmation is rejected', mismatch.res.status === 400);

  const badUser = await post('/api/auth/signup', { name: 'QA Applicant', username: 'no', email, password, confirmPassword: password });
  check('invalid username is rejected', badUser.res.status === 400);

  const signup = await post('/api/auth/signup', { name: 'QA Applicant', username, email, password, confirmPassword: password });
  check('valid sign-up is accepted', signup.res.ok, JSON.stringify(signup.data).slice(0, 160));
  const cookie = cookieFrom(signup.res);
  check(
    'sign-up sets an HttpOnly session cookie',
    /pds_auth_token/.test(cookie) && /HttpOnly/i.test(signup.res.headers.get('set-cookie') || '')
  );

  const dupe = await post('/api/auth/signup', { name: 'QA Applicant', username: `${username}x`, email, password, confirmPassword: password });
  check('duplicate email is rejected', dupe.res.status === 409);

  const dupeUser = await post('/api/auth/signup', { name: 'QA Applicant', username, email: `other.${stamp}@careerform.test`, password, confirmPassword: password });
  check('duplicate username is rejected', dupeUser.res.status === 409);

  // ---------------------------------------------------------------- patch notes notification
  console.log('\nSite Updates & Patch Notes reach the bell');
  const notif1 = await fetch(`${BASE}/api/notifications`, { headers: { cookie } }).then(r => r.json());
  const patchTitles = (notif1.notifications || []).filter((n: any) => String(n.title).includes('Site Updates & Patch Notes'));
  check('a signed-in account receives the patch-notes notification', patchTitles.length >= 1, `got ${patchTitles.length}`);
  check('the newest release is the one delivered', patchTitles.some((n: any) => String(n.title).includes('v2.1.0')));
  check('unread badge count is reported', typeof notif1.unread === 'number' && notif1.unread >= 1);
  const notif2 = await fetch(`${BASE}/api/notifications`, { headers: { cookie } }).then(r => r.json());
  check(
    'reloading does not duplicate the notification',
    (notif2.notifications || []).filter((n: any) => String(n.title).includes('v2.1.0')).length ===
      patchTitles.filter((n: any) => String(n.title).includes('v2.1.0')).length
  );

  // ---------------------------------------------------------------- signin
  console.log('\nSign-in by username or email');
  const byUsername = await post('/api/auth/signin', { identifier: username, password });
  check('sign in with the username', byUsername.res.ok && byUsername.data?.user?.email === email);
  const byEmail = await post('/api/auth/signin', { identifier: email, password });
  check('sign in with the email address', byEmail.res.ok);
  const wrongPw = await post('/api/auth/signin', { identifier: email, password: 'WrongPass123!' });
  check('wrong password is refused', wrongPw.res.status === 401);
  const ghost = await post('/api/auth/signin', { identifier: 'nobody-here', password });
  check('unknown account is refused', ghost.res.status === 401);

  const me = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } }).then(r => r.json());
  check('/api/auth/me returns the signed-in account', me.ok === true && me.user.email === email);
  check('API is scoped to the session (anonymous list is refused)', (await fetch(`${BASE}/api/projects`)).status === 401);

  // ---------------------------------------------------------------- authenticator
  console.log('\nAuthenticator app (2FA)');
  const setup = await post('/api/auth/totp', { action: 'setup' }, cookie);
  check('setup returns a secret, an otpauth URI and a QR image', Boolean(setup.data.secret && setup.data.otpauth && String(setup.data.qr).startsWith('data:image/png')));
  check('otpauth URI is scannable by standard apps', String(setup.data.otpauth).startsWith('otpauth://totp/') && String(setup.data.otpauth).includes('issuer=CareerForm'));

  const badCode = await post('/api/auth/totp', { action: 'enable', code: '000000' }, cookie);
  check('a wrong code cannot enable 2FA', badCode.res.status === 400);

  const secret: string = setup.data.secret;
  const enabled = await post('/api/auth/totp', { action: 'enable', code: currentTotpCode(secret) }, cookie);
  check('a live code enables 2FA', enabled.res.ok, JSON.stringify(enabled.data).slice(0, 160));
  check('ten backup codes are issued once', (enabled.data.backupCodes || []).length === 10);

  const noCode = await post('/api/auth/signin', { identifier: email, password });
  check('sign-in now demands the second factor', noCode.res.status === 401 && noCode.data.requires2fa === true);
  check('password + authenticator code signs in', (await post('/api/auth/signin', { identifier: email, password, code: currentTotpCode(secret) })).res.ok);

  const backup = enabled.data.backupCodes[0];
  check('a backup code signs in', (await post('/api/auth/signin', { identifier: email, password, code: backup })).res.ok);
  check('the backup code cannot be reused', (await post('/api/auth/signin', { identifier: email, password, code: backup })).res.status === 401);

  // ---------------------------------------------------------------- forgot / reset
  console.log('\nForgot password & reset link');
  const forgot = await post('/api/auth/forgot', { identifier: email });
  check('reset request is accepted', forgot.res.ok);

  // With a mail provider configured the link exists only in the inbox. Without one,
  // production logs it to the server console and development also returns it — accept
  // either source so the check works in both deployment shapes.
  let link: string = forgot.data.devResetLink || '';
  if (!link && fs.existsSync(SERVER_LOG)) {
    const hits = fs
      .readFileSync(SERVER_LOG, 'utf8')
      .split('\n')
      .filter(l => l.includes(`password reset link for ${email}`));
    link = ((hits[hits.length - 1] || '').match(/https?:\/\/[^\s]+/) || [''])[0] || '';
  }
  check('a single-use reset link is produced', link.includes('/reset-password?token='), link.slice(0, 80));
  const token = link.split('token=')[1] || '';

  check('reset refuses a weak password', (await post('/api/auth/reset', { token, password: 'weak', confirmPassword: 'weak' })).res.status === 400);
  check('reset refuses a forged token', (await post('/api/auth/reset', { token: 'not-a-real-token', password: newPassword, confirmPassword: newPassword })).res.status === 400);
  check('reset accepts the valid token', (await post('/api/auth/reset', { token, password: newPassword, confirmPassword: newPassword })).res.ok);
  check('the reset token cannot be replayed', (await post('/api/auth/reset', { token, password: 'Another1234!', confirmPassword: 'Another1234!' })).res.status === 400);

  check('the new password works (with the authenticator)', (await post('/api/auth/signin', { identifier: email, password: newPassword, code: currentTotpCode(secret) })).res.ok);
  check('the old password no longer works', (await post('/api/auth/signin', { identifier: email, password, code: currentTotpCode(secret) })).res.status === 401);

  const unknownForgot = await post('/api/auth/forgot', { identifier: 'nobody@careerform.test' });
  check('unknown address does not reveal itself (same response)', unknownForgot.res.ok && !unknownForgot.data.devResetLink);

  // ---------------------------------------------------------------- account & security
  console.log('\nAccount & Security');
  const security = await fetch(`${BASE}/api/auth/security`, { headers: { cookie } }).then(r => r.json());
  check(
    'security status reports username, password, Google and authenticator',
    security.ok && security.account.username === username && security.account.hasPassword === true && security.account.totpEnabled === true,
    JSON.stringify(security.account)
  );
  check('security status never exposes a hash or secret', !JSON.stringify(security).includes('passwordHash') && !JSON.stringify(security).includes('"secret"'));

  const wrongCurrent = await post('/api/auth/password', { currentPassword: 'Nope1234!', newPassword: 'Final1234!', confirmPassword: 'Final1234!' }, cookie);
  check('changing the password requires the current one', wrongCurrent.res.status === 401);
  check('password change succeeds', (await post('/api/auth/password', { currentPassword: newPassword, newPassword: 'Final1234!', confirmPassword: 'Final1234!' }, cookie)).res.ok);
  check('the changed password signs in', (await post('/api/auth/signin', { identifier: email, password: 'Final1234!', code: currentTotpCode(secret) })).res.ok);

  check('authenticator can be removed with a live code', (await post('/api/auth/totp', { action: 'disable', code: currentTotpCode(secret) }, cookie)).res.ok);
  check('password alone signs in once 2FA is off', (await post('/api/auth/signin', { identifier: email, password: 'Final1234!' })).res.ok);

  // ---------------------------------------------------------------- google
  console.log('\nGoogle sign-in');
  const google = await fetch(`${BASE}/api/auth/google?mode=signin`, { redirect: 'manual' });
  const location = google.headers.get('location') || '';
  check(
    'Google entry point redirects (to Google when configured, with a clear notice when not)',
    google.status >= 300 && google.status < 400 && (location.includes('accounts.google.com') || location.includes('authError=google_unconfigured')),
    `status ${google.status} → ${location.slice(0, 90)}`
  );
  const callback = await fetch(`${BASE}/api/auth/google/callback?code=fake&state=forged`, { redirect: 'manual' });
  check('a forged OAuth callback is refused', (callback.headers.get('location') || '').includes('authError=google'));

  // ------------------------------------------------- dashboard guard, profile & session
  console.log('\nDashboard guard, profile & session');

  const anonDashboard = await fetch(`${BASE}/dashboard`, { redirect: 'manual' });
  const anonBody = anonDashboard.status >= 300 ? '' : await anonDashboard.text();
  const anonBounce = anonDashboard.headers.get('location') || '';
  check(
    'a signed-out visitor cannot open /dashboard',
    (anonDashboard.status >= 300 && anonDashboard.status < 400 && anonBounce.includes('action=signin')) ||
      anonBody.includes('action=signin'),
    `status ${anonDashboard.status} → ${anonBounce.slice(0, 80)}`
  );
  check(
    'no dashboard markup reaches a signed-out request',
    !anonBody.includes('dash-rail') && !anonBody.includes('Manage Profile')
  );

  const signedInDashboard = await fetch(`${BASE}/dashboard`, { headers: { cookie }, redirect: 'manual' });
  check('the same route opens for the signed-in account', signedInDashboard.status === 200, `status ${signedInDashboard.status}`);

  const mePayload = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } }).then(r => r.json());
  check('me reports the username chosen at sign-up', mePayload?.user?.username === username);
  check(
    'me reports a real join date for “Member since”',
    typeof mePayload?.user?.createdAt === 'string' && !Number.isNaN(Date.parse(mePayload.user.createdAt)),
    String(mePayload?.user?.createdAt)
  );

  const patch = (body: unknown, withCookie = true) =>
    fetch(`${BASE}/api/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(withCookie ? { cookie } : {}) },
      body: JSON.stringify(body),
      redirect: 'manual',
    });

  check('an anonymous profile rename is refused', (await patch({ name: 'Intruder' }, false)).status === 401);
  check('a one-character profile name is refused', (await patch({ name: 'A' })).status === 400);

  const renamed = await patch({ name: 'QA Renamed Applicant' });
  const renamedData = await renamed.json().catch(() => ({}));
  check('a valid profile rename is accepted', renamed.ok && renamedData?.user?.name === 'QA Renamed Applicant');
  check(
    'the rename re-issues the session cookie',
    /pds_auth_token=/.test(cookieFrom(renamed)) && cookieFrom(renamed) !== cookie,
    cookieFrom(renamed).slice(0, 24)
  );
  check(
    'the renamed profile is what /api/auth/me now reports',
    (await fetch(`${BASE}/api/auth/me`, { headers: { cookie: cookieFrom(renamed) } }).then(r => r.json()))?.user?.name ===
      'QA Renamed Applicant'
  );

  // ---------------------------------------------------------------- database truth
  console.log('\nData really is in MongoDB');
  const client = new MongoClient(process.env.MONGODB_URI as string, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'auth_db');

  const storedUser = await db.collection('users').findOne({ email });
  const userId = storedUser?._id?.toString();
  check('the account document exists', Boolean(storedUser));
  check('the username is stored on the account', storedUser?.username === username);
  check('the profile rename reached the database', storedUser?.name === 'QA Renamed Applicant');
  check('the join date is a real stored date', storedUser?.createdAt instanceof Date);
  check('no plaintext password is stored', Boolean(storedUser?.passwordHash) && !JSON.stringify(storedUser).includes('Final1234!'));
  check('the authenticator removal is persisted', !storedUser?.totp);

  const storedNotifs = await db.collection('user_notifications').find({ userId }).toArray();
  check('the patch-notes notification is a real row', storedNotifs.some(n => String(n.title).includes('Site Updates & Patch Notes')));
  check(
    'the notification feed carries no duplicate patch rows',
    new Set(storedNotifs.filter(n => String(n.title).includes('v2.1.0')).map(n => n.id)).size ===
      storedNotifs.filter(n => String(n.title).includes('v2.1.0')).length
  );
  check('sign-ins are logged', (await db.collection('session_logs').find({ email }).toArray()).length >= 3);

  // ---------------------------------------------------------------- cleanup
  console.log('\nCleanup');
  const cleanup: Record<string, number> = {};
  for (const [name, filter] of [
    ['users', { email }],
    ['user_notifications', { userId }],
    ['job_alerts', { userId }],
    ['job_bookmarks', { userId }],
    ['pds_projects', { userId }],
    ['password_resets', { email }],
    ['session_logs', { email }],
  ] as const) {
    const r = await db.collection(name).deleteMany(filter as never);
    cleanup[name] = r.deletedCount || 0;
  }
  console.log('  removed:', JSON.stringify(cleanup));
  check('the test account was removed from the database', (await db.collection('users').countDocuments({ email })) === 0);
  await client.close();

  // The cookie is still inside its 30-day life, but the account it names is gone. That
  // session must not keep opening the dashboard or describing a user who no longer exists.
  const ghostDashboard = await fetch(`${BASE}/dashboard`, { headers: { cookie }, redirect: 'manual' });
  check(
    'a session whose account was deleted cannot open /dashboard',
    ghostDashboard.status >= 300 && ghostDashboard.status < 400,
    `status ${ghostDashboard.status}`
  );
  const ghostMe = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } }).then(r => r.json());
  check('the deleted account’s session reports no user', ghostMe.ok === false && ghostMe.user === null, JSON.stringify(ghostMe).slice(0, 120));

  check('sign out succeeds', (await fetch(`${BASE}/api/auth/signout`, { method: 'POST', headers: { cookie } })).ok);
  check(
    'the cleared cookie expires rather than lingering',
    /pds_auth_token=;/.test(
      (await fetch(`${BASE}/api/auth/signout`, { method: 'POST', headers: { cookie } })).headers.get('set-cookie') || ''
    )
  );

  console.log(`\n=== ${passed} checks passed, ${failures.length} failed ===`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(` - ${f}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('\nVerification crashed:', err);
  process.exitCode = 1;
});
