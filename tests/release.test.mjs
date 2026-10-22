import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const policyURL = new URL('../scripts/release-policy.mjs', import.meta.url);
async function policy() {
  assert.ok(existsSync(policyURL), 'Mac release policy must exist');
  return import(policyURL);
}
test('release asset names distinguish Mac architectures and reject unsafe version/path inputs', async () => {
  const { releaseNames } = await policy();
  assert.deepEqual(releaseNames('0.2.0', 'arm64'), {
    zip: 'EasyAppy-0.2.0-mac-arm64.zip',
    dmg: 'EasyAppy-0.2.0-mac-arm64.dmg',
  });
  assert.equal(releaseNames('0.2.0', 'x64').zip, 'EasyAppy-0.2.0-mac-x64.zip');
  assert.throws(() => releaseNames('../private', 'arm64'));
  assert.throws(() => releaseNames('0.2.0', 'unknown'));
});
test('Mac architecture selection defaults to Apple Silicon and validates explicit choices', async () => {
  const { architectures } = await policy();
  assert.deepEqual(architectures([]), ['arm64']);
  assert.deepEqual(architectures(['--arch=all']), ['arm64', 'x64']);
  assert.deepEqual(architectures(['--arch=x64']), ['x64']);
  assert.throws(() => architectures(['--arch=../profile']));
  assert.throws(() => architectures(['--other']));
});
