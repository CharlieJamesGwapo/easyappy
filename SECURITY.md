# Security and privacy

EasyAppy is a local-first desktop tracker. The public repository, demo seed, test fixtures and documentation screenshots are intended to contain synthetic examples only. A running user’s mailbox and tracker are separate local data; they must never be committed or included in public issue attachments.

## Data boundaries

| Data                                          | Storage and exposure                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Applications, interview details and notes     | Local renderer storage; not encrypted by the app                                               |
| Review inbox and seen-message checkpoints     | Separate local renderer storage; not encrypted by the app                                      |
| OAuth client configuration and account tokens | Main-process vault in the OS application-data directory, encrypted with Electron `safeStorage` |
| Tracker JSON backup                           | Applications, interviews and settings; no OAuth credentials, review inbox or sync checkpoints  |
| Public screenshots and fixtures               | Fictional demonstration records only                                                           |

Tokens are not returned to the renderer. The UI receives connection/profile metadata and the message contents needed for capture. Gmail permission is read-only, but it grants access to email; the subject/date query is an application filter, not a provider-enforced restriction to job-related mail. Protect device access and backups, and revoke provider grants if access is no longer wanted.

## Desktop controls

The renderer uses context isolation, sandboxing, web security and no Node integration. Named IPC handlers validate the calling window, main frame and application origin. Bundled assets are served through `easyappy://app/`. The preload does not expose arbitrary native file/network access.

Google authorization uses the system browser, PKCE, a random state value and a temporary loopback callback. Credentials and tokens remain in the native process/vault. GitHub uses device authorization and `read:user` for profile identity. Each user must register their own provider client; no shared production client or account token is bundled.

Record text is escaped before rendering; email HTML is parsed as data rather than executed. HTTP/HTTPS external links are validated before opening in the system browser. A Content Security Policy restricts renderer scripts and connections. Optional hosted fonts mean the interface is not entirely network-free.

Gmail reads are paced with bounded quota retries. The exact-message reader validates message IDs and fetches only bounded calendar attachments; it is not an arbitrary attachment downloader. Normal sync scans matching mail from the last 30 days, up to the newest 500 matches per pass. See [architecture](docs/architecture.md) for the full pipeline and trust boundaries.

## Distribution and development

The package allowlist and credential-pattern exclusions are additional safeguards, not substitutes for inspecting release contents. Local builds are ad-hoc signed; Developer ID signing and notarization are not configured. OAuth provider review may be needed for broader distribution. There is no direct job-site history integration, automatic submission or cloud account service.

Keep account credentials, `.env` files, OAuth downloads, raw mailbox exports, local browser/app profiles and personal backups out of Git and public artifacts. Do not leave remote debugging enabled on a normal user installation. Do not share real account screenshots as bug reports.

## Reporting an issue

For a suspected vulnerability, contact the repository maintainer privately through their GitHub profile or use GitHub’s private vulnerability reporting if available. Include minimal reproduction steps and redacted evidence. Do not open a public issue containing tokens, personal records or email content. Ordinary bugs with synthetic reproduction data can be reported in the issue tracker.

If a credential was exposed, revoke it at the provider, remove local copies as appropriate, and replace the affected configuration. Deleting a file from the latest commit does not remove it from Git history.
