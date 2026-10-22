import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageIgnore } from '../scripts/package-policy.mjs';

// Exercise the pinned packager's real copy filter, not a second policy implementation.
const { userPathFilter, populateIgnoredPaths } = await import(
  new URL('./copy-filter.js', import.meta.resolve('@electron/packager'))
);
const root = fileURLToPath(new URL('../', import.meta.url));

test('desktop packaging admits runtime files and excludes local credentials and personal artifacts', async () => {
  const options = {
    dir: root,
    out: path.join(root, 'release'),
    ignore: packageIgnore,
    prune: false,
  };
  const filter = userPathFilter({ ...options, ...populateIgnoredPaths(options) });
  for (const file of [
    '',
    'package.json',
    'LICENSE',
    'dist',
    'dist/main/index.cjs',
    'dist/preload/index.cjs',
    'dist/renderer/seed.json',
    'node_modules/mailparser/lib/mail-parser.js',
  ]) {
    assert.equal(await filter(path.join(root, file)), true, file || 'project root');
  }
  for (const file of [
    '.env',
    '.env.local',
    'credentials.json',
    'client_secret_example.json',
    'connections.encrypted',
    'connections.encrypted.tmp',
    'application-backup.json',
    'private-mail.eml',
    'node_modules/example/.env',
    'dist/renderer/client_secret_example.json',
    'docs/architecture.md',
    'src/main/index.cjs',
    '.git/config',
    '.openai/hosting.json',
    'release/EasyAppy.app',
    'package-lock.json',
  ]) {
    assert.equal(await filter(path.join(root, file)), false, 'Must exclude ' + file);
  }
});
