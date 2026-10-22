import { readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// A release boundary, not a general-purpose personal-information detector.
// Findings identify categories and paths; matching secret values are never printed.
export function inspectFile(filename, content) {
  const findings = [];
  const name = filename.replaceAll('\\', '/');
  if (
    /(?:^|\/)\.env[^/]*$|(?:^|\/)(?:credentials[^/]*|client_secret[^/]*)\.json$|\.encrypted(?:\.tmp)?$|\.(?:sqlite\d*|db|pdf|docx|csv)$|(?:^|\/)(?:backups|profiles|\.private|output)\//i.test(
      name,
    )
  )
    findings.push('private-artifact path');
  const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
  const secrets = [
    /GOCSPX-[A-Za-z0-9_-]{12,}/,
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
    /\bAIza[A-Za-z0-9_-]{30,}\b/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b\d{8,}-[A-Za-z0-9_-]{15,}\.apps\.googleusercontent\.com\b/,
  ];
  if (secrets.some((pattern) => pattern.test(text))) findings.push('credential-shaped value');
  if (name === 'src/renderer/seed.json') {
    try {
      const seed = JSON.parse(text);
      if (seed.applications?.length !== 0 || seed.interviews?.length !== 0)
        findings.push('public default seed must be empty');
    } catch {
      findings.push('invalid public seed');
    }
  }
  if (name === 'docs/demo.json') {
    const addresses = [...text.matchAll(/[\w.+-]+@([\w.-]+\.[a-z]{2,})/gi)];
    if (addresses.some(([, domain]) => !/^(?:[\w-]+\.)?example\.(?:com|org|net)$/i.test(domain)))
      findings.push('demo contact must use a reserved example domain');
    const links = [...text.matchAll(/https?:\/\/([\w.-]+)/gi)];
    if (links.some(([, domain]) => !/^(?:[\w-]+\.)?example\.(?:com|org|net)$/i.test(domain)))
      findings.push('demo links must use reserved example domains');
  }
  return findings;
}

async function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const history = process.argv.includes('--history');
  const git = (...args) => execFileSync('git', args, { cwd: root });
  const entries = [];
  if (history) {
    const seen = new Set();
    for (const commit of git('rev-list', '--all').toString().trim().split('\n').filter(Boolean)) {
      for (const row of git('ls-tree', '-rz', '--full-tree', commit)
        .toString()
        .split('\0')
        .filter(Boolean)) {
        const [, type, sha, name] = row.match(/^\d+ (\S+) (\S+)\t([\s\S]+)$/) || [];
        if (type !== 'blob' || seen.has(sha + ':' + name)) continue;
        seen.add(sha + ':' + name);
        entries.push({ name, content: git('cat-file', 'blob', sha) });
      }
    }
  } else {
    const names = new Set(
      git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
        .toString()
        .split('\0')
        .filter(Boolean),
    );
    for (const name of names) {
      try {
        await access(path.join(root, name));
      } catch {
        continue;
      }
      entries.push({ name, content: await readFile(path.join(root, name)) });
    }
  }
  const findings = entries.flatMap(({ name, content }) =>
    inspectFile(name, content).map((category) => ({ path: name, category })),
  );
  if (findings.length) {
    console.error(JSON.stringify({ checked: entries.length, findings }, null, 2));
    process.exitCode = 1;
  } else
    console.log(
      `Privacy boundary passes for ${entries.length} ${history ? 'historical file versions' : 'source files'}. Review screenshots and personal context separately before publishing.`,
    );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
