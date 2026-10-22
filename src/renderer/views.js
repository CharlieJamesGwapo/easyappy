import { connectionsView } from './connections.js';
import { icon } from './icons.js';
import { metrics, getActions, safeURL, phtDate, STAGES, INTERVIEW_STAGES } from './model.js';
export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export function date(value, options = {}) {
  return value
    ? new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options,
      }).format(new Date(value.length === 10 ? value + 'T00:00:00+08:00' : value))
    : 'Not recorded';
}
export const time = (value) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : '';
export const money = (row) =>
  [
    row.salaryPHP ? `₱${row.salaryPHP.toLocaleString('en-PH')}/mo` : '',
    row.salaryUSD ? `US$${row.salaryUSD.toLocaleString('en-US')}/mo` : '',
  ]
    .filter(Boolean)
    .join(' · ') ||
  row.salaryNote ||
  'Salary not recorded';
export const badge = (stage, confirmed) =>
  `<span class="badge ${['Offer', 'Completed', 'Attended'].includes(stage) ? 'green' : ['Verification required', 'Sign-in required', 'Information required', 'Needs confirmation', 'On hold'].includes(stage) ? 'amber' : ['Rejected', 'Withdrawn', 'Cancelled'].includes(stage) ? 'gray' : 'blue'}">${esc(stage)}</span>${confirmed === false && !['Draft', 'Verification required', 'Sign-in required', 'Information required', 'On hold'].includes(stage) ? '<span class="badge gray">Unconfirmed</span>' : ''}`;
export const logo = (company) =>
  `<span class="company-logo tone-${[...company].reduce((n, c) => n + c.charCodeAt(0), 0) % 5}">${esc(
    company
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join(''),
  )}</span>`;
export const link = (url, label, cls = '') =>
  safeURL(url)
    ? `<a class="${cls}" href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}${icon('external')}</a>`
    : '';
