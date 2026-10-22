import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
test('build assembles only runtime source with valid Electron entry paths', async () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.main, 'dist/main/index.cjs');
  for (const file of [
    'main/index.cjs',
    'main/oauth.cjs',
    'preload/index.cjs',
    'renderer/index.html',
    'renderer/app.js',
    'renderer/seed.json',
  ])
    await access(new URL('../dist/' + file, import.meta.url));
  assert.deepEqual((await readdir(new URL('../dist/', import.meta.url))).sort(), [
    'main',
    'preload',
    'renderer',
  ]);
  const entry = await readFile(new URL('../dist/main/index.cjs', import.meta.url), 'utf8');
  assert.match(entry, /\.\.\/preload\/index\.cjs/);
  assert.match(entry, /\.\.\/renderer/);
  assert.equal(
    await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8'),
    await readFile(new URL('../dist/renderer/app.js', import.meta.url), 'utf8'),
  );
});
