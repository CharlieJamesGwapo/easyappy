import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEmail, applyCandidates } from '../src/renderer/email-import.js';
import { saveApplication, metrics } from '../src/renderer/model.js';
const state = () => ({
  version: 1,
  applications: [],
  interviews: [],
  settings: { goal: 1000, followUpDays: 7 },
});
const mail = (changes = {}) => ({
  id: 'm1',
  subject: 'Your application for Backend Developer at Acme was sent',
  from: 'LinkedIn <jobs-noreply@linkedin.com>',
  date: 'Thu, 22 Oct 2026 01:00:00 +0800',
  text: 'Your application was sent to Acme\nBackend Developer\nAcme · Cebu, Philippines\nhttps://www.linkedin.com/jobs/view/4480000011/?trackingId=abc',
  ...changes,
});

test('recognizes exact LinkedIn confirmation and canonical job link without guessing an applied date', () => {
  const candidate = parseEmail(mail());
  assert.equal(candidate.confidence, 'high');
  assert.equal(candidate.kind, 'application');
  assert.equal(candidate.company, 'Acme');
  assert.equal(candidate.role, 'Backend Developer');
  assert.equal(candidate.url, 'https://www.linkedin.com/jobs/view/4480000011/');
  assert.equal(candidate.date, '2026-10-22');
  assert.equal(candidate.messageId, 'm1');
});
test('extracts company from LinkedIn subject and role from confirmation body', () => {
  const candidate = parseEmail(
    mail({
      subject: 'Your application was sent to Example Labs',
      text: 'Your application was sent to Example Labs\nFull Stack Engineer\nExample Labs · Remote\nView job\nhttps://www.linkedin.com/jobs/view/4480000022/',
    }),
  );
  assert.equal(candidate.confidence, 'high');
  assert.equal(candidate.company, 'Example Labs');
  assert.equal(candidate.role, 'Full Stack Engineer');
});
test('decodes multipart Gmail HTML and Indeed confirmation with PHT received date', () => {
  const body =
    '<div>Your application to Acme has been submitted.</div><p>Job title: Python Developer</p><p>Company: Acme</p><a href="https://ph.indeed.com/viewjob?jk=abc123&amp;from=email">View job</a>';
  const candidate = parseEmail({
    id: 'gmail2',
    internalDate: String(Date.parse('2026-10-21T17:00:00Z')),
    payload: {
      headers: [
        { name: 'Subject', value: 'Your application to Acme has been submitted' },
        { name: 'From', value: 'Indeed <noreply@indeed.com>' },
      ],
      parts: [{ mimeType: 'text/html', body: { data: Buffer.from(body).toString('base64url') } }],
    },
  });
  assert.equal(candidate.confidence, 'high');
  assert.equal(candidate.role, 'Python Developer');
  assert.equal(candidate.company, 'Acme');
  assert.equal(candidate.date, '2026-10-22');
  assert.equal(candidate.url, 'https://ph.indeed.com/viewjob?jk=abc123');
});
test('recognizes Jobstreet exact role/company confirmation', () => {
  const candidate = parseEmail(
    mail({
      from: 'Jobstreet <noreply@jobstreet.com>',
      subject: 'You applied for AI Automation Engineer at Bright Systems',
      text: 'Your application has been sent to Bright Systems.\nAI Automation Engineer\nhttps://ph.jobstreet.com/job/0000000001?ref=email',
    }),
  );
  assert.equal(candidate.confidence, 'high');
  assert.equal(candidate.company, 'Bright Systems');
  assert.equal(candidate.role, 'AI Automation Engineer');
  assert.equal(candidate.url, 'https://ph.jobstreet.com/job/0000000001');
});
test('recognizes the current wrapped Jobstreet successful-submission receipt', () => {
  const candidate = parseEmail(
    mail({
      from: 'Jobstreet <noreply@jobstreet.com>',
      subject: 'Your application was successfully submitted',
      text: 'Hi Sam, your application for Data Engineer was successfully\nsubmitted to Example Systems\nYour application for Data Engineer was successfully submitted to Example Systems.\nSimilar jobs you might like\nOther Developer\nAnother Company',
    }),
  );
  assert.equal(candidate.kind, 'application');
  assert.equal(candidate.company, 'Example Systems');
  assert.equal(candidate.role, 'Data Engineer');
});
test('recognizes Indeed application receipts using the explicit sent-items sentence', () => {
  const candidate = parseEmail(
    mail({
      from: 'Indeed <noreply@indeed.com>',
      subject: 'Indeed Application: Technical Support & Automation Specialist',
      text: 'Technical Support & Automation Specialist\nExample Systems\nPhilippines\nThe following items were sent to Example Systems. Good luck!\nApplication\nResume\nNever share financial info or take job offers without an interview.',
    }),
  );
  assert.equal(candidate.kind, 'application');
  assert.equal(candidate.company, 'Example Systems');
  assert.equal(candidate.role, 'Technical Support & Automation Specialist');
  assert.notEqual(
    parseEmail(
      mail({
        from: 'Indeed <noreply@indeed.com>',
        subject: 'Indeed Application: Technical Support',
        text: 'Your draft is saved. Complete your application.',
      }),
    )?.kind,
    'application',
  );
});
test('uses HTML confirmation details when the plain alternative omits the employer', () => {
  const candidate = parseEmail({
    id: 'multipart-real-template',
    payload: {
      headers: [
        { name: 'From', value: 'Indeed <noreply@indeed.com>' },
        { name: 'Subject', value: 'Indeed Application: Backend Engineer' },
      ],
      parts: [
        {
          mimeType: 'text/plain',
          body: {
            data: Buffer.from('Your application for Backend Engineer was sent.').toString(
              'base64url',
            ),
          },
        },
        {
          mimeType: 'text/html',
          body: {
            data: Buffer.from(
              '<p>The following items were sent to Example Systems. Good luck!</p>',
            ).toString('base64url'),
          },
        },
      ],
    },
  });
  assert.equal(candidate.kind, 'application');
  assert.equal(candidate.company, 'Example Systems');
});
test('prefers the complete Jobstreet sentence to a line-wrapped preheader company', () => {
  const candidate = parseEmail(
    mail({
      from: 'Jobstreet <noreply@jobstreet.com>',
      subject: 'Your application was successfully submitted',
      text: 'Hi Sam, your application for Backend Engineer was successfully\nsubmitted to Example\nSystems Pty Ltd\nYour application for Backend Engineer was successfully submitted to Example Systems Pty Ltd.\nSimilar jobs you might like',
    }),
  );
  assert.equal(candidate.company, 'Example Systems Pty Ltd');
  assert.equal(candidate.role, 'Backend Engineer');
});
test('retains punctuation within the employer label in the applied-job block', () => {
  const candidate = parseEmail(
    mail({
      from: 'Jobstreet <noreply@jobstreet.com>',
      subject: 'Your application was successfully submitted',
      text: 'Your application for Backend Engineer was successfully submitted to Example Systems Pte. Ltd.\nEach employer\nBackend Engineer\nExample Systems Pte. Ltd.\nApplied on 15 Oct',
    }),
  );
  assert.equal(candidate.company, 'Example Systems Pte. Ltd');
});
test('job recommendations, saved-job reminders and outgoing cover letters never become submissions', () => {
  for (const email of [
    mail({
      subject: 'Jobs you may be interested in: Backend Developer at Acme',
      text: 'Apply now. Your profile matches this role.',
    }),
    mail({
      subject: 'Your saved job at Acme is still available',
      text: 'Backend Developer\nApply now',
    }),
    mail({
      subject: 'You would be a top applicant at Acme',
      text: 'Your application was sent to Acme\nBackend Developer',
    }),
    mail({
      from: 'Demo Applicant <applicant@example.com>',
      subject: 'Application: Backend Developer at Acme',
      text: 'I am applying for Backend Developer at Acme. My CV is attached.',
    }),
    { ...mail(), labelIds: ['SENT'] },
  ])
    assert.equal(parseEmail(email), null);
});
test('interview invitations and rejections are review candidates without confirmed submission', () => {
  for (const [subject, kind] of [
    ['Interview invitation: Backend Developer at Acme', 'interview'],
    ['Update on your application for Backend Developer at Acme', 'rejection'],
  ]) {
    const candidate = parseEmail(
      mail({
        subject,
        text:
          kind === 'rejection'
            ? 'We regret to inform you that we will not be moving forward with your application.'
            : 'Please choose a time for your interview.',
      }),
    );
    assert.equal(candidate.confidence, 'review');
    assert.equal(candidate.kind, kind);
  }
  assert.equal(
    parseEmail(mail({ subject: 'Your application was sent to Acme', text: 'Thank you.' }))
      .confidence,
    'review',
  );
  assert.equal(
    parseEmail(
      mail({
        from: 'Recruiter <person@company.com>',
        subject: 'Your application for Backend Developer at Acme was sent',
      }),
    ).confidence,
    'review',
  );
});
test('missing and malformed messages are ignored or held for review without invented dates', () => {
  for (const value of [null, {}, [], { id: 'x', subject: 'Hello' }])
    assert.equal(parseEmail(value), null);
  const candidate = parseEmail(mail({ date: 'invalid' }));
  assert.equal(candidate.date, '');
  const missingId = parseEmail(mail({ id: '' }));
  assert.equal(missingId.confidence, 'review');
});
test('security strings are kept as inert text and unsupported URLs never become job links', () => {
  const candidate = parseEmail(
    mail({
      subject: 'Your application for <img src=x onerror=alert(1)> at Acme was sent',
      text: 'Your application was sent to Acme\nJob title: <img src=x onerror=alert(1)>\njavascript:alert(1)\nhttps://www.linkedin.com.evil.test/jobs/view/4480000011/',
    }),
  );
  assert.equal(candidate.role, '<img src=x onerror=alert(1)>');
  assert.equal(candidate.url, '');
  const imported = applyCandidates(state(), [candidate], { autoOnly: true });
  assert.equal(imported.state.applications[0].role, candidate.role);
});
test('applying candidates is idempotent and matches canonical URL or normalized company/role', () => {
  const candidate = parseEmail(mail());
  const one = applyCandidates(state(), [candidate], { autoOnly: true });
  assert.equal(one.added, 1);
  assert.equal(one.updated, 0);
  assert.equal(metrics(one.state).confirmed, 1);
  assert.equal(metrics(one.state).campaign, 0);
  assert.equal(one.state.applications[0].appliedDate, '');
  const two = applyCandidates(one.state, [candidate], { autoOnly: true });
  assert.equal(two.added, 0);
  assert.equal(two.updated, 0);
  assert.equal(two.state.applications.length, 1);
  const otherId = parseEmail(mail({ id: 'm2' }));
  const three = applyCandidates(two.state, [otherId], { autoOnly: true });
  assert.equal(three.added, 0);
  assert.equal(three.state.applications.length, 1);
  const original = saveApplication(state(), {
    id: 'prior',
    company: 'ACME',
    role: 'Backend Developer',
    stage: 'Draft',
  });
  const matched = applyCandidates(original, [candidate], { autoOnly: true });
  assert.equal(matched.added, 0);
  assert.equal(matched.updated, 1);
  assert.equal(matched.state.applications[0].id, 'prior');
  assert.equal(matched.state.applications[0].stage, 'Applied');
});
test('confirmations preserve later interview/offer/rejected stages and review candidates never auto-apply', () => {
  for (const stage of ['Interview', 'Offer', 'Rejected', 'Withdrawn']) {
    const original = saveApplication(state(), {
      id: 'prior',
      company: 'Acme',
      role: 'Backend Developer',
      stage,
      confirmed: true,
      campaign: true,
    });
    const result = applyCandidates(original, [parseEmail(mail())], { autoOnly: true });
    assert.equal(result.state.applications[0].stage, stage);
    assert.equal(result.state.applications[0].campaign, true);
  }
  const candidate = parseEmail(
    mail({
      subject: 'Interview invitation: Backend Developer at Acme',
      text: 'Please schedule an interview.',
    }),
  );
  const result = applyCandidates(state(), [candidate], { autoOnly: true });
  assert.equal(result.added, 0);
  assert.equal(result.review.length, 1);
  assert.equal(result.state.applications.length, 0);
});

