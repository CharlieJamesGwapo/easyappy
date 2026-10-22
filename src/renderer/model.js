// Pure state model. Dates without evidence stay empty; a status label is not proof of submission.
export const STAGES = Object.freeze([
  'Draft',
  'Verification required',
  'Sign-in required',
  'Information required',
  'On hold',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
]);
export const INTERVIEW_STAGES = Object.freeze([
  'Invited',
  'Scheduled',
  'Needs confirmation',
  'Attended',
  'Completed',
  'Awaiting schedule',
  'Pre-screening',
  'Cancelled',
]);
const PENDING = new Set(STAGES.slice(0, 5));
const INTERVIEW_ACTIVE = new Set(['Invited', 'Scheduled', 'Needs confirmation']);
const TERMINAL = new Set(['Rejected', 'Withdrawn']);
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
function fail(message) {
  throw new Error(message);
}
function text(value, field, fallback = '') {
  if (value == null) return fallback;
  if (typeof value !== 'string') fail(`${field} must be text.`);
  return value.trim();
}
function boolean(value, field, fallback = false) {
  if (value == null) return fallback;
  if (typeof value !== 'boolean') fail(`${field} must be true or false.`);
  return value;
}
function required(value, field) {
  const result = text(value, field);
  if (!result) fail(`${field} is required.`);
  return result;
}
function day(value, field) {
  const result = text(value, field);
  if (
    result &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(result) ||
      !Number.isFinite(Date.parse(`${result}T00:00:00Z`)) ||
      new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) !== result)
  )
    fail(`${field} must be a valid YYYY-MM-DD date.`);
  return result;
}
function instant(value, field) {
  const result = text(value, field);
  if (!result) return '';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(result))
    fail(`${field} must include an explicit timezone offset.`);
  day(result.slice(0, 10), field);
  const clock = result.slice(11).match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (Number(clock[1]) > 23 || Number(clock[2]) > 59 || Number(clock[3] || 0) > 59)
    fail(`${field} must be a valid date and time.`);
  if (!Number.isFinite(Date.parse(result))) fail(`${field} must be a valid date and time.`);
  return result;
}
function money(value, field) {
  if (value == null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    fail(`${field} must be a non-negative number.`);
  return value;
}
export function safeURL(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim())) return '';
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : '';
  } catch {
    return '';
  }
}
function normalizeApplication(record) {
  if (!plain(record)) fail('Each application must be an object.');
  const id = required(record.id, 'Application id');
  const stage = text(record.stage, 'Application stage', 'Draft');
  if (!STAGES.includes(stage)) fail(`Invalid application stage: ${stage}.`);
  const submitted = boolean(record.confirmed, 'Application confirmed');
  return {
    id,
    company: required(record.company, 'Application company'),
    role: required(record.role, 'Application role'),
    platform: text(record.platform, 'Application platform'),
    url: safeURL(record.url),
    location: text(record.location, 'Application location'),
    stage,
    appliedDate: day(record.appliedDate, 'Application appliedDate'),
    verifiedDate: day(record.verifiedDate, 'Application verifiedDate'),
    confirmed: PENDING.has(stage) ? false : submitted,
    campaign: boolean(record.campaign, 'Application campaign'),
    salaryPHP: money(record.salaryPHP, 'Application salaryPHP'),
    salaryUSD: money(record.salaryUSD, 'Application salaryUSD'),
    salaryNote: text(record.salaryNote, 'Application salaryNote'),
    resumeName: text(record.resumeName, 'Application resumeName'),
    coverStatus: text(record.coverStatus, 'Application coverStatus'),
    notes: text(record.notes, 'Application notes'),
    nextAction: text(record.nextAction, 'Application nextAction'),
    followUpDate: day(record.followUpDate, 'Application followUpDate'),
    archived: boolean(record.archived, 'Application archived'),
    updatedAt: instant(record.updatedAt, 'Application updatedAt'),
  };
}
function normalizeInterview(record) {
  if (!plain(record)) fail('Each interview must be an object.');
  const stage = text(record.stage, 'Interview stage', 'Awaiting schedule');
  if (!INTERVIEW_STAGES.includes(stage)) fail(`Invalid interview stage: ${stage}.`);
  const start = instant(record.start, 'Interview start'),
    end = instant(record.end, 'Interview end');
  if (Boolean(start) !== Boolean(end))
    fail('Interview start and end must both be provided or both empty.');
  if (start && Date.parse(end) <= Date.parse(start)) fail('Interview end must be after its start.');
  return {
    id: required(record.id, 'Interview id'),
    company: required(record.company, 'Interview company'),
    role: required(record.role, 'Interview role'),
    kind: text(record.kind, 'Interview kind', 'Interview'),
    start,
    end,
    stage,
    url: safeURL(record.url),
    recruiter: text(record.recruiter, 'Interview recruiter'),
    contact: text(record.contact, 'Interview contact'),
    prepStatus: text(record.prepStatus, 'Interview prepStatus', 'Not started'),
    prepNotes: text(record.prepNotes, 'Interview prepNotes'),
    notes: text(record.notes, 'Interview notes'),
    followUpDate: day(record.followUpDate, 'Interview followUpDate'),
    archived: boolean(record.archived, 'Interview archived'),
  };
}
export function validateState(value) {
  if (!plain(value) || value.version !== 1) fail('Backup must be an EasyAppy version 1 state.');
  if (!Array.isArray(value.applications) || !Array.isArray(value.interviews))
    fail('Backup applications and interviews must be arrays.');
  if (!plain(value.settings)) fail('Backup settings must be an object.');
  const { goal, followUpDays } = value.settings;
  if (!Number.isSafeInteger(goal) || goal < 1 || goal > 1000000)
    fail('Goal must be a positive whole number up to 1,000,000.');
  if (!Number.isSafeInteger(followUpDays) || followUpDays < 1 || followUpDays > 365)
    fail('Follow-up days must be a whole number from 1 to 365.');
  const applications = value.applications.map(normalizeApplication),
    interviews = value.interviews.map(normalizeInterview),
    seen = new Set();
  for (const row of [...applications, ...interviews]) {
    if (seen.has(row.id)) fail(`Duplicate record id: ${row.id}.`);
    seen.add(row.id);
  }
  return { version: 1, applications, interviews, settings: { goal, followUpDays } };
}
export function metrics(state) {
  const apps = state.applications.filter((row) => !row.archived),
    meetings = state.interviews.filter((row) => !row.archived);
  return {
    total: apps.length,
    confirmed: apps.filter((row) => row.confirmed).length,
    pending: apps.filter((row) => !row.confirmed && !TERMINAL.has(row.stage)).length,
    campaign: apps.filter((row) => row.confirmed && row.campaign).length,
    interviews: meetings.filter(
      (row) => row.kind === 'Interview' && INTERVIEW_ACTIVE.has(row.stage),
    ).length,
    offers: apps.filter((row) => row.stage === 'Offer').length,
    archived: state.applications.length + state.interviews.length - apps.length - meetings.length,
  };
}
function save(state, record, key, normalizer) {
  const current = validateState(state);
  if (!plain(record)) fail('Record must be an object.');
  const id = record.id || globalThis.crypto.randomUUID();
  const index = current[key].findIndex((row) => row.id === id);
  const updated = normalizer({ ...current[key][index], ...record, id });
  const rows = [...current[key]];
  if (index < 0) rows.push(updated);
  else rows[index] = updated;
  return validateState({ ...current, [key]: rows });
}
export function saveApplication(state, record) {
  if (!plain(record)) fail('Record must be an object.');
  return save(
    state,
    { ...record, updatedAt: new Date().toISOString() },
    'applications',
    normalizeApplication,
  );
}
export function saveInterview(state, record) {
  return save(state, record, 'interviews', normalizeInterview);
}
export function archiveRecord(state, kind, id, archived = true) {
  const current = validateState(state),
    key = kind === 'application' ? 'applications' : kind === 'interview' ? 'interviews' : null;
  if (!key) fail('Record kind must be application or interview.');
  if (!current[key].some((row) => row.id === id)) fail(`Record not found: ${id}.`);
  return validateState({
    ...current,
    [key]: current[key].map((row) => (row.id === id ? { ...row, archived } : row)),
  });
}
export function mergeStates(current, incoming) {
  const left = validateState(current),
    right = validateState(incoming);
  const merge = (a, b) => Array.from(new Map([...a, ...b].map((row) => [row.id, row])).values());
  return validateState({
    ...left,
    applications: merge(left.applications, right.applications),
    interviews: merge(left.interviews, right.interviews),
    settings: right.settings,
  });
}
export function phtDate(now = new Date()) {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) fail('Invalid date.');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const field = (name) => parts.find((part) => part.type === name).value;
  return `${field('year')}-${field('month')}-${field('day')}`;
}
function addDays(date, amount) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}
export function getActions(state, today = phtDate()) {
  day(required(today, 'Today'), 'Today');
  const actions = [];
  const add = (record, kind, action, title, detail, date = '') =>
    actions.push({
      id: `${kind}:${record.id}:${action}`,
      kind,
      recordId: record.id,
      title,
      company: record.company,
      detail,
      priority: date && date < today ? 'high' : 'normal',
      date,
      action,
    });
  for (const row of state.applications.filter((item) => !item.archived)) {
    if (!row.confirmed && !TERMINAL.has(row.stage))
      add(
        row,
        'application',
        'complete',
        row.stage === 'On hold' ? 'Review held application' : 'Complete application',
        row.nextAction || `${row.role} · ${row.stage}`,
      );
    const due =
      row.followUpDate ||
      (row.confirmed && row.appliedDate && !TERMINAL.has(row.stage)
        ? addDays(row.appliedDate, state.settings.followUpDays)
        : '');
    if (due && due <= today && !TERMINAL.has(row.stage))
      add(row, 'application', 'follow-up', 'Follow up on application', row.role, due);
  }
  for (const row of state.interviews.filter(
    (item) => !item.archived && item.stage !== 'Cancelled',
  )) {
    const date = row.start ? phtDate(row.start) : '';
    if (row.stage === 'Needs confirmation' && !date)
      add(row, 'interview', 'confirm', 'Confirm interview details', row.role);
    if (
      date &&
      date >= today &&
      date <= addDays(today, 7) &&
      INTERVIEW_ACTIVE.has(row.stage) &&
      !['Ready', 'Complete', 'Completed'].includes(row.prepStatus)
    )
      add(
        row,
        'interview',
        'prepare',
        row.kind === 'Orientation' ? 'Prepare for orientation' : 'Prepare for interview',
        `${row.role} · ${row.stage}`,
        date,
      );
    if (row.followUpDate && row.followUpDate <= today)
      add(row, 'interview', 'follow-up', 'Follow up on conversation', row.role, row.followUpDate);
  }
  return actions.sort(
    (a, b) =>
      (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0) ||
      (a.date || '9999').localeCompare(b.date || '9999') ||
      a.company.localeCompare(b.company),
  );
}
