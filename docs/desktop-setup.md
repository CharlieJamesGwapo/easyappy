# EasyAppy desktop setup

EasyAppy is an Electron desktop app with its own window and local storage. The Mac release provides Apple Silicon and Intel packages for macOS 13 or later. It does not require a browser tab or development server after installation.

For the downloadable app, start with [Install on macOS](install-macos.md). Manual tracking needs neither Node.js nor OAuth. The instructions below cover source builds and optional account setup.

## Build and run

Use Node.js 24+ and npm:

```sh
npm ci
npm run verify
npm start
```

For a local Mac bundle:

```sh
npm run package:mac
```

The default is ARM64. Use `npm run package:mac -- --arch=x64` for Intel or `npm run package:mac -- --arch=all` for both.

This creates `release/EasyAppy-darwin-arm64/EasyAppy.app` and verifies an ad-hoc signature. To prepare both ARM64 and Intel release assets:

```sh
npm run release:mac
```

The release task creates versioned DMG/ZIP downloads, `SHA256SUMS.txt` and `INSTALL-MAC.md`. Packaging is macOS-only. The app is not Developer ID signed or notarized. Intel artifacts are architecture/signature checked on an Apple Silicon host, without runtime testing on an actual Intel Mac. `dist/` and `release/` are generated from `src/` and excluded from Git.

The default workspace is empty. To try fictional records, import [demo.json](demo.json) through Settings → Import backup in an isolated test profile. A replacement import changes the current workspace, so export a backup first when using an existing profile. Screenshots in the public documentation use this synthetic fixture.

`npm run preview` serves only the renderer at `http://127.0.0.1:4318`. The browser preview and desktop app have separate storage; native OAuth is desktop-only.

## Gmail OAuth

No shared Google client or live account grant is bundled. You need your own registered Desktop OAuth client and consent.

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project and enable Gmail API.
2. Configure its Google Auth Platform consent screen. If using testing mode, add the Gmail account as a test user.
3. Create an OAuth client with application type **Desktop app** and download its JSON configuration.
4. Open EasyAppy → Connections → **Set up Gmail OAuth**. Enter the downloaded `client_id` and `client_secret` values. Never commit the download or paste those values into a public issue.
5. Click **Connect Gmail**. Sign in and authorize read-only Gmail access in the system browser. The browser returns to a temporary loopback callback; EasyAppy verifies state, PKCE and granted scope before reporting success.

The scope is `gmail.readonly`. Google may require app verification for broader distribution. Testing-mode grants may expire and require reconnection. Consult the provider’s [native-app OAuth documentation](https://developers.google.com/identity/protocols/oauth2/native-app) and [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) for current registration requirements.

## What automatic capture does

While the app is open, it checks matching application/interview mail from the last **30 days** every **five minutes**, or when you select **Sync now**. Each pass checks at most the newest **500 matching messages**. A large first sync can take several minutes because API reads are paced and quota errors use bounded retries.

Supported LinkedIn, Indeed and Jobstreet confirmation templates with a company and role can create confirmed applications. Known job IDs and unambiguous employer/role matches avoid many duplicate receipts; uncertain identity remains for review. New imported records are outside the search goal until you include them explicitly.

Invitations, offers, rejections and uncertain messages enter **Review inbox**. Check identity and timing before saving. An email invitation does not establish attendance or an accepted RSVP. If the template is unfamiliar, no receipt arrived, or it falls outside the bounded scan, add the application manually or paste the relevant email.

Turn off **Automatically add clear confirmation emails** to review all new candidates first. **Paste an email** works without OAuth; include Subject and From lines where available. Parsing is local and does not send message text to an AI service.

## GitHub profile connection

Register a [GitHub OAuth App](https://github.com/settings/developers), enable Device Flow and enter its client ID in Connections. Select Connect, enter the displayed code at GitHub, then Check authorization. Only `read:user` is requested. See [GitHub’s authorization documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).

This is a developer-profile identity connection, not a job-application feed. Its live account flow is not verified for this release. LinkedIn, Indeed and Jobstreet are tracked through supported confirmation emails, without job-site passwords, session cookies or direct applicant-history APIs.

## Backups and disconnecting

Tracker and review data are local and are not encrypted by the app. Provider configuration and tokens are stored separately using OS-backed Electron `safeStorage`; they are not returned to the renderer or included in tracker backups.

Settings exports applications, interviews and settings as validated JSON. It excludes account credentials, pending review messages and seen-message checkpoints. Resolve review items before a device migration, and keep backups private. There is no automatic cloud backup or cross-device synchronization.

Disconnect removes saved account tokens locally. Gmail also attempts provider-side revocation. Revoke GitHub’s grant in GitHub Settings to remove provider authorization. Provider disconnect is not a command to delete local tracker records. See [security and privacy](../SECURITY.md).
