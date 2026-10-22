import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState, persistState, backupJSON, parseBackup } from '../src/renderer/storage.js';

const seed = {
  version: 1,
  applications: [],
  interviews: [],
  settings: { goal: 1000, followUpDays: 7 },
};
function memory(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

test('first visit uses seeds without mutating the seed object', () => {
  const result = loadState(memory(), seed);
  assert.deepEqual(result.state, seed);
  result.state.settings.goal = 250;
  assert.equal(seed.settings.goal, 1000);
});
test('saved edits survive a reload instead of being replaced by seeds', () => {
  const s = memory();
  const edited = structuredClone(seed);
  edited.settings.goal = 500;
  assert.equal(persistState(s, edited).ok, true);
  assert.equal(loadState(s, seed).state.settings.goal, 500);
});
test('corrupt storage remains available for recovery and cannot be silently overwritten', () => {
  const s = memory({ 'easyappy.v1': '{broken' });
  const result = loadState(s, seed);
  assert.ok(result.error);
  assert.equal(result.recoveryData, '{broken');
  assert.equal(persistState(s, seed).ok, false);
  assert.equal(s.getItem('easyappy.v1'), '{broken');
  assert.equal(persistState(s, seed, { replaceCorrupt: true }).ok, true);
});
test('quota failures report unsaved changes rather than successful persistence', () => {
  const s = {
    getItem: () => null,
    setItem: () => {
      throw new Error('Quota exceeded');
    },
  };
  const result = persistState(s, seed);
  assert.equal(result.ok, false);
  assert.match(result.error, /save|storage|quota/i);
});
test('backup round-trip preserves data and rejects malformed input', () => {
  assert.deepEqual(parseBackup(backupJSON(seed)), seed);
  assert.throws(() => parseBackup('{bad'), /JSON|backup/i);
  assert.throws(() => parseBackup('{"version":1,"applications":"wrong"}'));
});
test('stale tabs cannot overwrite a newer workspace', () => {
  const s = memory();
  persistState(s, seed);
  const snapshot = s.getItem('easyappy.v1');
  const newer = structuredClone(seed);
  newer.settings.goal = 2000;
  assert.equal(persistState(s, newer, { expectedRaw: snapshot }).ok, true);
  const stale = structuredClone(seed);
  stale.settings.goal = 500;
  assert.equal(persistState(s, stale, { expectedRaw: snapshot }).ok, false);
  assert.equal(loadState(s, seed).state.settings.goal, 2000);
});
