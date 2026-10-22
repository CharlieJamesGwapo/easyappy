# Open-source release

EasyAppy is released as source under the [MIT License](../LICENSE). It is a local-first application/interview tracker with optional read-only Gmail capture, not an automatic job-application service.

The public default workspace is empty. [demo.json](demo.json), test fixtures and documentation screenshots contain fictional records. These examples demonstrate product behavior without distributing a person’s professional history, application ledger, recruiter messages or calendar invitations.

## What belongs in the public repository

Source, build scripts, lockfile, synthetic tests, CI, diagrams, documentation and sanitized showcase screenshots belong in the release. Generated `dist/`, `release/`, dependencies, user profiles, mailbox exports, personal backups, `.env` files and OAuth downloads do not.

No shared production OAuth client, account token or Google project configuration is required to build the app. Each user configures their own provider client and explicitly authorizes their account. Local private data stays in the user’s application profile, separate from the public source.

## Publication checks

Before publishing source or a binary:

1. Inspect every staged file, including fixtures, image contents and metadata, for credentials and personal data. Filename ignore rules alone are insufficient.
2. Review the full public Git history. Removing a sensitive file in a later commit does not remove earlier copies. A public release must not inherit private application/mailbox history.
3. Run `npm ci`, `npm run verify` and `npm audit --omit=dev` from a clean checkout.
4. For a Mac package, run `npm run package:mac` and inspect the bundle’s allowed contents. Keep profiles and account configuration outside the artifact.
5. Capture the interface in a disposable profile with only the fictional demo fixture. Check visible records, browser chrome and image metadata before sharing.
6. Confirm setup and readiness limits remain accurate. Do not describe ad-hoc signing as notarization or a profile OAuth connection as a job-history integration.

These checks reduce accidental disclosure; they do not encrypt a running user’s tracker or replace a security review. Read [SECURITY.md](../SECURITY.md).

## Current distribution scope

The supported package target is Apple Silicon macOS. Local builds use ad-hoc signing. Developer ID signing, notarization, automatic updates, production shared OAuth registration and wider platform packages are not configured. A source checkout can be built and tested independently of any original development workspace.

GitHub provides source hosting; it does not host the user’s tracker database. There is no shared server, cloud synchronization, background system service, live Calendar connection or automatic job submission in this version. See [architecture](architecture.md), [desktop setup](desktop-setup.md) and [verification](verification.md).
