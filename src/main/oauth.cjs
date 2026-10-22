const crypto = require('node:crypto');
const http = require('node:http');
function pkce() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  return {
    verifier,
    challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
    state: crypto.randomBytes(32).toString('base64url'),
  };
}
function validateGoogleCredentials(value) {
  const c = value?.installed;
  if (!c) throw new Error('Import credentials created for a Google Desktop app.');
  if (
    typeof c.client_id !== 'string' ||
    !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(c.client_id)
  )
    throw new Error('Invalid Google desktop client ID.');
  return {
    clientId: c.client_id,
    clientSecret: typeof c.client_secret === 'string' ? c.client_secret : '',
  };
}
function googleAuthorization(clientId, redirect, proof) {
  return (
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      state: proof.state,
      code_challenge: proof.challenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    })
  );
}
function validCallback(url, state) {
  if (url.searchParams.get('state') !== state) throw new Error('OAuth state did not match.');
  if (url.searchParams.has('error'))
    throw new Error('Google authorization was cancelled or denied.');
  const code = url.searchParams.get('code');
  if (!code) throw new Error('Missing authorization code.');
  return code;
}
async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`Service returned HTTP ${response.status}.`);
  }
  if (!response.ok)
    throw new Error(
      result.error?.message ||
        result.error_description ||
        `Service returned HTTP ${response.status}.`,
    );
  return result;
}
async function googleToken(credentials, params) {
  return jsonFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...params,
      client_id: credentials.clientId,
      ...(credentials.clientSecret ? { client_secret: credentials.clientSecret } : {}),
    }),
  });
}
async function authorizeGoogle(credentials, openExternal) {
  const proof = pkce();
  let timer, server;
  return new Promise((resolve, reject) => {
    function finish(error, value) {
      clearTimeout(timer);
      server.close();
      error ? reject(error) : resolve(value);
    }
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (req.method !== 'GET' || url.pathname !== '/oauth/callback') {
        res.writeHead(404).end();
        return;
      }
      if (url.searchParams.get('state') !== proof.state) {
        res.writeHead(400).end('Invalid state. Return to EasyAppy and try again.');
        return;
      }
      try {
        const code = validCallback(url, proof.state),
          redirect = `http://127.0.0.1:${server.address().port}/oauth/callback`;
        const token = await googleToken(credentials, {
          code,
          redirect_uri: redirect,
          code_verifier: proof.verifier,
          grant_type: 'authorization_code',
        });
        if (
          !token.access_token ||
          !token.scope?.split(' ').includes('https://www.googleapis.com/auth/gmail.readonly')
        )
          throw new Error('Read-only Gmail permission was not granted.');
        res
          .writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
          })
          .end(
            '<html><title>EasyAppy connected</title><body style="font:18px system-ui;padding:60px;background:#f5f7ef;color:#19372b"><h1>Gmail connected.</h1><p>You can close this tab and return to EasyAppy.</p></body></html>',
          );
        finish(null, { ...token, expiresAt: Date.now() + token.expires_in * 1000 });
      } catch (error) {
        res
          .writeHead(400, { 'Content-Type': 'text/plain' })
          .end('Authorization could not complete. Return to EasyAppy.');
        finish(error);
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const redirect = `http://127.0.0.1:${server.address().port}/oauth/callback`;
      openExternal(googleAuthorization(credentials.clientId, redirect, proof)).catch((error) =>
        finish(error),
      );
    });
    timer = setTimeout(
      () => finish(new Error('Authorization timed out. Try Connect Gmail again.')),
      300000,
    );
  });
}
module.exports = {
  pkce,
  validateGoogleCredentials,
  googleAuthorization,
  validCallback,
  authorizeGoogle,
  googleToken,
  jsonFetch,
};
