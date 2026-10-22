// Packager does not apply .gitignore. Admit only the generated runtime,
// production dependencies (pruned by Packager), application manifest and license.
export const packageIgnore = [
  /^\/(?!dist(?:\/|$)|node_modules(?:\/|$)|package\.json$|LICENSE$).+/,
  /(?:^|\/)\.env(?:\.[^/]*)?$/,
  /(?:^|\/)(?:credentials[^/]*|client_secret[^/]*)\.json$/i,
  /\.encrypted(?:\.tmp)?$/i,
];
