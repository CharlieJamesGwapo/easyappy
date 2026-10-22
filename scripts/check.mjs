import { readdir, readFile, stat, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}
const files = (
  await Promise.all(['src', 'scripts', 'tests'].map((d) => walk(path.join(root, d))))
).flat();
for (const file of files.filter((f) => /\.(?:mjs|cjs|js)$/.test(f)))
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
for (const required of [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/architecture.md',
  'docs/desktop-setup.md',
  '.github/workflows/ci.yml',
])
  await access(path.join(root, required));
const markdown = [
  path.join(root, 'README.md'),
  path.join(root, 'CONTRIBUTING.md'),
  path.join(root, 'SECURITY.md'),
  ...(await walk(path.join(root, 'docs'))).filter((f) => f.endsWith('.md')),
];
let links = 0;
for (const file of markdown) {
  const text = (await readFile(file, 'utf8')).replace(/```[\s\S]*?```/g, '');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    if (path.isAbsolute(target))
      throw new Error('Nonportable absolute documentation link in ' + path.relative(root, file));
    await stat(path.resolve(path.dirname(file), decodeURIComponent(target)));
    links++;
  }
}
const diagrams = (await walk(path.join(root, 'docs/diagrams'))).filter((f) => f.endsWith('.mmd'));
if (diagrams.length < 3)
  throw new Error('Expected architecture, OAuth and capture-flow diagram sources.');
for (const diagram of diagrams) {
  const text = await readFile(diagram, 'utf8');
  if (!/^(flowchart|sequenceDiagram|erDiagram)/.test(text.trim()))
    throw new Error('Unsupported Mermaid diagram: ' + diagram);
}
console.log(
  `Syntax and structure checks pass; ${links} portable documentation links and ${diagrams.length} Mermaid sources checked.`,
);