export function shell(ui, state, error) {
  const m = metrics(state),
    names = {
      overview: ['Your next chapter,', 'one step closer.'],
      applications: ['Your applications', 'Every opportunity in one place.'],
      interviews: ['Make a good impression.', 'Your conversations, clearly planned.'],
      actions: ['A little focus goes a long way.', 'Turn pending steps into progress.'],
      connections: ['Less typing. More momentum.', 'Connect your inbox. Track your next move.'],
    };
  return `<aside class="sidebar"><a class="brand" href="#overview" aria-label="EasyAppy overview"><img src="icon.svg" alt="" width="35" height="35">easyappy<span>●</span></a><div class="workspace-label">YOUR WORKSPACE</div><nav aria-label="Main navigation">${[
    ['overview', 'grid', 'Overview'],
    ['applications', 'briefcase', 'Applications'],
    ['interviews', 'calendar', 'Interviews'],
    ['actions', 'bolt', 'Action Center'],
    ['connections', 'link', 'Connections'],
  ]
    .map(
      ([id, ic, title]) =>
        `<button data-view="${id}" aria-label="${title}" class="nav-link ${ui.view === id ? 'active' : ''}" ${ui.view === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${title}</span>${id === 'actions' ? `<b>${getActions(state).length}</b>` : ''}</button>`,
    )
    .join(
      '',
    )}</nav><div class="sidebar-bottom"><div class="private-note">${icon('shield')}<div><strong>Just for you</strong><small>Private workspace<br>${typeof window !== 'undefined' && window.easyappyNative ? 'Saved on this Mac' : 'Saved in this browser'}</small></div></div><button class="nav-link" data-action="settings">${icon('settings')}Settings & backup</button><div class="profile"><span>EA</span><div>Your workspace<small>Your next chapter starts here</small></div></div></div></aside><div class="workspace"><header class="topbar"><span class="breadcrumb">Workspace <span>/</span> ${esc({ overview: 'Overview', applications: 'Applications', interviews: 'Interviews', actions: 'Action Center', connections: 'Connections' }[ui.view])}</span><div class="topbar-right"><span class="today">${icon('calendar')}${date(phtDate(), { weekday: 'short', year: undefined })} · PHT</span><button class="icon-button" data-action="export" title="Download a JSON backup" aria-label="Download backup">${icon('download')}</button><button class="icon-button mobile-settings" data-action="settings" aria-label="Settings and backup">${icon('settings')}</button><span class="avatar">EA</span></div></header><main id="main" tabindex="-1"><div class="page-head"><div><p class="eyebrow">${ui.view === 'overview' ? 'LET’S MAKE YOUR NEXT MOVE' : ui.view === 'applications' ? `${m.total} ACTIVE RECORDS` : ui.view === 'interviews' ? 'SHOW UP PREPARED' : 'YOUR NEXT STEPS'}</p><h1>${names[ui.view][0]}${ui.view === 'overview' ? `<br><span>${names[ui.view][1]}</span>` : ''}</h1>${ui.view !== 'overview' ? `<p class="subtitle">${names[ui.view][1]}</p>` : ''}</div><button class="button primary" data-action="${ui.view === 'connections' ? 'sync-email' : ui.view === 'interviews' ? 'new-interview' : 'new-application'}">${icon(ui.view === 'connections' ? 'refresh' : 'plus')}${ui.view === 'connections' ? 'Sync inbox' : ui.view === 'interviews' ? 'Add interview' : 'Add application'}</button></div>${error ? `<div class="notice error" role="alert">${icon('shield')}<div><strong>Changes are not saved</strong><p>${esc(error)}</p><button class="text-button" data-action="settings">Open recovery & backup</button></div></div>` : ''}<div id="view-content">${ui.view === 'overview' ? overview(state) : ui.view === 'applications' ? applications(state, ui) : ui.view === 'interviews' ? interviews(state, ui) : ui.view === 'connections' ? connectionsView(ui) : actions(state)}</div><footer>Built for your next opportunity. <span>Local records · No direct job-site sync.</span></footer></main></div>`;
}
const empty = (title, text) =>
  `<div class="empty">${icon('briefcase')}<h3>${title}</h3><p>${text}</p></div>`;
function appRow(row) {
  return `<button class="application-row" data-edit-application="${esc(row.id)}">${logo(row.company)}<span class="role-cell"><strong>${esc(row.role)}</strong><small>${esc(row.company)}</small></span><span class="platform-cell">${esc(row.platform || 'Other')}<small>${esc(row.location || 'Location not recorded')}</small></span><span class="status-cell">${badge(row.stage, row.confirmed)}</span><span class="date-cell">${row.appliedDate ? date(row.appliedDate, { year: undefined }) : 'Date not recorded'}</span>${icon('chevron')}</button>`;
}
function meeting(row) {
  const start = row.start
    ? date(row.start, { weekday: 'short', year: undefined })
    : 'To be scheduled';
  return `<article class="meeting-card"><div class="meeting-top"><span class="kind">${esc(row.kind)}</span>${badge(row.stage)}</div><div class="meeting-company">${logo(row.company)}<div><h3>${esc(row.company)}</h3><p>${esc(row.role)}</p></div></div><div class="meeting-time">${icon('calendar')}<strong>${start}</strong><span>${row.start ? `${time(row.start)} – ${phtDate(row.start) !== phtDate(row.end) ? date(row.end, { year: undefined }) + ' · ' : ''}${time(row.end)} PHT` : 'Time not confirmed'}</span></div><p class="prep-state">${icon('note')} Preparation: <strong>${esc(row.prepStatus)}</strong></p><div class="card-actions"><button class="button small" data-edit-interview="${esc(row.id)}">View & prepare ${icon('arrow')}</button>${link(row.url, 'Meeting link', 'meeting-link')}</div></article>`;
}
function actionRows(rows, limit = Infinity) {
  return rows
    .slice(0, limit)
    .map(
      (a, i) =>
        `<button class="action-row" data-edit-${a.kind}="${esc(a.recordId)}"><span class="action-marker ${a.priority === 'high' ? 'overdue' : ''}">${icon(a.action === 'prepare' ? 'calendar' : a.action === 'follow-up' ? 'clock' : 'bolt')}</span><span><strong>${esc(a.title)}</strong><small>${esc(a.company)} · ${esc(a.detail)}</small></span>${a.date ? `<span class="due">${date(a.date, { year: undefined })}</span>` : ''}${icon('chevron')}</button>`,
    )
    .join('');
}
function overview(state) {
  const m = metrics(state),
    allActions = getActions(state),
    active = state.applications.filter((r) => !r.archived),
    next = state.interviews
      .filter(
        (r) =>
          !r.archived &&
          r.start &&
          new Date(r.end) >= new Date() &&
          ['Invited', 'Scheduled', 'Needs confirmation'].includes(r.stage),
      )
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
  const pipeline = [
    ['Pending', m.pending, 'amber'],
    ['Applied', active.filter((r) => r.stage === 'Applied').length, 'blue'],
    [
      'In conversation',
      active.filter((r) => ['Screening', 'Interview'].includes(r.stage)).length,
      'violet',
    ],
    ['Offers', m.offers, 'green'],
  ];
  return `<section class="stats" aria-label="Application summary">${[
    [m.total, 'Applications tracked', 'briefcase', 'All active records'],
    [m.confirmed, 'Confirmed submissions', 'check', 'Submission recorded'],
    [m.pending, 'Pending applications', 'clock', 'Ready for your next step'],
    [m.interviews, 'Interview conversations', 'calendar', 'Invited or awaiting confirmation'],
  ]
    .map(
      ([n, label, ic, note]) =>
        `<article class="stat"><div class="stat-label">${label}${icon(ic)}</div><strong>${n}</strong><small>${note}</small></article>`,
    )
    .join(
      '',
    )}</section><div class="overview-grid"><section class="panel pipeline"><div class="panel-title"><div><p class="eyebrow">THE BIG PICTURE</p><h2>Keep your momentum.</h2></div><button class="text-button" data-view="applications">View pipeline ${icon('arrow')}</button></div><div class="pipeline-bar">${pipeline.map(([title, n, color]) => `<span class="${color}" style="flex:${Math.max(n, 0.4)}" title="${title}: ${n}"></span>`).join('')}</div><div class="pipeline-legend">${pipeline.map(([title, n, color]) => `<div><span class="dot ${color}"></span><span>${title}</span><strong>${n}</strong></div>`).join('')}</div><div class="goal"><div><span>${icon('bolt')} Your application journey</span><strong>${m.campaign}<span> / ${state.settings.goal.toLocaleString()}</span></strong></div><progress value="${m.campaign}" max="${state.settings.goal}" aria-label="Confirmed campaign submissions">${m.campaign}</progress><p>${m.campaign} confirmed submissions in this campaign. Earlier applications remain in your full tracker.</p></div></section><section class="next-panel"><div class="next-caption">${icon('calendar')} UP NEXT <span>ASIA / MANILA</span></div>${next ? `<p class="next-date">${date(next.start, { weekday: 'long', year: undefined })} · ${time(next.start)}</p><h2>${esc(next.company)}</h2><p>${esc(next.role)}</p><div class="next-bottom">${badge(next.stage)}<button class="button primary" data-edit-interview="${esc(next.id)}">Get ready ${icon('arrow')}</button></div>` : `<h2>Space for your next conversation.</h2><p>Add an interview when you receive an invitation.</p><button class="button primary" data-action="new-interview">${icon('plus')} Add interview</button>`}</section><section class="panel overview-actions"><div class="panel-title"><div><h2>Needs your attention <span class="count">${allActions.length}</span></h2><p>Small steps. Real progress.</p></div><button class="text-button" data-view="actions">View all ${icon('arrow')}</button></div>${allActions.length ? actionRows(allActions, 4) : empty('You’re up to date.', 'No pending steps or follow-ups today.')}</section><section class="panel recent"><div class="panel-title"><div><h2>Application snapshot</h2><p>Your most recently recorded opportunities.</p></div><button class="text-button" data-view="applications">View all ${icon('arrow')}</button></div>${[
    ...active,
  ]
    .sort((a, b) =>
      (b.appliedDate || b.verifiedDate || '').localeCompare(a.appliedDate || a.verifiedDate || ''),
    )
    .slice(0, 4)
    .map(
      (r) =>
        `<button class="snapshot-row" data-edit-application="${esc(r.id)}">${logo(r.company)}<span><strong>${esc(r.company)}</strong><small>${esc(r.role)}</small></span>${badge(r.stage, r.confirmed)}</button>`,
    )
    .join(
      '',
    )}</section></div><div class="snapshot-note">${icon('shield')}This is your personal record, not a live connection to job sites. Pending applications are never counted as submitted.</div>`;
}
function applications(state, ui) {
  const filtered = state.applications.filter(
    (r) =>
      r.archived === ui.archived &&
      (!ui.search ||
        [r.company, r.role, r.platform, r.notes]
          .join(' ')
          .toLowerCase()
          .includes(ui.search.toLowerCase())) &&
      (!ui.stage || r.stage === ui.stage) &&
      (!ui.platform || r.platform === ui.platform),
  );
  const platforms = [...new Set(state.applications.map((r) => r.platform).filter(Boolean))].sort();
  return `<section class="panel application-panel"><div class="filters"><label class="search">${icon('search')}<input id="search" type="search" placeholder="Search roles, companies, notes…" aria-label="Search applications" value="${esc(ui.search)}"></label><label class="sr-only" for="stage-filter">Stage</label><select id="stage-filter"><option value="">All stages</option>${STAGES.map((s) => `<option ${ui.stage === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><label class="sr-only" for="platform-filter">Platform</label><select id="platform-filter"><option value="">All platforms</option>${platforms.map((s) => `<option ${ui.platform === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><div class="view-toggle" aria-label="Display mode"><button class="icon-button ${ui.mode === 'list' ? 'selected' : ''}" data-mode="list" title="List view" aria-label="List view" aria-pressed="${ui.mode === 'list'}">${icon('list')}</button><button class="icon-button ${ui.mode === 'board' ? 'selected' : ''}" data-mode="board" title="Board view" aria-label="Board view" aria-pressed="${ui.mode === 'board'}">${icon('board')}</button></div></div><div class="list-meta"><span>${filtered.length} ${ui.archived ? 'archived' : 'active'} ${filtered.length === 1 ? 'application' : 'applications'}</span><label><input id="show-archived" type="checkbox" ${ui.archived ? 'checked' : ''}> Show archived</label></div>${
    !filtered.length
      ? empty('No applications here yet.', 'Try another filter or add an opportunity.')
      : ui.mode === 'list'
        ? `<div class="table-head"><span>ROLE / COMPANY</span><span>PLATFORM / LOCATION</span><span>STATUS</span><span>APPLIED</span></div><div class="application-list">${filtered.map(appRow).join('')}</div>`
        : `<div class="board">${[
            ['Pending', (r) => !r.confirmed && !['Rejected', 'Withdrawn'].includes(r.stage)],
            ['Applied', (r) => r.confirmed && r.stage === 'Applied'],
            [
              'In progress',
              (r) => r.confirmed && ['Screening', 'Interview', 'Offer'].includes(r.stage),
            ],
            ['Closed', (r) => ['Rejected', 'Withdrawn'].includes(r.stage)],
          ]
            .map(
              ([title, fn]) =>
                `<section class="board-column"><h3>${title}<span>${filtered.filter(fn).length}</span></h3>${
                  filtered
                    .filter(fn)
                    .map(
                      (r) =>
                        `<button class="board-card" data-edit-application="${esc(r.id)}"><div>${logo(r.company)}<small>${esc(r.platform)}</small></div><h4>${esc(r.role)}</h4><p>${esc(r.company)}</p>${badge(r.stage, r.confirmed)}<small>${esc(money(r))}</small></button>`,
                    )
                    .join('') || '<p class="board-empty">No applications</p>'
                }</section>`,
            )
            .join('')}</div>`
  }</section>`;
}
function interviews(state, ui) {
  const rows = state.interviews.filter((r) => r.archived === ui.interviewArchived),
    dated = rows.filter((r) => r.start).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    unscheduled = rows.filter((r) => !r.start);
  return `<div class="section-heading"><p>All times are Philippine Standard Time (UTC+8).</p><label><input id="show-interview-archived" type="checkbox" ${ui.interviewArchived ? 'checked' : ''}> Show archived</label></div><h2 class="group-title">Dated conversations <span>${dated.length}</span></h2><div class="meeting-grid">${dated.map(meeting).join('') || empty('No dated conversations.', 'Add the schedule from your invitation.')}</div><h2 class="group-title">Awaiting a date <span>${unscheduled.length}</span></h2><div class="meeting-grid">${unscheduled.map(meeting).join('') || empty('Nothing waiting.', 'Unscheduled screening conversations appear here.')}</div>`;
}
function actions(state) {
  const rows = getActions(state),
    pending = rows.filter((r) => r.action === 'complete'),
    rest = rows.filter((r) => r.action !== 'complete');
  return `<div class="action-summary">${icon('bolt')}<div><strong>${rows.length} ${rows.length === 1 ? 'step' : 'steps'} to keep things moving</strong><p>Open a record to finish the next step, update its status or schedule a follow-up.</p></div></div><section class="panel"><div class="panel-title"><div><h2>Pending applications <span class="count">${pending.length}</span></h2><p>Held, blocked or still being prepared.</p></div></div>${pending.length ? actionRows(pending) : empty('No pending applications.', 'All active records have a recorded submission.')}</section><section class="panel spaced"><div class="panel-title"><div><h2>Preparation & follow-ups <span class="count">${rest.length}</span></h2><p>Upcoming preparation and follow-ups that are due.</p></div></div>${rest.length ? actionRows(rest) : empty('A clear runway.', 'Upcoming preparation and due follow-ups appear here.')}</section>`;
}
const field = (label, name, value = '', type = 'text', extra = '') =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const area = (label, name, value = '', extra = '') =>
  `<label class="field full">${label}<textarea name="${name}" rows="3" ${extra}>${esc(value)}</textarea></label>`;
const options = (label, name, values, value) =>
  `<label class="field">${label}<select name="${name}">${values.map((s) => `<option ${s === value ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>`;
export function applicationForm(row = {}) {
  return `<form id="record-form" data-kind="application"><input type="hidden" name="id" value="${esc(row.id)}"><div class="dialog-header"><div><p class="eyebrow">OPPORTUNITY DETAILS</p><h2 id="dialog-title">${row.id ? 'Edit application' : 'A new opportunity'}</h2></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body"><div class="form-error" role="alert"></div><div class="fields">${field('Company *', 'company', row.company, 'text', 'required maxlength="200"')}${field('Role *', 'role', row.role, 'text', 'required maxlength="300"')}${field('Platform', 'platform', row.platform, 'text', 'list="platforms"')}<datalist id="platforms"><option>LinkedIn</option><option>Indeed</option><option>Jobstreet</option><option>Bossjob</option><option>Mynimo</option><option>Direct</option></datalist>${field('Location / work setup', 'location', row.location)}${options('Stage', 'stage', STAGES, row.stage || 'Draft')}${field('Job posting URL', 'url', row.url, 'url', 'placeholder="https://…"')}<div class="field full confirmation-box"><label><input name="confirmed" type="checkbox" ${row.confirmed ? 'checked' : ''}> Submission is confirmed</label><small>Check only after you see a submission confirmation. Draft and blocked stages stay unconfirmed.</small><label><input name="campaign" type="checkbox" ${row.campaign ? 'checked' : ''}> Include in my application goal</label><small>Only confirmed, active applications count toward the goal.</small></div>${field('Applied date (if known)', 'appliedDate', row.appliedDate, 'date')}${field('Last verified date', 'verifiedDate', row.verifiedDate, 'date')}${field('Expected PHP / month', 'salaryPHP', row.salaryPHP, 'number', 'min="0" step="any"')}${field('Expected USD / month', 'salaryUSD', row.salaryUSD, 'number', 'min="0" step="any"')}${field('Salary notes / other currency', 'salaryNote', row.salaryNote)}${field('Tailored résumé filename', 'resumeName', row.resumeName)}${field('Cover letter status', 'coverStatus', row.coverStatus, 'text', 'placeholder="e.g. Attached, Draft, Not prepared"')}${field('Follow-up date', 'followUpDate', row.followUpDate, 'date')}${area('Next action / blocker', 'nextAction', row.nextAction)}${area('Notes', 'notes', row.notes)}<p class="field-hint full">A résumé filename records what was used. Documents are not uploaded or stored by this app.</p></div>${link(row.url, 'Open job posting', 'record-link')}</div><div class="dialog-footer">${row.id ? `<button type="button" class="button quiet" data-archive="application" data-record-id="${esc(row.id)}" data-archived="${!row.archived}">${icon(row.archived ? 'refresh' : 'archive')}${row.archived ? 'Restore' : 'Archive'}</button>` : '<span></span>'}<div><button type="button" class="button" data-action="close-dialog">Cancel</button><button class="button primary" type="submit">${icon('check')} Save application</button></div></div></form>`;
}
function localTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const v = (k) => p.find((a) => a.type === k).value;
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}
export function interviewForm(row = {}) {
  return `<form id="record-form" data-kind="interview"><input type="hidden" name="id" value="${esc(row.id)}"><div class="dialog-header"><div><p class="eyebrow">CONVERSATION DETAILS</p><h2 id="dialog-title">${row.id ? 'Interview & preparation' : 'Plan a conversation'}</h2></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body"><div class="form-error" role="alert"></div><div class="fields">${field('Company *', 'company', row.company, 'text', 'required')}${field('Role / purpose *', 'role', row.role, 'text', 'required')}${options('Type', 'kind', ['Interview', 'Orientation', 'Screening'], row.kind || 'Interview')}${options('Status', 'stage', INTERVIEW_STAGES, row.stage || 'Awaiting schedule')}${field('Starts (Philippine time)', 'start', localTime(row.start), 'datetime-local')}${field('Ends (Philippine time)', 'end', localTime(row.end), 'datetime-local')}<p class="field-hint full">All times use Asia/Manila (UTC+8). For meetings past midnight, use the next day for the end date. Leave both blank for unscheduled conversations.</p>${field('Meeting URL', 'url', row.url, 'url')}${field('Recruiter', 'recruiter', row.recruiter)}${field('Recruiter email / contact', 'contact', row.contact)}${field('Follow-up date', 'followUpDate', row.followUpDate, 'date')}${options('Preparation', 'prepStatus', ['Not started', 'In progress', 'Ready'], row.prepStatus || 'Not started')}${area('Preparation notes', 'prepNotes', row.prepNotes, 'placeholder="Projects to discuss, questions to ask, camera and audio check…"')}${area('Conversation notes / next steps', 'notes', row.notes)}</div>${link(row.url, 'Open meeting link', 'record-link')}</div><div class="dialog-footer">${row.id ? `<button type="button" class="button quiet" data-archive="interview" data-record-id="${esc(row.id)}" data-archived="${!row.archived}">${icon(row.archived ? 'refresh' : 'archive')}${row.archived ? 'Restore' : 'Archive'}</button>` : '<span></span>'}<div><button type="button" class="button" data-action="close-dialog">Cancel</button><button class="button primary" type="submit">${icon('check')} Save conversation</button></div></div></form>`;
}
export function settingsForm(state, recoveryData) {
  return `<form id="settings-form"><div class="dialog-header"><div><p class="eyebrow">YOUR WORKSPACE</p><h2 id="dialog-title">Settings & backup</h2></div><button type="button" class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body"><div class="form-error" role="alert"></div><div class="notice">${icon('shield')}<div><strong>Private, saved ${typeof window !== 'undefined' && window.easyappyNative ? 'on this Mac' : 'in this browser'}</strong><p>Your edits are stored on this device. Desktop Gmail connections can capture email confirmations; there is no direct job-site or Google Calendar sync. Download a backup regularly before clearing local data or moving to another device.</p></div></div><div class="fields">${field('Application goal', 'goal', state.settings.goal, 'number', 'required min="1" max="1000000" step="1"')}${field('Default follow-up after (days)', 'followUpDays', state.settings.followUpDays, 'number', 'required min="1" max="365" step="1"')}</div><p class="field-hint">Follow-ups are calculated only when an applied date is known. A custom follow-up date takes priority.</p><div class="backup-box"><h3>Keep a copy. Keep your progress.</h3><p>Export all records and preparation notes as a JSON file. Import a backup to merge records or replace this browser’s workspace after reviewing the totals.</p><div class="inline-actions"><button type="button" class="button" data-action="export">${icon('download')} Download backup</button><button type="button" class="button" data-action="import">${icon('upload')} Import backup</button></div></div>${recoveryData !== null ? `<div class="notice error"><div><h3>Saved-data recovery</h3><p>The original unreadable browser data is preserved. Download it first. Replacing it saves the workspace you currently see and overwrites the unreadable copy.</p><div class="inline-actions"><button type="button" class="button" data-action="recover">Download original data</button><button type="button" class="button" data-action="replace-corrupt">Replace unreadable data</button></div></div></div>` : ''}<p class="field-hint">New workspaces start empty. Imports are validated before saving. Unknown dates stay blank. Archiving hides records without deleting them.</p></div><div class="dialog-footer"><span></span><div><button type="button" class="button" data-action="close-dialog">Cancel</button><button type="submit" class="button primary">Save settings</button></div></div></form>`;
}
export function importForm(incoming, current) {
  const m = metrics(incoming);
  return `<div class="dialog-header"><div><p class="eyebrow">BACKUP VALIDATED</p><h2 id="dialog-title">Choose how to import</h2></div><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body"><div class="form-error" role="alert"></div><p>This backup contains <strong>${incoming.applications.length} applications</strong> (${m.confirmed} active confirmed) and <strong>${incoming.interviews.length} conversations</strong>.</p><p>Your current workspace has ${current.applications.length} applications and ${current.interviews.length} conversations. Archived records are included.</p><div class="import-options"><button class="import-choice" data-action="merge-import"><strong>Merge with this workspace ${icon('plus')}</strong><span>Add new IDs and update matching IDs with the backup’s records. Backup settings replace current settings.</span></button><button class="import-choice" data-action="replace-import"><strong>Replace this workspace ${icon('refresh')}</strong><span>Replace every current record and settings with this backup. Download a backup of your current workspace first.</span></button></div></div><div class="dialog-footer"><button class="button" data-action="export">Back up current workspace</button><button class="button" data-action="close-dialog">Cancel</button></div>`;
}
