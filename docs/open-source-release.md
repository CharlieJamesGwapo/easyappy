# Open-source release

EasyAppy is released as source under the [MIT License](../LICENSE). It is a local-first application/interview tracker with optional read-only Gmail capture, not an automatic job-application service.

The public default workspace is empty. [demo.json](demo.json), test fixtures and documentation screenshots contain fictional records. These examples demonstrate product behavior without distributing a person’s professional history, application ledger, recruiter messages or calendar invitations.

## v0.2.0 community preview

The [v0.2.0 GitHub release](https://github.com/CharlieJamesGwapo/easyappy/releases/tag/v0.2.0) is marked **prerelease**. It provides fully downloadable installers and ZIP alternatives for macOS **13 or later**:

| Architecture            | Assets                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| Apple Silicon ARM64     | `EasyAppy-0.2.0-mac-arm64.dmg` and `EasyAppy-0.2.0-mac-arm64.zip` |
| Intel x64               | `EasyAppy-0.2.0-mac-x64.dmg` and `EasyAppy-0.2.0-mac-x64.zip`     |
| Shared supporting files | `SHA256SUMS.txt` and `INSTALL-MAC.md`                             |

Use the [Mac installation guide](install-macos.md) for download links, architecture selection, first-launch security guidance, checksum comparison and upgrades. Manual tracking requires no Node.js or OAuth configuration. Startup is an empty workspace with no connected account.

The app is ad-hoc signed, **not Developer ID signed or notarized**. The Intel package is architecture/signature checked on an Apple Silicon host and is **not runtime-tested on actual Intel hardware**. Treat this as an early community preview rather than a notarized general-availability release.

## What belongs in the public repository

Source, build scripts, lockfile, synthetic tests, CI, diagrams, documentation and sanitized showcase screenshots belong in the release. Generated `dist/`, `release/`, dependencies, user profiles, mailbox exports, personal backups, `.env` files and OAuth downloads do not.

No shared production OAuth client, account token or Google project configuration is required to build the app. Each user configures their own provider client and explicitly authorizes their account. Local private data stays in the user’s application profile, separate from the public source.

## Publication checks

Before publishing source or a binary:

1. Inspect every staged file, including fixtures, image contents and metadata, for credentials and personal data. Filename ignore rules alone are insufficient.
2. Review the full public Git history. Removing a sensitive file in a later commit does not remove earlier copies. A public release must not inherit private application/mailbox history.
3. Run `npm ci`, `npm run verify` and `npm audit --omit=dev` from a clean checkout.
4. Run `npm run release:mac` to build both Mac architectures and create versioned DMG/ZIP assets, checksums and installation instructions. Inspect each bundle’s allowed contents and verify installer contents. Keep profiles and account configuration outside every artifact.
5. Capture the interface in a disposable profile with only the fictional demo fixture. Check visible records, browser chrome and image metadata before sharing.
6. Confirm setup and readiness limits remain accurate. Do not describe ad-hoc signing as notarization or a profile OAuth connection as a job-history integration.

These checks reduce accidental disclosure; they do not encrypt a running user’s tracker or replace a security review. Read [SECURITY.md](../SECURITY.md).

## Current distribution scope

Mac release packages support Apple Silicon ARM64 and Intel x64 on macOS 13 or later. `package:mac` defaults to ARM64; `--arch=x64` or `--arch=all` selects other packaging targets. `release:mac` builds both. Local packages use ad-hoc signing. Developer ID signing, notarization, automatic updates, production shared OAuth registration and Windows/Linux packages are not configured. The Intel build has no actual-Intel runtime verification. A source checkout can be built and tested independently of any original development workspace.

GitHub provides source hosting; it does not host the user’s tracker database. There is no shared server, cloud synchronization, background system service, live Calendar connection or automatic job submission in this version. See [architecture](architecture.md), [desktop setup](desktop-setup.md) and [verification](verification.md).
