import { phtDate, safeURL, saveApplication, validateState } from './model.js';

const tidy = (value) =>
  String(value ?? '')
    .replace(/\r/g, '')
    .trim();
const normalized = (value) =>
  tidy(value)
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const cleanLabel = (value) => tidy(value).replace(/[.\s]+$/, '');
function decode(value) {
  try {
    const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
    );
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}
function entities(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[\da-f]+|\d+);/gi, (item) => {
    const names = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': ' ',
    };
    if (item[1] !== '#') return names[item.toLowerCase()] || item;
    const code =
      item[2].toLowerCase() === 'x' ? parseInt(item.slice(3, -1), 16) : Number(item.slice(2, -1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}
function htmlText(value) {
  return entities(
    value
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<(?:br|\/p|\/div|\/tr|\/li)\b[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, ' '),
  );
}
function readParts(payload, result = { plain: [], html: [] }) {
  if (!payload || typeof payload !== 'object') return result;
  if (payload.body?.data) {
    const decoded = decode(payload.body.data);
    if (payload.mimeType === 'text/html') result.html.push(decoded);
    else if (!payload.mimeType || payload.mimeType === 'text/plain') result.plain.push(decoded);
  }
  if (Array.isArray(payload.parts)) for (const part of payload.parts) readParts(part, result);
  return result;
}
function provider(from) {
  const domain =
    from
      .match(/[^\s<>@]+@([^\s<>]+)/)?.[1]
      ?.toLowerCase()
      .replace(/[>,;]+$/, '') || '';
  for (const [name, domains] of [
    ['LinkedIn', ['linkedin.com']],
    ['Indeed', ['indeed.com', 'indeedemail.com']],
    ['Jobstreet', ['jobstreet.com', 'seek.com', 'seek.com.au']],
  ]) {
    if (domains.some((suffix) => domain === suffix || domain.endsWith('.' + suffix))) return name;
  }
  return '';
}
function canonicalJobURL(value) {
  const safe = safeURL(value);
  if (!safe) return '';
  const url = new URL(safe),
    host = url.hostname.toLowerCase();
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    const id = url.pathname.match(/\/jobs\/view\/(\d+)(?:\/|$)/)?.[1];
    return id ? `https://www.linkedin.com/jobs/view/${id}/` : '';
  }
  if (host === 'indeed.com' || host.endsWith('.indeed.com')) {
    const id = url.searchParams.get('jk') || url.searchParams.get('vjk');
    return id && /^[\da-z]+$/i.test(id) ? `https://ph.indeed.com/viewjob?jk=${id}` : '';
  }
  if (host === 'jobstreet.com' || host.endsWith('.jobstreet.com')) {
    const id = url.pathname.match(/\/job\/(\d+)(?:\/|$)/)?.[1];
    return id ? `https://ph.jobstreet.com/job/${id}` : '';
  }
  return '';
}
function jobURL(text) {
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const candidate = canonicalJobURL(entities(match[0]).replace(/[).,;]+$/, ''));
    if (candidate) return candidate;
  }
  return '';
}
function jobIdentity(url) {
  const canonical = canonicalJobURL(url);
  if (!canonical) return '';
  const parsed = new URL(canonical);
  if (parsed.hostname.includes('linkedin')) return `linkedin:${parsed.pathname.match(/\d+/)[0]}`;
  if (parsed.hostname.includes('indeed')) return `indeed:${parsed.searchParams.get('jk')}`;
  return `jobstreet:${parsed.pathname.match(/\d+/)[0]}`;
}
function emailDate(message, dateHeader) {
  const input =
    message.internalDate && /^\d+$/.test(String(message.internalDate))
      ? Number(message.internalDate)
      : message.date || dateHeader;
  if (!input) return '';
  const date = new Date(input);
  return Number.isFinite(date.getTime()) ? phtDate(date) : '';
}
function extractLabels(subject, text) {
  let company = '',
    role = '';
  const patterns = [
    /^Your application for (.+?) at (.+?)(?: (?:has been|was|is) (?:submitted|sent|received)|$)/i,
    /^Your application for (.+?) has been (?:submitted|sent) to (.+)$/i,
    /^(?:Application (?:submitted|sent|received)\s*:\s*|You applied for\s+|(?:Job |Employment )?offer\s*:\s*)(.+?) at (.+)$/i,
    /^Your application to (.+?) for (.+?) has been (?:submitted|sent)[.!]?$/i,
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = subject.match(patterns[i]);
    if (match) {
      [role, company] = i === 3 ? [match[2], match[1]] : [match[1], match[2]];
      break;
    }
  }
  const received = subject.match(/^(.+?) received your application for (.+)$/i);
  if (received) {
    company = received[1];
    role = received[2];
  }
  company ||=
    subject.match(/^Your application (?:was |has been )?(?:sent|submitted) to (.+)$/i)?.[1] ||
    subject.match(/^Your application to (.+?) has been (?:submitted|sent)[.!]?$/i)?.[1] ||
    '';
  const lines = text.split('\n').map(tidy).filter(Boolean);
  role ||=
    lines
      .find((line) => /^(?:Job title|Position|Role)\s*:/i.test(line))
      ?.replace(/^(?:Job title|Position|Role)\s*:\s*/i, '') || '';
  company ||=
    lines.find((line) => /^Company\s*:/i.test(line))?.replace(/^Company\s*:\s*/i, '') || '';
  company ||=
    lines
      .find((line) => /^Your application (?:was |has been )?(?:sent|submitted) to /i.test(line))
      ?.replace(/^Your application (?:was |has been )?(?:sent|submitted) to /i, '') || '';
  if (company && !role) {
    role =
      lines.find(
        (line) =>
          line.length < 180 &&
          !/^https?:|^(?:your application|company:|hi |dear |thank|view |apply |application )/i.test(
            line,
          ) &&
          normalized(line) !== normalized(company) &&
          /\b(?:developer|engineer|architect|analyst|designer|specialist|manager|assistant|consultant|lead|programmer|scientist|administrator)\b/i.test(
            line,
          ),
      ) || '';
  }
  return { company: cleanLabel(company), role: cleanLabel(role) };
}

