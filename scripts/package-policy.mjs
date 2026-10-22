// Packager does not apply .gitignore. Admit only the generated runtime,
// production dependencies (pruned by Packager), and application manifest.
export const packageIgnore = [
  /^\/(?!dist(?:\/|$)|node_modules(?:\/|$)|package\.json$).+/,
  /(?:^|\/)\.env(?:\.[^/]*)?$/,
  /(?:^|\/)(?:credentials[^/]*|client_secret[^/]*)\.json$/i,
  /\.encrypted(?:\.tmp)?$/i,
];
