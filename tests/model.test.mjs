import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  STAGES,
  INTERVIEW_STAGES,
  metrics,
  validateState,
  mergeStates,
  safeURL,
  saveApplication,
  saveInterview,
  archiveRecord,
  getActions,
  phtDate,
} from '../src/renderer/model.js';

const empty = () => ({
  version: 1,
  applications: [],
  interviews: [],
  settings: { goal: 1000, followUpDays: 7 },
});
const application = (overrides = {}) => ({
  id: 'one',
  company: 'Acme',
  role: 'Developer',
  stage: 'Draft',
  ...overrides,
});
const interview = (overrides = {}) => ({
  id: 'meeting',
  company: 'Acme',
  role: 'Developer',
  kind: 'Interview',
  stage: 'Scheduled',
  start: '2026-10-22T23:45:00+08:00',
  end: '2026-10-23T00:15:00+08:00',
  ...overrides,
});
test('interviews with a conflicting or incomplete schedule have a confirmation action', () => {
  const state = saveInterview(
    empty(),
    interview({ stage: 'Needs confirmation', start: '', end: '' }),
  );
  const actions = getActions(state, '2026-10-22');
  assert.equal(actions.length, 1);
  assert.equal(actions[0].recordId, 'meeting');
  assert.equal(actions[0].action, 'confirm');
});

test('a public checkout starts with no personal tracker records', async () => {
  const seed = validateState(
    JSON.parse(await readFile(new URL('../src/renderer/seed.json', import.meta.url), 'utf8')),
  );
  assert.equal(seed.applications.length, 0);
  assert.equal(seed.interviews.length, 0);
  assert.deepEqual(metrics(seed), {
    total: 0,
    confirmed: 0,
    pending: 0,
    campaign: 0,
    interviews: 0,
    offers: 0,
    archived: 0,
  });
});

test('drafts never inflate confirmed campaign progress; explicit submission can count', () => {
  let state = saveApplication(empty(), application({ campaign: true }));
  assert.equal(metrics(state).confirmed, 0);
  assert.equal(metrics(state).campaign, 0);
  state = saveApplication(state, { ...state.applications[0], stage: 'Applied' });
  assert.equal(metrics(state).confirmed, 0);
  state = saveApplication(state, { ...state.applications[0], confirmed: true });
  assert.equal(metrics(state).confirmed, 1);
  assert.equal(metrics(state).campaign, 1);
  state = saveApplication(state, { ...state.applications[0], stage: 'Draft' });
  assert.equal(metrics(state).confirmed, 0);
});

test('save is immutable and preserves ids; archive excludes actions and active counts; restore recovers', () => {
  const state = saveApplication(
    empty(),
    application({ stage: 'Applied', confirmed: true, campaign: true, followUpDate: '2026-10-21' }),
  );
  const edited = saveApplication(state, { id: 'one', notes: 'Edited' });
  assert.equal(state.applications[0].notes, '');
  assert.equal(edited.applications[0].notes, 'Edited');
  const archived = archiveRecord(edited, 'application', 'one', true);
  assert.deepEqual(metrics(archived), {
    total: 0,
    confirmed: 0,
    pending: 0,
    campaign: 0,
    interviews: 0,
    offers: 0,
    archived: 1,
  });
  assert.deepEqual(getActions(archived, '2026-10-22'), []);
  assert.equal(metrics(archiveRecord(archived, 'application', 'one', false)).confirmed, 1);
  assert.throws(() => archiveRecord(state, 'application', 'missing', true), /not found/i);
});

test('malformed backups, duplicate ids, bad dates, timestamps and reverse interviews are rejected', () => {
  for (const value of [
    null,
    [],
    {},
    { ...empty(), version: 2 },
    { ...empty(), settings: { goal: -1, followUpDays: 7 } },
  ])
    assert.throws(() => validateState(value), Error);
  assert.throws(
    () => validateState({ ...empty(), applications: [application(), application()] }),
    /duplicate/i,
  );
  assert.throws(
    () => saveApplication(empty(), application({ appliedDate: '2026-02-30' })),
    /appliedDate/i,
  );
  assert.throws(
    () => saveInterview(empty(), interview({ start: '2026-10-22T23:45:00' })),
    /timezone|offset/i,
  );
  assert.throws(
    () => saveInterview(empty(), interview({ end: '2026-10-22T22:00:00+08:00' })),
    /end/i,
  );
  assert.throws(() => saveInterview(empty(), interview({ end: '' })), /start.*end|end.*start/i);
  assert.throws(() => saveApplication(empty(), application({ confirmed: 'true' })), /confirmed/i);
  assert.throws(() => saveApplication(empty(), application({ stage: 'Imaginary' })), /stage/i);
});

