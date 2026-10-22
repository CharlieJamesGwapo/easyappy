const supported = ['arm64', 'x64'];
export function releaseNames(version, arch) {
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version) || !supported.includes(arch))
    throw new Error('Use a semantic version and an arm64 or x64 Mac target.');
  const stem = `EasyAppy-${version}-mac-${arch}`;
  return { zip: `${stem}.zip`, dmg: `${stem}.dmg` };
}
export function architectures(args) {
  if (!args.length) return ['arm64'];
  if (args.length !== 1 || !/^--arch=(arm64|x64|all)$/.test(args[0]))
    throw new Error('Use --arch=arm64, --arch=x64 or --arch=all.');
  const selected = args[0].slice('--arch='.length);
  return selected === 'all' ? [...supported] : [selected];
}
