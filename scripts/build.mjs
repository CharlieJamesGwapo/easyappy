import { cp, mkdir, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
// This owned output directory is disposable; src and local user data are never removed.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['main', 'preload', 'renderer'])
  await cp(path.join(root, 'src', name), path.join(output, name), { recursive: true });
for (const file of [
  'main/index.cjs',
  'main/oauth.cjs',
  'preload/index.cjs',
  'renderer/index.html',
  'renderer/seed.json',
])
  await access(path.join(output, file));
console.log('Built dist/main, dist/preload and dist/renderer.');