test('merge validates both states and explicitly overwrites matching incoming id without duplicate count', () => {
  const old = saveApplication(
    empty(),
    application({ stage: 'Applied', confirmed: true, campaign: true, notes: 'old' }),
  );
  const incoming = saveApplication(empty(), application({ notes: 'new' }));
  const merged = mergeStates(old, incoming);
  assert.equal(merged.applications.length, 1);
  assert.equal(merged.applications[0].notes, 'new');
  assert.equal(metrics(merged).campaign, 0);
  assert.equal(old.applications[0].notes, 'old');
  assert.throws(() => mergeStates(old, { version: 9 }), Error);
});

test('safe urls allow only absolute http or https and never executable or file schemes', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,x',
    'file:///Users/me/private',
    '/local/path',
    'https://user:secret@example.com',
  ])
    assert.equal(safeURL(url), '');
  assert.equal(safeURL('https://example.com/path?q=1'), 'https://example.com/path?q=1');
  assert.equal(safeURL('http://example.com'), 'http://example.com/');
  assert.equal(safeURL(null), '');
});

test('PHT calendar dates cross UTC midnight correctly and invalid now is rejected', () => {
  assert.equal(phtDate('2026-10-21T16:01:00Z'), '2026-10-22');
  assert.equal(phtDate('2026-10-21T15:59:00Z'), '2026-10-21');
  assert.throws(() => phtDate('invalid'), /date/i);
});

test('actions distinguish pending, known due follow-ups and scheduled prep without false overdue unknown dates', () => {
  let state = saveApplication(
    empty(),
    application({ stage: 'Verification required', nextAction: 'Complete verification' }),
  );
  state = saveApplication(state, application({ id: 'unknown', stage: 'Applied', confirmed: true }));
  state = saveApplication(
    state,
    application({ id: 'due', stage: 'Applied', confirmed: true, followUpDate: '2026-10-21' }),
  );
  state = saveInterview(state, interview());
  state = saveInterview(
    state,
    interview({ id: 'past', start: '2026-10-20T09:00:00+08:00', end: '2026-10-20T10:00:00+08:00' }),
  );
  state = saveInterview(
    state,
    interview({
      id: 'done',
      stage: 'Attended',
      start: '2026-10-21T19:00:00+08:00',
      end: '2026-10-21T20:00:00+08:00',
    }),
  );
  const actions = getActions(state, '2026-10-22');
  assert.equal(actions.length, 3);
  assert.equal(actions.filter((x) => x.kind === 'interview').length, 1);
  assert.equal(actions.find((x) => x.recordId === 'due').priority, 'high');
  assert.equal(actions.find((x) => x.recordId === 'one').date, '');
  assert.equal(
    actions.some((x) => x.recordId === 'unknown' || x.recordId === 'past' || x.recordId === 'done'),
    false,
  );
  assert.ok(STAGES.includes('Verification required'));
  assert.ok(INTERVIEW_STAGES.includes('Scheduled'));
});

test('unscheduled interviews remain unscheduled and prep complete suppresses prep action', () => {
  const state = saveInterview(empty(), {
    id: 'screen',
    company: 'Example Labs',
    role: 'Full Stack',
    stage: 'Pre-screening',
    start: '',
    end: '',
  });
  assert.equal(state.interviews[0].start, '');
  assert.deepEqual(getActions(state, '2026-10-22'), []);
  const next = saveInterview(state, interview({ prepStatus: 'Ready' }));
  assert.equal(getActions(next, '2026-10-22').length, 0);
});

test('editing an application records current activity without backfilling an unknown applied date', () => {
  const state = saveApplication(empty(), application({ updatedAt: '2025-01-01T00:00:00Z' }));
  const edited = saveApplication(state, { id: 'one', notes: 'New activity' });
  assert.ok(Date.parse(edited.applications[0].updatedAt) > Date.parse('2025-01-01T00:00:00Z'));
  assert.equal(edited.applications[0].appliedDate, '');
});

test('interview clock fields reject rolled-over times and actions require a real current date', () => {
  assert.throws(
    () =>
      saveInterview(
        empty(),
        interview({ start: '2026-10-22T24:00:00+08:00', end: '2026-10-23T02:00:00+08:00' }),
      ),
    /time/i,
  );
  assert.throws(() => getActions(empty(), ''), /today/i);
});