test('different known job ids stay distinct even when role and employer match', () => {
  const first = applyCandidates(state(), [parseEmail(mail())], { autoOnly: true });
  const other = parseEmail(
    mail({
      id: 'm3',
      text: 'Your application was sent to Acme\nBackend Developer\nhttps://www.linkedin.com/jobs/view/4480000099/',
    }),
  );
  const result = applyCandidates(first.state, [other], { autoOnly: true });
  assert.equal(result.added, 1);
  assert.equal(result.state.applications.length, 2);
});
test('ambiguous existing company/role matches require review instead of selecting an arbitrary job', () => {
  let original = saveApplication(state(), {
    id: 'one',
    company: 'Acme',
    role: 'Backend Developer',
    stage: 'Applied',
    confirmed: true,
    url: 'https://www.linkedin.com/jobs/view/111/',
  });
  original = saveApplication(original, {
    id: 'two',
    company: 'Acme',
    role: 'Backend Developer',
    stage: 'Applied',
    confirmed: true,
    url: 'https://www.linkedin.com/jobs/view/222/',
  });
  const candidate = parseEmail(
    mail({ text: 'Your application was sent to Acme\nBackend Developer' }),
  );
  const result = applyCandidates(original, [candidate], { autoOnly: true });
  assert.equal(result.updated, 0);
  assert.equal(result.added, 0);
  assert.equal(result.review.length, 1);
});
test('malformed optional Gmail header and label containers cannot crash polling', () => {
  assert.equal(
    parseEmail({ id: 'bad', labelIds: {}, payload: { headers: [null, { name: 12, value: 'x' }] } }),
    null,
  );
});

test('offer messages stay available for review and never auto-confirm a submission', () => {
  const candidate = parseEmail(
    mail({
      id: 'offer',
      from: 'Recruiter <hr@acme.example>',
      subject: 'Job offer: Backend Developer at Acme',
      text: 'We are pleased to offer you the Backend Developer position. Please review the attached offer letter.',
    }),
  );
  assert.ok(candidate);
  assert.equal(candidate.confidence, 'review');
  assert.equal(candidate.stage, 'Offer');
  const result = applyCandidates(state(), [candidate], { autoOnly: true });
  assert.equal(result.added, 0);
  assert.equal(result.review.length, 1);
  assert.equal(metrics(result.state).confirmed, 0);
});

test('Indeed body-labelled job alerts stay out of review even when listings mention applications', () => {
  assert.equal(
    parseEmail(
      mail({
        from: 'Indeed <noreply@indeed.com>',
        subject:
          'Frontend Developer at Example. 5 more application developer jobs in Work from Home',
        text: 'Indeed Job Alert\n6 new application developer jobs in Work from Home\nFrontend Developer\nApply to maintain applications.',
      }),
    ),
    null,
  );
});
