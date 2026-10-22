import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createGmailReader } = require('../src/main/gmail.cjs');
const { readGmailMessages } = require('../src/main/gmail.cjs');

test('review reads exact unique message ids and includes calendar evidence', async () => {
  const paths = [];
  const rows = await readGmailMessages(['abc123', 'abc123', 'def456'], async (endpoint) => {
    paths.push(endpoint);
    if (endpoint.includes('/attachments/')) return { data: 'Y2FsZW5kYXI' };
    return {
      id: endpoint.split('/')[1].split('?')[0],
      payload: {
        parts: [
          {
            mimeType: 'text/calendar',
            filename: 'invite.ics',
            body: { attachmentId: 'calendar1', size: 100 },
          },
          {
            mimeType: 'application/pdf',
            filename: 'cv.pdf',
            body: { attachmentId: 'private-pdf', size: 200 },
          },
        ],
      },
    };
  });
  assert.deepEqual(
    rows.map((r) => r.id),
    ['abc123', 'def456'],
  );
  assert.equal(rows[0].payload.parts[0].body.data, 'Y2FsZW5kYXI');
  assert.equal(
    paths.some((p) => p.includes('private-pdf')),
    false,
  );
  assert.deepEqual(paths, [
    'messages/abc123?format=full',
    'messages/abc123/attachments/calendar1',
    'messages/def456?format=full',
    'messages/def456/attachments/calendar1',
  ]);
});

test('review reads reject malformed or oversized id batches before requesting Gmail', async () => {
  for (const ids of [null, ['../profile'], [''], Array(501).fill('abc123')]) {
    await assert.rejects(
      readGmailMessages(ids, async () => {
        throw Error('must not request');
      }),
      /Invalid Gmail message identifiers/,
    );
  }
});

test('paces Gmail reads and retries quota errors without losing the request', async () => {
  const delays = [];
  let calls = 0;
  const read = createGmailReader(
    async (endpoint) => {
      calls++;
      if (calls === 1) throw Error("Quota exceeded for quota metric 'Total Query Cost'");
      return { endpoint };
    },
    { wait: async (ms) => delays.push(ms), random: () => 0 },
  );
  assert.deepEqual(await read('messages/example?format=full'), {
    endpoint: 'messages/example?format=full',
  });
  assert.deepEqual(await read('profile'), { endpoint: 'profile' });
  assert.deepEqual(delays, [800, 1000, 800, 800]);
  assert.equal(calls, 3);
});

test('does not retry authorization failures or retry quota errors forever', async () => {
  let calls = 0;
  const auth = createGmailReader(
    async () => {
      calls++;
      throw Error('Invalid credentials');
    },
    { wait: async () => {} },
  );
  await assert.rejects(auth('profile'), /Invalid credentials/);
  assert.equal(calls, 1);
  calls = 0;
  const quota = createGmailReader(
    async () => {
      calls++;
      throw Error('Quota exceeded');
    },
    { wait: async () => {}, random: () => 0 },
  );
  await assert.rejects(quota('messages'), /Quota exceeded/);
  assert.equal(calls, 7);
});
