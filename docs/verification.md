# Verification and readiness

This document describes checks and their limits. It does not include a private mailbox audit, a candidate’s application totals or real interview examples.

## Reproducible automated checks

From a clean checkout with Node.js 24+:

```sh
npm ci
npm run verify
npm audit --omit=dev
```

`verify` checks JavaScript syntax, required repository files, portable documentation links and Mermaid source headers. It runs Node’s built-in test runner and builds `dist/` from source. CI runs this verification and the production dependency audit on Linux. The command output is the authoritative current test count; adding a diagram header is not a full visual Mermaid-rendering test.

Behavior coverage includes:

- Schema validation, explicit submission confirmation, metrics and immutable edits.
- Unknown dates, explicit offsets, cross-midnight schedules and confirmation actions for unresolved timing.
- Archive/restore, safe URLs, backup validation, merge and persistence/reload.
- Quota failures, stale writes and preservation of corrupt data for recovery.
- Supported email templates, HTML alternatives, alerts/outgoing exclusions, repeated evidence and distinct known job IDs.
- Capture save/checkpoint ordering, linked review records and identity-ambiguous additions.
- OAuth configuration, state/PKCE helpers, encrypted-vault boundaries and bounded calendar-only message reads.
- Generated runtime structure and packaging allowlist/credential exclusions.

Tests use synthetic data. They do not grant a live provider account permission, validate every email template, establish a candidate’s application status or guarantee duplicate-free results for ambiguous mail.

## Native and visual checks

On Apple Silicon macOS:

```sh
npm run package:mac
```

Packaging builds the runtime and checks its local ad-hoc signature. It defaults to ARM64; use `npm run package:mac -- --arch=x64` for Intel or `--arch=all` for both. Open the ARM64 app on Apple Silicon in an isolated profile to verify screens, preload availability, Settings import/export and Connections behavior. Never use a live account profile for public screenshots.

```sh
npm run release:mac
```

The release task builds both architectures and creates versioned DMG/ZIP assets, `SHA256SUMS.txt` and `INSTALL-MAC.md`. Inspect bundle architecture, signature, minimum OS metadata and archive contents separately for each target. The minimum macOS version in the release bundle is **13.0**. A signature check is not notarization; a mounted installer inspection is not runtime testing.

The Intel package is architecture/signature checked on an Apple Silicon host. **It has not been runtime-tested on an actual Intel Mac.** Apple Silicon runtime smoke checks apply only to the ARM64 build; do not generalize them to the Intel package.

The [overview](images/overview.jpg) and [interviews](images/interviews.jpg) screenshots are generated from [demo.json](demo.json), an explicitly fictional backup. The public default workspace remains empty. Screenshot inspection verifies visible output; automated model tests verify data rules.

Test authentication using your own provider registration and consent. Gmail’s implementation has been exercised in a development installation; no account grant or shared credentials are distributed. The live GitHub authorization flow remains unverified for this release. The experimental native saved-email picker is not a delivered UI feature; use paste-email capture.

## Release limits

The [v0.2.0 community preview](https://github.com/CharlieJamesGwapo/easyappy/releases/tag/v0.2.0) is a prerelease with Apple Silicon ARM64 and Intel x64 downloads for macOS 13 or later. Developer ID signing, notarization, automatic updates and public production OAuth registration are not configured. Linux CI validates code/build behavior, not a Linux desktop package or macOS native execution. Read the [installation guide](install-macos.md) before opening an ad-hoc-signed download.

There is no direct LinkedIn/Indeed/Jobstreet application-history API, application submission, Calendar sync, background system service or cloud synchronization. Local tracker/review records are unencrypted; only the native credential vault uses OS-backed encryption. See [security](../SECURITY.md) and [release guidance](open-source-release.md).

## Sanitized release validation

The public release uses an empty default workspace and a separate fictional demo backup. Browser checks in an isolated preview exercised demo import, manual application save, interview save and reload persistence. The screenshots show this shared renderer preview, which uses the same screens as the native desktop app. A hidden record-ID field shadowed the form ID in the original submit handler; regression tests now verify that saving handles this correctly and never submits form fields into the navigation URL.

Run `npm run privacy` for the source boundary check and `npm run privacy -- --history` before publishing a fresh public history. These checks reject known private-artifact paths, credential-shaped values, nonempty default seeds and non-example demo contacts; they are not a general-purpose personal-information detector. Review prose and screenshots as well.

## v0.2.0 package validation

The release source passed 59 behavior tests, structure/documentation checks and the production dependency audit. An ARM64 bundle was launched with a disposable profile on Apple Silicon: its initial native window showed zero applications and conversations, while Connections showed Gmail setup needed and GitHub not connected. No account authorization was performed. Both architectures have ad-hoc signature and binary-architecture checks; both DMG filesystem integrity checks passed. Intel execution on actual Intel hardware remains unverified. Final release archives are inspected for empty defaults, excluded profiles/credentials, and matching checksums before publication.
