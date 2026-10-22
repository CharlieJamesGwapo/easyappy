# Install EasyAppy on macOS

EasyAppy v0.2.0 is a **community preview** for **macOS 13 or later**. It opens as a desktop app and starts with **zero applications, zero conversations and no connected account**. You do not need Node.js, a development server or OAuth to track applications and interviews manually.

The app is **ad-hoc signed**. It is **not Apple Developer ID signed or notarized**, so macOS may display a security warning. Download only from the official release and continue only if you trust it.

## Choose the correct download

Open **Apple menu → About This Mac**:

- If you see **Chip** with an Apple M-series chip, choose **ARM64 / Apple Silicon**.
- If you see **Processor** with Intel, choose **x64 / Intel**.

| Package                 | Download                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Apple Silicon installer | [EasyAppy-0.2.0-mac-arm64.dmg](https://github.com/CharlieJamesGwapo/easyappy/releases/download/v0.2.0/EasyAppy-0.2.0-mac-arm64.dmg) |
| Apple Silicon ZIP       | [EasyAppy-0.2.0-mac-arm64.zip](https://github.com/CharlieJamesGwapo/easyappy/releases/download/v0.2.0/EasyAppy-0.2.0-mac-arm64.zip) |
| Intel installer         | [EasyAppy-0.2.0-mac-x64.dmg](https://github.com/CharlieJamesGwapo/easyappy/releases/download/v0.2.0/EasyAppy-0.2.0-mac-x64.dmg)     |
| Intel ZIP               | [EasyAppy-0.2.0-mac-x64.zip](https://github.com/CharlieJamesGwapo/easyappy/releases/download/v0.2.0/EasyAppy-0.2.0-mac-x64.zip)     |
| Download checksums      | [SHA256SUMS.txt](https://github.com/CharlieJamesGwapo/easyappy/releases/download/v0.2.0/SHA256SUMS.txt)                             |
| Standalone instructions | [INSTALL-MAC.md](https://github.com/CharlieJamesGwapo/easyappy/releases/download/v0.2.0/INSTALL-MAC.md)                             |

Find the source and all assets on the [v0.2.0 release page](https://github.com/CharlieJamesGwapo/easyappy/releases/tag/v0.2.0). The Intel package is architecture/signature checked on an Apple Silicon host; it has **not been runtime-tested on an actual Intel Mac**.

## Install and open

1. Download the DMG for your Mac and open it.
2. Drag **EasyAppy.app** to **Applications**.
3. Eject the EasyAppy disk image in Finder.
4. Open **Applications → EasyAppy**.

For the ZIP alternative, extract it, move **EasyAppy.app** to Applications, then open it there. Do not run the app from inside a mounted installer image.

If macOS blocks the first launch, first attempt to open the app normally. If you trust the download from the official release, open **System Settings → Privacy & Security**, find the blocked-app notice and choose **Open Anyway**. Confirm the dialog when prompted. Follow [Apple’s guidance for opening apps safely](https://support.apple.com/en-ph/102445). Do not bypass an alert that says the app contains malware or will damage your computer; stop and verify the download instead. You do not need to disable Gatekeeper or system-wide security controls.

## Verify a download

Download `SHA256SUMS.txt` from the same release. In Terminal, change to the directory containing your downloaded file and calculate its hash, for example:

```sh
shasum -a 256 EasyAppy-0.2.0-mac-arm64.dmg
```

Compare the complete result with that file’s entry in `SHA256SUMS.txt`. Use your actual package filename for the Intel or ZIP version. A matching checksum checks that the file matches the release asset; it is not Apple notarization or an independent guarantee of safety.

## First use

Select **Add application** to record an employer, role, stage and next step. Use Interviews to record a conversation and preparation notes. Export a private JSON backup from Settings when needed.

Nothing is uploaded to a shared tracker service. The app ships with an empty workspace and no account credentials, mailbox history or personal application records. Public screenshots use a separate fictional demo backup. Tracker records and the review inbox are local **and are not encrypted by the app**; protect device access and exported backups.

Gmail capture is optional. Manual tracking and pasted-email review work without connecting an account. To enable Gmail, create your own Google Desktop OAuth client, configure it in Connections and explicitly grant read-only permission in the system browser. No shared client or Gmail password is bundled. OAuth configuration and tokens use the OS-encrypted native vault and are excluded from tracker backups. Email parsing is local and does not send content to an AI service. See [desktop and OAuth setup](https://github.com/CharlieJamesGwapo/easyappy/blob/v0.2.0/docs/desktop-setup.md).

## Upgrade safely

1. Export a tracker backup from Settings before replacing the app.
2. Quit EasyAppy completely.
3. Download the new package for the same Mac architecture.
4. Replace EasyAppy in Applications using the installer or extracted ZIP.
5. Launch the replacement and check your workspace.

The app’s local profile is stored separately from its application bundle and is retained when you replace the app. Do not delete the application-data profile during an upgrade. Backups include tracker records and settings, but exclude the review inbox, sync checkpoints and account credentials. There is no automatic updater or cloud backup.

## Known limits

Gmail sync checks matching mail from the last 30 days, up to the newest 500 matches per pass, every five minutes while the app is open. It is not a background system service. Uncertain messages and interview schedules need review. There are no direct job-site history APIs, automatic application submissions or live Calendar synchronization. GitHub connects profile identity only; its live account flow remains unverified for this release.

See [verification scope](https://github.com/CharlieJamesGwapo/easyappy/blob/v0.2.0/docs/verification.md), [security and privacy](https://github.com/CharlieJamesGwapo/easyappy/blob/v0.2.0/SECURITY.md) and [release notes](https://github.com/CharlieJamesGwapo/easyappy/blob/v0.2.0/docs/open-source-release.md).
