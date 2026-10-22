import { packager } from '@electron/packager';
import { packageIgnore } from './package-policy.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
if (process.platform !== 'darwin')
  throw new Error('Mac packaging and local code signing must run on macOS.');
const root = fileURLToPath(new URL('../', import.meta.url));
const bundles = await packager({
  dir: root,
  name: 'EasyAppy',
  platform: 'darwin',
  arch: 'arm64',
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
