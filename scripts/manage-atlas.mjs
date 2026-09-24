/**
 * Ops-only helper: create or update the MongoDB Atlas database user that the site
 * connects with.
 *
 *   ATLAS_PUBLIC_KEY=... ATLAS_PRIVATE_KEY=... ATLAS_GROUP_ID=... \
 *   ATLAS_DB_PASSWORD=... node scripts/manage-atlas.mjs
 *
 * Nothing here is hardcoded. This file used to carry the Atlas API key pair, the Atlas
 * group id and the production database password as literals in a committed file — which
 * put the keys to the production cluster in the repository, and in its history. Every
 * value is read from the environment now, and the script refuses to run without them,
 * because the failure mode of a missing variable should be a clear error rather than a
 * silent attempt to change the wrong cluster.
 *
 * The database password can also be read straight out of MONGODB_URI, so an operator who
 * already has the connection string does not have to paste the password twice.
 */
import https from 'node:https';
import crypto from 'node:crypto';

function required(name) {
  const value = (process.env[name] || '').trim();
  if (!value) {
    console.error(`Missing ${name}. Nothing was changed.`);
    console.error('See the header of this file for the variables it needs.');
    process.exit(1);
  }
  return value;
}

/** Pull `user:password` out of a mongodb:// or mongodb+srv:// connection string. */
function credentialsFromUri(uri) {
  try {
    const url = new URL(uri);
    return {
      username: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
    };
  } catch {
    return { username: '', password: '' };
  }
}

export async function digestFetch(url, options = {}) {
  const publicKey = required('ATLAS_PUBLIC_KEY');
  const privateKey = required('ATLAS_PRIVATE_KEY');
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req1 = https.request(url, { method: options.method || 'GET' }, (res1) => {
      if (res1.statusCode !== 401 || !res1.headers['www-authenticate']) {
        let data = '';
        res1.on('data', chunk => (data += chunk));
        res1.on('end', () => resolve({ status: res1.statusCode, data }));
        return;
      }

      const authHeader = res1.headers['www-authenticate'];
      const realm = (authHeader.match(/realm="([^"]+)"/) || [])[1] || '';
      const nonce = (authHeader.match(/nonce="([^"]+)"/) || [])[1] || '';
      const qop = (authHeader.match(/qop="([^"]+)"/) || [])[1] || '';
      const method = options.method || 'GET';
      const uri = parsedUrl.pathname + parsedUrl.search;

      const ha1 = crypto.createHash('md5').update(`${publicKey}:${realm}:${privateKey}`).digest('hex');
      const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
      const nc = '00000001';
      const cnonce = crypto.randomBytes(8).toString('hex');

      const response = qop
        ? crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex')
        : crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');

      let authVal = `Digest username="${publicKey}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
      if (qop) authVal += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;

      const headers = {
        ...options.headers,
        Authorization: authVal,
        Accept: 'application/vnd.atlas.2023-01-01+json, application/json',
      };
      if (options.body) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(options.body);
      }

      const req2 = https.request(url, { method, headers }, (res2) => {
        let data2 = '';
        res2.on('data', chunk => (data2 += chunk));
        res2.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data2);
          } catch {
            parsed = data2;
          }
          resolve({ status: res2.statusCode, data: parsed });
        });
      });
      req2.on('error', reject);
      if (options.body) req2.write(options.body);
      req2.end();
    });
    req1.on('error', reject);
    req1.end();
  });
}

async function run() {
  const groupId = required('ATLAS_GROUP_ID');
  const fromUri = credentialsFromUri(process.env.MONGODB_URI || '');
  const username = (process.env.ATLAS_DB_USER || fromUri.username || '').trim() || 'pds_admin';
  const password = (process.env.ATLAS_DB_PASSWORD || fromUri.password || '').trim();
  if (!password) {
    console.error('Missing ATLAS_DB_PASSWORD (and MONGODB_URI carried no password). Nothing was changed.');
    process.exit(1);
  }

  console.log(`Creating/updating database user ${username} in group ${groupId}…`);
  const userRes = await digestFetch(`https://cloud.mongodb.com/api/atlas/v1.0/groups/${groupId}/databaseUsers`, {
    method: 'POST',
    body: JSON.stringify({
      databaseName: 'admin',
      username,
      password,
      roles: [
        { databaseName: 'admin', roleName: 'readWriteAnyDatabase' },
        { databaseName: 'admin', roleName: 'dbAdminAnyDatabase' },
      ],
    }),
  });
  console.log('User create status:', userRes.status);
  // The response echoes the request, passwords included — only show the parts worth reading.
  const summary = userRes.data && typeof userRes.data === 'object'
    ? { username: userRes.data.username, roles: (userRes.data.roles || []).map(r => r.roleName), errorCode: userRes.data.errorCode, detail: userRes.data.detail }
    : userRes.data;
  console.log('Result:', JSON.stringify(summary, null, 2));
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  run().catch(error => {
    console.error('Atlas request failed:', error?.message || error);
    process.exitCode = 1;
  });
}