/** Returns an inert candidate or null; no mailbox content is rendered as HTML. */
export function parseEmail(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return null;
  if (
    Array.isArray(message.labelIds) &&
    (message.labelIds.includes('SENT') || message.labelIds.includes('DRAFT'))
  )
    return null;
  const headers = Array.isArray(message.payload?.headers) ? message.payload.headers : [];
  const header = (name) =>
    tidy(
      headers.find((row) => typeof row?.name === 'string' && row.name.toLowerCase() === name)
        ?.value,
    );
  const subject = tidy(message.subject || header('subject')),
    from = tidy(message.from || header('from'));
  const parts = readParts(message.payload),
    html = parts.html.join('\n');
  const text = tidy(
    message.text ||
      [parts.plain.join('\n'), htmlText(html)].filter(Boolean).join('\n') ||
      message.snippet,
  );
  const combined = `${subject}\n${text}`;
  if (!subject && !text) return null;
  if (provider(from) === 'Indeed' && /^Indeed Job Alert\b/i.test(text)) return null;
  // These can contain quoted confirmation language, but they are opportunities, not submissions.
  if (
    /\b(?:job alerts?|jobs you may|recommended jobs?|job recommendations?|saved job|top applicant|still available|jobs? that match|new jobs? for you|apply now)\b/i.test(
      subject,
    )
  )
    return null;
  const rejected =
    /\b(?:not (?:be )?(?:moving|proceeding) forward|regret to inform|unsuccessful|application (?:was |has been )?(?:rejected|declined)|other candidates|not been selected)\b/i.test(
      combined,
    );
  const invited =
    /\b(?:interview|orientation|pre[- ]screening|assessment)\b/i.test(subject) ||
    /\b(?:schedule|choose a time|invite you).{0,45}\binterview\b/i.test(text);
  const offered =
    /\b(?:job offer|employment offer|offer letter)\b/i.test(combined) ||
    /\b(?:pleased|delighted|happy) to offer you\b/i.test(text);
  const relevant = /\bapplication\b|\byou applied\b/i.test(combined);
  if (!relevant && !invited && !rejected && !offered) return null;
  const source = provider(from),
    labels = extractLabels(subject, text);
  let currentReceipt = false;
  if (
    source === 'Jobstreet' &&
    /^Your application was successfully submitted[.!]?$/i.test(subject)
  ) {
    const receipt =
      text.match(
        /(?:^|\n)Your application for ([\s\S]{1,250}?) was successfully\s+submitted to ([\s\S]{1,250}?)\.(?:\s|$)/i,
      ) ||
      text.match(
        /\bYour application for ([^\n]{1,250}?) was successfully\s+submitted to ([^\n]+)/i,
      );
    if (receipt) {
      labels.role = cleanLabel(receipt[1].replace(/\s+/g, ' '));
      labels.company = cleanLabel(receipt[2].replace(/\s+/g, ' '));
      const lines = text.split('\n').map(tidy).filter(Boolean);
      const fullLabel = lines.find(
        (line, index) =>
          index > 0 &&
          normalized(lines[index - 1]) === normalized(labels.role) &&
          normalized(line).startsWith(normalized(labels.company)) &&
          line.length <= 250,
      );
      if (fullLabel) labels.company = cleanLabel(fullLabel);
      currentReceipt = true;
    }
  }
  if (source === 'Indeed' && /^Indeed Application:\s*\S/i.test(subject)) {
    const receipt = text
      .replace(/\s+/g, ' ')
      .match(/The following items were sent to (.{1,250}?)\. Good luck!/i);
    if (receipt) {
      labels.role = cleanLabel(subject.replace(/^Indeed Application:\s*/i, ''));
      labels.company = cleanLabel(receipt[1]);
      currentReceipt = true;
    }
  }
  const confirmation =
    currentReceipt ||
    /\bYour application (?:for .+? at .+? )?(?:was |has been )?(?:sent|submitted|received)\b|\bYour application to .+? has been (?:submitted|sent)\b|^You applied for\b|^Application (?:submitted|sent|received)\s*:|^.+? received your application for\b|^Your application for .+? has been (?:submitted|sent) to\b/i.test(
      combined,
    );
  const messageId = tidy(message.id);
  const high = Boolean(
    messageId &&
    source &&
    confirmation &&
    labels.company &&
    labels.role &&
    !rejected &&
    !invited &&
    !offered &&
    !/^(?:re|fw|fwd):/i.test(subject),
  );
  // An outgoing pitch from an ordinary account is not an inbound acknowledgment.
  if (
    !source &&
    !invited &&
    !rejected &&
    !offered &&
    !/\b(?:received your application|application .{0,60}(?:received|submitted|sent)|thank you for applying)\b/i.test(
      combined,
    )
  )
    return null;
  const kind = rejected ? 'rejection' : invited ? 'interview' : high ? 'application' : 'review';
  return {
    id: `gmail:${messageId}`,
    messageId,
    kind,
    confidence: high ? 'high' : 'review',
    ...labels,
    url: jobURL(text + '\n' + html),
    date: emailDate(message, header('date')),
    stage: high
      ? 'Applied'
      : rejected
        ? 'Rejected'
        : invited
          ? 'Interview'
          : offered
            ? 'Offer'
            : 'Information required',
    subject,
    from,
    platform: source || 'Email',
    reason: high
      ? 'Exact job-board confirmation with employer and role.'
      : rejected
        ? 'Rejection needs review before changing an existing record.'
        : invited
          ? 'Invitation or screening message: confirm the schedule and role.'
          : offered
            ? 'Offer message needs review before changing application status.'
            : 'Application-related message needs review; confirmation or identifying details are incomplete.',
  };
}

