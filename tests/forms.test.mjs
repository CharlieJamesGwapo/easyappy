import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { validateState, saveApplication, saveInterview } from '../src/renderer/model.js';

async function harness(data, kind) {
  const handlers = new Map();
  let saved;
  const node = {
    addEventListener: (name, callback) => handlers.set(name, callback),
    close() {},
    focus() {},
    classList: { add() {}, remove() {} },
  };
  const context = vm.createContext({
    document: { querySelector: () => node, addEventListener() {} },
    window: { addEventListener() {} },
    location: { hash: '' },
    setTimeout() {},
    clearTimeout() {},
    validateState,
    saveApplication,
    saveInterview,
    persistState: (_storage, state) => {
      saved = state;
      return { ok: true };
    },
    shell: () => '',
    FormData: class {
      constructor() {
        return Object.entries(data);
      }
    },
  });
  const source = (await readFile(new URL('../src/renderer/app.js', import.meta.url), 'utf8'))
    .replace(/^import[\s\S]*?from ['"][^'"]+['"];\n/gm, '')
    .replace(/\nboot\(\);\s*$/, '');
  vm.runInContext(source, context);
  vm.runInContext(
    'state={version:1,applications:[],interviews:[],settings:{goal:1000,followUpDays:7}}; storage={};',
    context,
  );
  let prevented = false;
  // Browser form named-property behavior: an input named id shadows form.id.
  const form = {
    id: { value: data.id },
    getAttribute: () => 'record-form',
    dataset: { kind },
    elements: { confirmed: { checked: false }, campaign: { checked: false } },
  };
  handlers.get('submit')({
    target: form,
    preventDefault() {
      prevented = true;
    },
  });
  return { prevented, saved };
}
test('application form saves when its hidden id input shadows form.id', async () => {
  const result = await harness(
    {
      id: '',
      company: 'Demo Company',
      role: 'Engineer',
      stage: 'Draft',
      salaryPHP: '',
      salaryUSD: '',
    },
    'application',
  );
  assert.equal(
    result.prevented,
    true,
    'Submission must not navigate or put record fields into the URL',
  );
  assert.equal(result.saved?.applications.length, 1);
  assert.equal(result.saved.applications[0].company, 'Demo Company');
});
test('interview form saves when its hidden id input shadows form.id', async () => {
  const result = await harness(
    {
      id: '',
      company: 'Demo Company',
      role: 'Engineer',
      start: '',
      end: '',
      stage: 'Awaiting schedule',
    },
    'interview',
  );
  assert.equal(result.prevented, true);
  assert.equal(result.saved?.interviews.length, 1);
});
