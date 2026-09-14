import https from 'node:https';
import crypto from 'node:crypto';

const publicKey = 'mxdndjyq';
const privateKey = 'f92244dc-bcac-4a00-8b36-2ff894c145bd';

export async function digestFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req1 = https.request(url, { method: options.method || 'GET' }, (res1) => {
      if (res1.statusCode !== 401 || !res1.headers['www-authenticate']) {
        let data = '';
        res1.on('data', chunk => data += chunk);
        res1.on('end', () => resolve({ status: res1.statusCode, data }));
        return;
      }
      
      const authHeader = res1.headers['www-authenticate'];
      const realmMatch = authHeader.match(/realm="([^"]+)"/);
      const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
      const qopMatch = authHeader.match(/qop="([^"]+)"/);
      
      const realm = realmMatch ? realmMatch[1] : '';
      const nonce = nonceMatch ? nonceMatch[1] : '';
      const qop = qopMatch ? qopMatch[1] : '';
      const method = options.method || 'GET';
      const uri = parsedUrl.pathname + parsedUrl.search;
      
      const ha1 = crypto.createHash('md5').update(`${publicKey}:${realm}:${privateKey}`).digest('hex');
      const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
      const nc = '00000001';
      const cnonce = crypto.randomBytes(8).toString('hex');
      
      let response;
      if (qop) {
        response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
      } else {
        response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
      }
      
      let authVal = `Digest username="${publicKey}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
      if (qop) authVal += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
      
      const headers = { ...options.headers, 'Authorization': authVal, 'Accept': 'application/vnd.atlas.2023-01-01+json, application/json' };
      if (options.body) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(options.body);
      }
      
      const req2 = https.request(url, { method, headers }, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(data2); } catch { parsed = data2; }
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
  const groupId = '68d7a1f866d7b5520aa8739b';
  
  console.log('Creating/updating database user auth_user...');
  const userRes = await digestFetch(`https://cloud.mongodb.com/api/atlas/v1.0/groups/${groupId}/databaseUsers`, {
    method: 'POST',
    body: JSON.stringify({
      databaseName: 'admin',
      username: 'pds_admin',
      password: 'PdsAdmin2026SecretKey!',
      roles: [
        { databaseName: 'admin', roleName: 'readWriteAnyDatabase' },
        { databaseName: 'admin', roleName: 'dbAdminAnyDatabase' }
      ]
    })
  });
  console.log('User create status:', userRes.status);
  console.log('User create response:', JSON.stringify(userRes.data, null, 2));
}

run().catch(console.error);