/** Auto-import only unambiguous confirmations. Campaign membership remains an explicit user decision. */
export function applyCandidates(state, candidates, { autoOnly = true } = {}) {
  let next = validateState(state),
    added = 0,
    updated = 0;
  const review = [];
  if (!Array.isArray(candidates)) throw new Error('Email candidates must be an array.');
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (
      candidate.confidence !== 'high' ||
      candidate.kind !== 'application' ||
      !candidate.company ||
      !candidate.role ||
      !candidate.messageId
    ) {
      review.push(candidate);
      continue;
    }
    // autoOnly=false still does not infer confirmation from an ambiguous candidate.
    void autoOnly;
    const canonical = canonicalJobURL(candidate.url),
      jobId = jobIdentity(canonical),
      marker = `[Gmail message: ${candidate.messageId}]`;
    let match = next.applications.find(
      (row) => row.id === jobId || (canonical && canonicalJobURL(row.url) === canonical),
    );
    if (!match) {
      const matches = next.applications.filter(
        (row) =>
          (!canonical || !canonicalJobURL(row.url)) &&
          normalized(row.company) === normalized(candidate.company) &&
          normalized(row.role) === normalized(candidate.role),
      );
      if (matches.length > 1) {
        review.push({
          ...candidate,
          reason: 'Multiple applications match this employer and role; choose the exact job.',
        });
        continue;
      }
      match = matches[0];
    }
    if (match?.notes.includes(marker)) continue;
    const evidence = `${marker} Confirmation email: ${candidate.subject}${candidate.date ? ' · received ' + candidate.date + ' PHT' : ''}.`;
    if (match) {
      const later = ['Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'].includes(
        match.stage,
      );
      next = saveApplication(next, {
        id: match.id,
        stage: later ? match.stage : 'Applied',
        confirmed: true,
        url: match.url || canonical,
        verifiedDate:
          candidate.date && (!match.verifiedDate || candidate.date > match.verifiedDate)
            ? candidate.date
            : match.verifiedDate,
        notes: [match.notes, evidence].filter(Boolean).join('\n'),
      });
      updated++;
    } else {
      next = saveApplication(next, {
        id: jobId || `gmail:${candidate.messageId}`,
        company: candidate.company,
        role: candidate.role,
        platform: candidate.platform || 'Email',
        url: canonical,
        stage: 'Applied',
        confirmed: true,
        campaign: false,
        verifiedDate: candidate.date || '',
        appliedDate: '',
        coverStatus: 'Not established by email',
        notes: evidence,
      });
      added++;
    }
  }
  return { state: next, added, updated, review };
}
