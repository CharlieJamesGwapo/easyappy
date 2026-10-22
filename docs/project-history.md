# Project evolution

EasyAppy began as a local application and interview tracker: Overview, Applications, Interviews and Action Center. The core model separated confirmation from stage, preserved unknown dates, and made editing, archive/restore and validated backups testable without a live account.

The desktop version added Electron’s sandboxed renderer, a narrow preload bridge and a native credential vault. Google Desktop OAuth and read-only Gmail capture reduced repetitive entry; uncertain messages stayed in a review inbox. GitHub device authorization was added for developer-profile identity, with live flow verification still pending.

The repository structure separates `src/main`, `src/preload` and `src/renderer`; generated runtime and packages stay outside source control. Pure model/storage/capture tests, packaging policy checks, CI and editable architecture diagrams support reproducible development.

The open-source edition starts with an empty workspace. Optional demo records, fixtures and public screenshots are fictional. Personal mailbox exports, tracker backups, provider credentials and earlier private history are not part of the public source release.

See [product flow](product-flow.md), [architecture](architecture.md), [setup](desktop-setup.md) and [verification scope](verification.md) for the current implementation rather than treating historical design steps as future promises.
