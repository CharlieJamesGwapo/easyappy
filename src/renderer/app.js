import { initConnections } from './capture-runtime.js';
import {
  saveApplication,
  saveInterview,
  archiveRecord,
  mergeStates,
  validateState,
  phtDate,
} from './model.js';
import { loadState, persistState, backupJSON, parseBackup, STORAGE_KEY } from './storage.js';
import { shell, applicationForm, interviewForm, settingsForm, importForm } from './views.js';

const root = document.querySelector('#app'),
  dialog = document.querySelector('#dialog'),
  fileInput = document.querySelector('#import-file');
let connections;
let state,
  storage,
  error = '',
  recoveryData = null,
  pendingImport = null,
  previousFocus = null,
  toastTimer,
  lastSavedRaw = null;
const ui = {
  view: ['overview', 'applications', 'interviews', 'actions', 'connections'].includes(
    location.hash.slice(1),
  )
    ? location.hash.slice(1)
    : 'overview',
  search: '',
  stage: '',
  platform: '',
  mode: 'list',
  archived: false,
  interviewArchived: false,
};
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 5000);
}
function render() {
  root.innerHTML = shell(ui, state, error);
}
function commit(
  next,
  message = window.easyappyNative ? 'Saved on this Mac' : 'Saved in this browser',
) {
  state = validateState(next);
  const result = persistState(storage, state, { expectedRaw: lastSavedRaw });
  error = result.ok ? '' : result.error;
  if (result.ok) lastSavedRaw = JSON.stringify(state);
  render();
  toast(result.ok ? message : 'Your changes are in memory only. Download a backup.');
  return result.ok;
}
function open(markup) {
  previousFocus = document.activeElement;
  dialog.innerHTML = markup;
  dialog.append(fileInput);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('input:not([type="hidden"]),button')?.focus();
}
function close() {
  connections?.formCancelled();
  dialog.close();
  previousFocus?.isConnected
    ? previousFocus.focus()
    : document.querySelector(`[data-view="${ui.view}"]`)?.focus();
}
function formError(message) {
  const el = dialog.querySelector('.form-error');
  if (el) {
    el.textContent = message;
    el.tabIndex = -1;
    el.focus();
  } else toast(message);
}
function edit(kind, id) {
  const rows = kind === 'application' ? state.applications : state.interviews;
  const record = rows.find((r) => r.id === id);
  if (!record) return;
  open(kind === 'application' ? applicationForm(record) : interviewForm(record));
}
function download(text, name, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  (dialog.open ? dialog : document.body).append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportData() {
  download(backupJSON(state), `EasyAppy-backup-${phtDate()}.json`);
  toast('Backup downloaded. Keep it somewhere safe.');
}
function navigate(view) {
  ui.view = view;
  location.hash = view;
  render();
  document.querySelector('#main').focus();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.view) {
    navigate(button.dataset.view);
    return;
  }
  if (button.dataset.mode) {
    ui.mode = button.dataset.mode;
    render();
    document.querySelector(`[data-mode="${ui.mode}"]`)?.focus();
    return;
  }
  if (button.dataset.editApplication) {
    edit('application', button.dataset.editApplication);
    return;
  }
  if (button.dataset.editInterview) {
    edit('interview', button.dataset.editInterview);
    return;
  }
  if (button.dataset.archive) {
    const restored = button.dataset.archived === 'false';
    commit(
      archiveRecord(state, button.dataset.archive, button.dataset.recordId, !restored),
      restored ? 'Record restored.' : 'Record archived. Find it with Show archived.',
    );
    close();
    return;
  }
  switch (button.dataset.action) {
    case 'new-application':
      open(applicationForm());
      break;
    case 'new-interview':
      open(interviewForm());
      break;
    case 'close-dialog':
      close();
      break;
    case 'settings':
      open(settingsForm(state, recoveryData));
      break;
    case 'export':
      exportData();
      break;
    case 'import':
      fileInput.click();
      break;
    case 'recover':
      if (recoveryData !== null)
        download(recoveryData, `EasyAppy-recovery-${phtDate()}.txt`, 'text/plain');
      break;
    case 'replace-corrupt': {
      if (
        !confirm(
          'Replace the unreadable saved data with the workspace currently shown? Download the original data first.',
        )
      )
        break;
      const result = persistState(storage, state, {
        replaceCorrupt: true,
        expectedRaw: lastSavedRaw,
      });
      error = result.error;
      if (result.ok) lastSavedRaw = JSON.stringify(state);
      if (result.ok) {
        recoveryData = null;
        close();
        render();
        toast('Workspace saved. Keep your recovery file.');
      } else formError(result.error);
      break;
    }
    case 'merge-import':
    case 'replace-import': {
      if (!pendingImport) break;
      try {
        const next =
          button.dataset.action === 'merge-import'
            ? mergeStates(state, pendingImport)
            : pendingImport;
        // Do not change the live workspace unless the validated import can be persisted.
        const result = persistState(storage, next, { expectedRaw: lastSavedRaw });
        if (!result.ok) {
          formError(result.error);
          break;
        }
        lastSavedRaw = JSON.stringify(next);
        state = next;
        error = '';
        pendingImport = null;
        close();
        render();
        toast('Backup imported and saved.');
      } catch (e) {
        formError(e.message);
      }
      break;
    }
  }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'search') {
    const input = event.target,
      start = input.selectionStart,
      end = input.selectionEnd;
    ui.search = input.value;
    render();
    const next = document.querySelector('#search');
    next.focus();
    try {
      next.setSelectionRange(start, end);
    } catch {}
  }
});
document.addEventListener('change', (event) => {
  const id = event.target.id;
  if (id === 'stage-filter') ui.stage = event.target.value;
  else if (id === 'platform-filter') ui.platform = event.target.value;
  else if (id === 'show-archived') ui.archived = event.target.checked;
  else if (id === 'show-interview-archived') ui.interviewArchived = event.target.checked;
  else return;
  render();
  document.getElementById(id)?.focus();
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      close();
  }
});
dialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  close();
});
dialog.addEventListener('submit', (event) => {
  const formId = event.target.getAttribute('id');
  if (!['record-form', 'settings-form'].includes(formId)) return;
  event.preventDefault();
  const form = event.target,
    data = Object.fromEntries(new FormData(form));
  try {
    if (formId === 'settings-form') {
      commit({
        ...state,
        settings: { goal: Number(data.goal), followUpDays: Number(data.followUpDays) },
      });
      close();
      return;
    }
    const kind = form.dataset.kind;
    let next;
    if (kind === 'application') {
      for (const key of ['salaryPHP', 'salaryUSD'])
        data[key] = data[key] === '' ? null : Number(data[key]);
      data.confirmed = form.elements.confirmed.checked;
      data.campaign = form.elements.campaign.checked;
      next = saveApplication(state, data);
    } else {
      for (const key of ['start', 'end']) data[key] = data[key] ? `${data[key]}:00+08:00` : '';
      next = saveInterview(state, data);
    }
    if (commit(next)) connections?.formSaved();
    close();
  } catch (e) {
    formError(e.message);
  }
});
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    if (file.size > 10000000) throw new Error('Please use a backup smaller than 10 MB.');
    pendingImport = parseBackup(await file.text());
    open(importForm(pendingImport, state));
  } catch (e) {
    toast(`Import stopped: ${e.message}`);
  } finally {
    fileInput.value = '';
  }
});
window.addEventListener('hashchange', () => {
  const view = location.hash.slice(1);
  if (
    ['overview', 'applications', 'interviews', 'actions', 'connections'].includes(view) &&
    ui.view !== view
  ) {
    ui.view = view;
    render();
  }
});
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    error =
      'Another tab updated this workspace. Download a backup of any edits, then reload before saving.';
    render();
    toast(error);
  }
});
async function boot() {
  try {
    const response = await fetch('seed.json');
    if (!response.ok) throw new Error('Initial records could not be loaded.');
    const seed = validateState(await response.json());
    try {
      storage = window.localStorage;
      storage.getItem('easyappy.v1');
    } catch {
      storage = {
        getItem() {
          throw new Error('Browser storage is unavailable.');
        },
        setItem() {
          throw new Error('Browser storage is unavailable.');
        },
      };
    }
    const loaded = loadState(storage, seed);
    state = loaded.state;
    error = loaded.error;
    recoveryData = loaded.recoveryData;
    try {
      lastSavedRaw = storage.getItem(STORAGE_KEY);
    } catch {}
    if (!error) {
      const saved = persistState(storage, state, { expectedRaw: lastSavedRaw });
      if (!saved.ok) error = saved.error;
      else lastSavedRaw = JSON.stringify(state);
    }
    connections = initConnections({
      ui,
      getState: () => state,
      saveState: commit,
      render,
      toast,
      openApplication: (row) => open(applicationForm(row)),
      openInterview: (row) => open(interviewForm(row)),
      openDialog: open,
      closeDialog: close,
    });
    render();
  } catch (e) {
    root.replaceChildren();
    const el = document.createElement('p');
    el.className = 'boot';
    el.textContent = `EasyAppy could not open: ${e.message} Please reload to try again.`;
    root.append(el);
  }
}
boot();
