import { packager } from '@electron/packager';
import { packageIgnore } from './package-policy.mjs';
import { architectures, releaseNames } from './release-policy.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function packageMac(targets) {
  if (process.platform !== 'darwin')
    throw new Error('Mac packaging and local code signing must run on macOS.');
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  for (const target of targets) releaseNames(pkg.version, target);
  const bundles = await packager({
    dir: root,
    name: 'EasyAppy',
    platform: 'darwin',
    arch: targets,
    out: path.join(root, 'release'),
    overwrite: true,
    icon: path.join(root, 'assets/icons/EasyAppy.icns'),
    appBundleId: 'ph.easyappy.desktop',
    ignore: packageIgnore,
  });
  for (const bundle of bundles) {
    const app = path.join(bundle, 'EasyAppy.app');
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
    execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
    console.log('Built and locally signed ' + app);
  }
  return bundles;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await packageMac(architectures(process.argv.slice(2)));
