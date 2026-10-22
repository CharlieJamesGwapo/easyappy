import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const checker = new URL('../scripts/privacy-check.mjs', import.meta.url);
async function policy() {
  assert.ok(existsSync(checker), 'Public release privacy policy must exist');
  return import(checker);
}
test('release policy rejects environment and private-data artifact paths', async () => {
  const { inspectFile } = await policy();
  for (const name of [
    '.env',
    '.env.example',
    'credentials.json',
    'connections.encrypted',
    'backups/export.json',
    'resume.pdf',
    'profile.sqlite',
  ])
    assert.ok(inspectFile(name, '').length, name);
  assert.deepEqual(inspectFile('src/main/oauth.cjs', 'const token = response.access_token;'), []);
});
test('release policy detects credential-shaped values without including them in findings', async () => {
  const { inspectFile } = await policy();
  const fake = 'GOCSPX-' + 'x'.repeat(30);
  const findings = inspectFile('sample.json', JSON.stringify({ value: fake }));
  assert.ok(findings.length);
  assert.equal(JSON.stringify(findings).includes(fake), false);
});
test('release policy rejects personal seed records and non-example demo contacts', async () => {
  const { inspectFile } = await policy();
  assert.ok(
    inspectFile(
      'src/renderer/seed.json',
      JSON.stringify({ applications: [{ company: 'Example' }], interviews: [] }),
    ).length,
  );
  assert.ok(inspectFile('docs/demo.json', '{"contact":"person@private.invalid"}').length);
  assert.deepEqual(inspectFile('docs/demo.json', '{"contact":"recruiter@example.com"}'), []);
});
