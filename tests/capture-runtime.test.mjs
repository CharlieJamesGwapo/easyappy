import test from 'node:test';
import assert from 'node:assert/strict';
import { initConnections } from '../src/renderer/capture-runtime.js';

const message = {
  id: 'retry-proof',
  subject: 'Your application for Backend Developer at Acme was sent',
  from: 'LinkedIn <jobs-noreply@linkedin.com>',
  date: '2026-10-22T01:00:00+08:00',
  text: 'Your application was sent to Acme\nBackend Developer\nhttps://www.linkedin.com/jobs/view/4480000011/',
};
const empty = () => ({
  version: 1,
  applications: [],
  interviews: [],
  settings: { goal: 1000, followUpDays: 7 },
});
const settle = () => new Promise((resolve) => setImmediate(resolve));
function harness(t, { initial = empty(), capture = null } = {}) {
  const original = new Map(
    ['window', 'document', 'localStorage'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const docEvents = {},
    winEvents = {},
    saved = new Map(),
    ui = { view: 'overview' };
  if (capture) saved.set('easyappy.capture.v1', JSON.stringify(capture));
  let memory = structuredClone(initial),
    durable = empty(),
    saveAttempts = 0,
    trackerCanSave = true,
    captureCanSave = true,
    openedInterview = null;
  globalThis.window = {
    easyappyNative: {
      status: async () => ({ desktop: true, gmailConnected: false }),
      importEmails: async () => [message],
    },
    addEventListener: (name, fn) => (winEvents[name] = fn),
  };
  globalThis.document = { addEventListener: (name, fn) => (docEvents[name] = fn) };
  globalThis.localStorage = {
    getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => {
      if (!captureCanSave) throw new Error('Quota exceeded');
      saved.set(key, value);
    },
  };
  initConnections({
    ui,
    getState: () => memory,
    saveState: (next) => {
      memory = next;
      saveAttempts++;
      if (!trackerCanSave) return false;
      durable = structuredClone(next);
      return true;
    },
    render() {},
    toast() {},
    openApplication() {},
    openInterview(record) {
      openedInterview = record;
    },
  });
  t.after(() => {
    winEvents.beforeunload();
    for (const [key, descriptor] of original)
      descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key];
  });
  return {
    ui,
    review(id) {
      docEvents.click({ target: { closest: () => ({ dataset: { candidate: id } }) } });
    },
    get openedInterview() {
      return openedInterview;
    },
    async import() {
      docEvents.click({ target: { closest: () => ({ dataset: { action: 'import-emails' } }) } });
      await settle();
    },
    trackerWritable(value) {
      trackerCanSave = value;
    },
    captureWritable(value) {
      captureCanSave = value;
    },
    get durable() {
      return durable;
    },
    get memory() {
      return memory;
    },
    get attempts() {
      return saveAttempts;
    },
    get checkpoint() {
      return saved.has('easyappy.capture.v1') ? JSON.parse(saved.get('easyappy.capture.v1')) : null;
    },
  };
}

test('failed tracker save retries an already-present memory marker before acknowledging the email', async (t) => {
  const h = harness(t);
  h.trackerWritable(false);
  await h.import();
  assert.equal(h.memory.applications.length, 1);
  assert.equal(h.durable.applications.length, 0);
  assert.deepEqual(h.ui.capture.seen, []);
  assert.equal(h.checkpoint, null);
  h.trackerWritable(true);
  await h.import();
  assert.equal(h.attempts, 2);
  assert.equal(h.durable.applications.length, 1);
  assert.deepEqual(h.checkpoint.seen, ['retry-proof']);
  assert.equal(h.durable.applications[0].confirmed, true);
});

test('reviewing reconciled interview evidence edits its existing record', (t) => {
  const existing = {
    id: 'known-meeting',
    company: 'Acme',
    role: 'Developer',
    kind: 'Interview',
    stage: 'Needs confirmation',
    notes: '[Reviewed Gmail: evidence1] Conflicting timezones.',
  };
  const h = harness(t, {
    initial: { ...empty(), interviews: [existing] },
    capture: {
      version: 1,
      seen: ['evidence1'],
      review: [
        {
          id: 'gmail:evidence1',
          messageId: 'evidence1',
          kind: 'interview',
          company: 'Acme',
          role: 'Developer',
        },
      ],
    },
  });
  h.review('gmail:evidence1');
  assert.equal(h.openedInterview.id, 'known-meeting');
  assert.equal(h.openedInterview.notes, existing.notes);
});
test('identity-ambiguous reviewed mail cannot open a new interview form', (t) => {
  const h = harness(t, {
    capture: {
      version: 1,
      seen: ['ambiguous'],
      review: [
        {
          id: 'gmail:ambiguous',
          messageId: 'ambiguous',
          kind: 'interview',
          company: 'Acme',
          role: '',
          requiresIdentityCheck: true,
        },
      ],
    },
  });
  h.review('gmail:ambiguous');
  assert.equal(h.openedInterview, null);
});

test('failed capture checkpoint rolls back seen ids and can retry without duplicating the durable application', async (t) => {
  const h = harness(t);
  h.captureWritable(false);
  await h.import();
  assert.equal(h.durable.applications.length, 1);
  assert.deepEqual(h.ui.capture.seen, []);
  assert.equal(h.checkpoint, null);
  h.captureWritable(true);
  await h.import();
  assert.equal(h.attempts, 2);
  assert.equal(h.durable.applications.length, 1);
  assert.deepEqual(h.checkpoint.seen, ['retry-proof']);
});
