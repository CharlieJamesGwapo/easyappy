# Contributing to EasyAppy

Use Node.js 24+ and npm. Pure model tests and the build run on Linux CI; Mac packages target Apple Silicon ARM64 and Intel x64 on macOS 13 or later; Intel runtime testing requires separate Intel hardware.

```sh
npm ci
npm run verify
npm start
```

Edit `src/`, not generated `dist/` or `release/`. `npm run build` recreates the runtime. `npm run preview` serves the renderer without native account connections. See the [architecture](docs/architecture.md) and [product flow](docs/product-flow.md) before changing cross-process behavior.

## Code boundaries

Keep privileged filesystem, OAuth and token-bearing network operations in `src/main/`. Expose only named, validated operations through `src/preload/`; do not expose arbitrary filesystem access, HTTP requests or `ipcRenderer`. Keep model, validation and parsing rules independently testable in the renderer modules.

Use the model and persistence APIs rather than mutating stored records from a view. Preserve unknown dates, explicit submission confirmation, distinct known job IDs, safe external links, cross-midnight schedules and failed-save recovery. A repeated email receipt must not become a second application. Uncertain identity or timing belongs in review.

## Testing a change

Add a focused regression test for a meaningful behavior change. Use fictional employers, reserved example domains and invented identifiers. Never record a real mailbox response, recruiter contact, résumé, calendar invitation, OAuth client or account token as a fixture.

```sh
npm run verify
npm audit --omit=dev
```

For native/authentication/packaging changes, also run `npm run package:mac` on macOS and open the resulting app in an isolated test profile. Use your own provider registration if testing OAuth; never commit its credentials. GitHub Actions does not authorize a live provider account or validate macOS signing.

Use `npm run format` for supported source files and commit the lockfile when dependencies change. Keep scope focused and describe the resulting behavior and relevant checks in your pull request.

## Privacy before committing

The public seed and screenshots must remain synthetic. Review staged files for personal data as well as secrets: a real employer/role history, email evidence, interview URL or backup is sensitive even when it contains no API key. Keep `.env` files, provider downloads, user profiles, exports and screenshots from real accounts outside Git.

Follow [SECURITY.md](SECURITY.md) for vulnerability reports and the [release checklist](docs/open-source-release.md) for public artifacts. Do not add remote debugging flags to normal application startup.
