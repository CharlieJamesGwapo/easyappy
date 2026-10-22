# Architecture decisions

These decisions describe implemented behavior, not a roadmap of promised integrations. See [architecture](architecture.md) and [product flow](product-flow.md).

| Decision                                              | Reason                                                                          | Consequence                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Separate main, preload and renderer                   | Keep native and token-bearing operations outside page code                      | The renderer calls named, guarded IPC methods                                          |
| Static ES-module renderer and pure model              | Make validation, metrics and transitions independently testable                 | No frontend framework compilation or database service is required                      |
| Versioned local documents                             | Provide a usable personal tracker without a backend account                     | State belongs to one profile; transfer and recovery require backups                    |
| Separate tracker and capture documents                | Distinguish application truth from email checkpoints and pending review         | Tracker backups intentionally exclude the review inbox; persistence ordering matters   |
| Empty public default, separate fictional demo fixture | Avoid distributing a candidate’s professional records                           | A new user starts empty; screenshots use an isolated demo workspace                    |
| Read-only Gmail                                       | Capture receipts without sending or deleting mail                               | User consent and their own Google client are required; scanning is bounded             |
| Deterministic parsing and review                      | Keep ambiguous email from silently becoming confirmed application history       | Unfamiliar templates, invitations, offers and rejections wait for review               |
| Canonical job IDs before employer/role matching       | Reduce duplicates without merging separate roles or postings                    | Distinct known IDs stay separate; identity conflicts need clarification                |
| Separate submission confirmation and stage            | A draft or interrupted form is not a completed application                      | Pending records do not inflate confirmed submission totals                             |
| Explicit goal/campaign membership                     | A historical receipt need not count toward a current search target              | New imported confirmations are outside goal membership by default                      |
| OS-encrypted native OAuth vault                       | Keep reusable credentials out of renderer state and tracker exports             | OAuth requires desktop setup; tracker records themselves remain unencrypted            |
| No bundled shared OAuth client                        | Make account ownership and configuration explicit                               | Each user brings provider registration; public OAuth distribution approval is separate |
| Narrow exact-message reads                            | Support a deeper authorized review without arbitrary download access            | Validated IDs and bounded calendar attachments only                                    |
| Explicit offsets and unknown schedule state           | Preserve cross-midnight timing without inventing a timezone                     | Display uses Philippine time; conflicting schedules become confirmation actions        |
| Source-only public release with ad-hoc Mac packaging  | Provide reproducible development builds without implying notarized distribution | Developer ID signing, notarization and broader platform packaging remain future work   |
