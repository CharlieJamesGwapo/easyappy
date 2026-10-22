import { parseEmail, applyCandidates } from './email-import.js';
import { googleSetupForm, pasteEmailForm } from './connections.js';
const KEY = 'easyappy.capture.v1';
export function initConnections({
  ui,
  getState,
  saveState,
  render,
  toast,
  openApplication,
  openInterview,
  openDialog,
  closeDialog,
}) {
  const native = window.easyappyNative;
  let busy = false,
    currentCandidate = null;
  let capture = { version: 1, seen: [], review: [], auto: true, lastSync: '' };
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (stored?.version === 1 && Array.isArray(stored.seen) && Array.isArray(stored.review))
      capture = { ...capture, ...stored };
  } catch {
    ui.connectionError = 'Capture settings could not load. Existing tracker records remain safe.';
  }
  ui.capture = capture;
  ui.connection = { desktop: Boolean(native) };
  function saveCapture() {
    try {
      localStorage.setItem(KEY, JSON.stringify(capture));
      return true;
    } catch {
      ui.connectionError =
        'Could not save the capture inbox. Download a tracker backup and free browser storage before syncing again.';
      return false;
    }
  }
  const refresh = () => {
    if (ui.view === 'connections') render();
  };
  async function perform(fn) {
    if (busy) return;
    busy = true;
    ui.connectionBusy = true;
    ui.connectionError = '';
    refresh();
    try {
      await fn();
    } catch (e) {
      ui.connectionError = String(e.message).replace(
        /^Error invoking remote method '[^']+': Error: /,
        '',
      );
      toast(ui.connectionError);
    } finally {
      busy = false;
      ui.connectionBusy = false;
      refresh();
    }
  }
  async function status() {
    if (native) ui.connection = await native.status();
    refresh();
  }
  function receive(messages, checkedAt = '') {
    const seen = new Set(capture.seen),
      fresh = messages.filter((m) => !seen.has(m.id));
    const candidates = fresh.map(parseEmail).filter(Boolean);
    const output = capture.auto
      ? applyCandidates(getState(), candidates)
      : { state: getState(), added: 0, updated: 0, review: candidates };
    // Always persist before acknowledging messages, including retries whose evidence marker
    // already exists in an earlier unsaved in-memory state.
    if (
      !saveState(
        output.state,
        `${output.added} applications captured, ${output.updated} existing records updated.`,
      )
    )
      throw new Error(
        'Tracker could not be saved. Messages will be retried after storage is repaired.',
      );
    const previous = structuredClone(capture);
    const reviews = new Map(capture.review.map((c) => [c.id, c]));
    for (const c of output.review) reviews.set(c.id, c);
    capture.review = [...reviews.values()];
    capture.seen = [...new Set([...capture.seen, ...fresh.map((m) => m.id)])].slice(-50000);
    if (checkedAt) capture.lastSync = checkedAt;
    if (!saveCapture()) {
      capture = previous;
      ui.capture = capture;
      throw new Error('Capture checkpoint could not be saved. Messages will be retried.');
    }
    ui.capture = capture;
    render();
    toast(
      `${output.added} added · ${output.updated} updated · ${output.review.length} for review.`,
    );
  }
  async function sync() {
    if (!native) throw new Error('Open the installed EasyAppy Mac app to connect Gmail.');
    if (!ui.connection.gmailConnected) throw new Error('Connect Gmail in Connections first.');
    const data = await native.syncGmail(capture.seen);
    receive(data.messages, data.checkedAt);
    if (data.limited)
      toast(
        'Checked the newest 500 matching messages. Older messages remain outside this sync window.',
      );
  }
  function removeReview(id) {
    capture.review = capture.review.filter((r) => r.id !== id);
    saveCapture();
    ui.capture = capture;
    refresh();
  }
  function review(candidate) {
    const records =
      candidate.kind === 'interview' ? getState().interviews : getState().applications;
    const markers = candidate.messageId
      ? [`[Reviewed Gmail: ${candidate.messageId}]`, `[Gmail message: ${candidate.messageId}]`]
      : [];
    const linked = records.filter(
      (row) =>
        row.id === candidate.recordId || markers.some((marker) => row.notes?.includes(marker)),
    );
    if (linked.length === 1) {
      currentCandidate = candidate.id;
      (candidate.kind === 'interview' ? openInterview : openApplication)({ ...linked[0] });
      return;
    }
    if (candidate.requiresIdentityCheck) {
      toast('Confirm the employer, role or job identifier before adding this email.');
      return;
    }
    currentCandidate = candidate.id;
    const notes = `Email: ${candidate.subject}\nFrom: ${candidate.from}\n${candidate.date ? 'Received: ' + candidate.date + ' PHT\n' : ''}${candidate.reason}`;
    if (candidate.kind === 'interview') {
      openInterview({
        company: candidate.company,
        role: candidate.role || '',
        kind: 'Interview',
        stage: 'Awaiting schedule',
        url: candidate.url,
        notes,
        prepStatus: 'Not started',
      });
      return;
    }
    const matches = getState().applications.filter(
      (r) =>
        r.company.toLowerCase() === candidate.company.toLowerCase() &&
        r.role.toLowerCase() === candidate.role.toLowerCase(),
    );
    const existing = matches.length === 1 ? matches[0] : {};
    openApplication({
      ...existing,
      company: candidate.company || existing.company || '',
      role: candidate.role || existing.role || '',
      platform: candidate.platform,
      url: existing.url || candidate.url,
      stage:
        candidate.kind === 'rejection'
          ? 'Rejected'
          : candidate.stage === 'Offer'
            ? 'Offer'
            : existing.stage || 'Applied',
      confirmed: existing.confirmed || false,
      verifiedDate: candidate.date,
      notes: [existing.notes, notes].filter(Boolean).join('\n'),
    });
  }
  document.addEventListener('click', (event) => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.dataset.dismissCandidate) {
      removeReview(b.dataset.dismissCandidate);
      return;
    }
    if (b.dataset.candidate) {
      const c = capture.review.find((r) => r.id === b.dataset.candidate);
      if (c) review(c);
      return;
    }
    if (b.dataset.disconnect) {
      perform(async () => {
        ui.connection = await native.disconnect(b.dataset.disconnect);
        toast(
          'Account disconnected from this Mac. For GitHub, you can also revoke EasyAppy in GitHub Settings.',
        );
      });
      return;
    }
    switch (b.dataset.action) {
      case 'setup-google':
        openDialog(googleSetupForm());
        break;
      case 'connect-google':
        perform(async () => {
          ui.connection = await native.connectGoogle();
          await sync();
        });
        break;
      case 'sync-email':
        perform(sync);
        break;
      case 'import-emails':
        perform(async () => receive(await native.importEmails()));
        break;
      case 'paste-email':
        openDialog(pasteEmailForm());
        break;
      case 'connect-github': {
        const clientId = document.querySelector('#github-client-id')?.value.trim();
        perform(async () => {
          const result = await native.startGitHub(clientId);
          ui.githubCode = result.userCode;
          toast('Enter the displayed code in GitHub, then click Check authorization.');
        });
        break;
      }
      case 'check-github':
        perform(async () => {
          const result = await native.pollGitHub();
          if (result.pending)
            toast('Still waiting for authorization. Finish in GitHub, then check again.');
          else {
            ui.githubCode = '';
            ui.connection = result.status;
            toast('GitHub profile connected.');
          }
        });
        break;
    }
  });
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!['google-setup-form', 'paste-email-form'].includes(form.id)) return;
    event.preventDefault();
    if (form.id === 'google-setup-form') {
      const value = {
        clientId: form.elements.clientId.value.trim(),
        clientSecret: form.elements.clientSecret.value.trim(),
      };
      perform(async () => {
        ui.connection = await native.configureGoogle(value);
        form.elements.clientSecret.value = '';
        closeDialog();
        toast('OAuth client saved. Click Connect Gmail to authorize your account.');
      });
      return;
    }
    const text = form.elements.emailText.value,
      subject =
        text.match(/^Subject:\s*(.+)$/im)?.[1] ||
        text.split('\n').find((line) => line.trim()) ||
        '',
      from = text.match(/^From:\s*(.+)$/im)?.[1] || '';
    const candidate = parseEmail({ id: crypto.randomUUID(), subject, from, text });
    if (!candidate) {
      form.querySelector('.form-error').textContent =
        'No application details detected. Include the subject and message body. Job alerts are excluded.';
      return;
    }
    capture.review.push(candidate);
    saveCapture();
    ui.capture = capture;
    closeDialog();
    render();
    toast('Email details detected. Review the record below before adding.');
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'auto-capture') {
      capture.auto = event.target.checked;
      saveCapture();
    }
  });
  status().catch((e) => {
    ui.connectionError = e.message;
    refresh();
  });
  const readySync = setTimeout(() => {
    if (native && ui.connection.gmailConnected) perform(sync);
  }, 1000);
  const periodic = setInterval(() => {
    if (native && ui.connection.gmailConnected) perform(sync);
  }, 300000);
  window.addEventListener('beforeunload', () => {
    clearTimeout(readySync);
    clearInterval(periodic);
  });
  return {
    formSaved() {
      if (currentCandidate) {
        removeReview(currentCandidate);
        currentCandidate = null;
      }
    },
    formCancelled() {
      currentCandidate = null;
    },
  };
}
