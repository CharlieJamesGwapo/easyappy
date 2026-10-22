import { packageMac } from './package-mac.mjs';
import { releaseNames } from './release-policy.mjs';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, mkdtemp, copyFile, symlink, rm, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const output = path.join(root, 'release/artifacts');
const install = path.join(root, 'docs/install-macos.md');
await readFile(install); // Fail before building if installation guidance is missing.
await mkdir(output, { recursive: true });
await packageMac(['arm64', 'x64']);
const assets = [];
for (const arch of ['arm64', 'x64']) {
  const app = path.join(root, `release/EasyAppy-darwin-${arch}/EasyAppy.app`);
  const names = releaseNames(pkg.version, arch);
  const zip = path.join(output, names.zip),
    dmg = path.join(output, names.dmg);
  await rm(zip, { force: true });
  execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', app, zip], {
    stdio: 'inherit',
  });
  const stage = await mkdtemp(path.join(root, 'release/.dmg-stage-'));
  try {
    // ditto preserves framework symlinks and code signatures when copying app bundles.
    execFileSync('ditto', [app, path.join(stage, 'EasyAppy.app')]);
    await symlink('/Applications', path.join(stage, 'Applications'));
    await copyFile(install, path.join(stage, 'INSTALL-MAC.md'));
    await copyFile(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE.txt'));
    execFileSync(
      'hdiutil',
      [
        'create',
        '-volname',
        `EasyAppy ${pkg.version} ${arch}`,
        '-srcfolder',
        stage,
        '-ov',
        '-format',
        'UDZO',
        dmg,
      ],
      { stdio: 'inherit' },
    );
    execFileSync('hdiutil', ['verify', dmg], { stdio: 'inherit' });
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  assets.push(names.zip, names.dmg);
}
await copyFile(install, path.join(output, 'INSTALL-MAC.md'));
assets.push('INSTALL-MAC.md');
const sums = [];
for (const name of assets.sort()) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path.join(output, name))) hash.update(chunk);
  sums.push(`${hash.digest('hex')}  ${name}`);
}
await writeFile(path.join(output, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log('Release assets and SHA256SUMS.txt are ready in release/artifacts.');
