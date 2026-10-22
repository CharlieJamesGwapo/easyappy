import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  pkce,
  googleAuthorization,
  validateGoogleCredentials,
  validCallback,
} = require('../src/main/oauth.cjs');
test('PKCE uses independent random verifier/state and S256 challenge', () => {
  const a = pkce(),
    b = pkce();
  assert.notEqual(a.verifier, b.verifier);
  assert.notEqual(a.state, b.state);
  assert.match(a.verifier, /^[A-Za-z0-9_-]{43,128}$/);
  assert.match(a.challenge, /^[A-Za-z0-9_-]{43}$/);
});
test('Google auth requests read-only mail with PKCE and loopback redirect', () => {
  const a = pkce(),
    url = new URL(
      googleAuthorization(
        'client.apps.googleusercontent.com',
        'http://127.0.0.1:1234/oauth/callback',
        a,
      ),
    );
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), 'https://www.googleapis.com/auth/gmail.readonly');
  assert.equal(url.searchParams.get('state'), a.state);
});
test('OAuth callback rejects mismatching state and credentials require desktop client', () => {
  assert.throws(
    () => validCallback(new URL('http://127.0.0.1/oauth/callback?code=123&state=bad'), 'good'),
    /state/i,
  );
  assert.equal(
    validCallback(new URL('http://127.0.0.1/oauth/callback?code=123&state=good'), 'good'),
    '123',
  );
  assert.throws(() => validateGoogleCredentials({ web: { client_id: 'x' } }), /Desktop/i);
  assert.throws(() => validateGoogleCredentials({ installed: { client_id: 'bad' } }), /client/i);
  const c = validateGoogleCredentials({
    installed: { client_id: 'abc.apps.googleusercontent.com', client_secret: 'secret' },
  });
  assert.equal(c.clientId, 'abc.apps.googleusercontent.com');
});
