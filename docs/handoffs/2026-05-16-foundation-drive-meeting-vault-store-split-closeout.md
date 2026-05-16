# Foundation Drive/Meeting Vault Store Split Closeout

Date: 2026-05-16
Card: `FOUNDATION-DB-MONOLITH-SPLIT-013`
Sprint: `foundation-db-drive-meeting-vault-store-split-2026-05-16`
Closeout key: `foundation-drive-meeting-vault-store-split-v1`

## What Shipped

- Added `lib/foundation-drive-meeting-vault-store.js` for Drive Access preflight and Meeting Vault proof-storage/read-model behavior.
- Kept existing `lib/foundation-db.js` public exports as stable delegates:
  - `listMeetingRawDriveFileCandidates`
  - `recordDriveAccessPreflightRun`
  - `getLatestDriveAccessPreflightRun`
  - `recordMeetingVaultAclAudit`
  - `getLatestMeetingVaultAclAudit`
  - `recordMeetingVaultAutoEnforcementRun`
  - `getLatestMeetingVaultAutoEnforcementRun`
  - `getMeetingVaultLegacyExceptions`
- Added focused read-only proof at `scripts/process-foundation-drive-meeting-vault-store-split-check.mjs`.
- Extended `lib/foundation-db-split-verifier.js` and `scripts/foundation-verify.mjs` so the root verifier treats this store split as covered Foundation DB monolith cleanup.
- Removed duplicate Drive/Meeting Vault row mappers from `lib/foundation-source-crawl-store.js`; the new proof store owns those mappers.

## Proof

Commands run during the sprint:

```bash
node --check lib/foundation-drive-meeting-vault-store.js lib/foundation-db.js lib/foundation-source-crawl-store.js lib/foundation-db-split-verifier.js scripts/process-foundation-drive-meeting-vault-store-split-check.mjs scripts/process-verifier-foundation-db-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:foundation-drive-meeting-vault-store-split-check -- --json
```

Focused proof passed after the plan wording was tightened to explicitly include the no Drive permission mutation boundary and the approval digest was refreshed.

## Dogfood Result

The focused proof recreates the old unsafe shape and rejects it:

- old inline Drive/Meeting Vault ownership in `foundation-db.js`
- missing proof-store module
- missing `foundation-db.js` delegate wiring
- weak split plan

Synthetic fake-pool behavior proof calls the real store methods and verifies candidate listing, Drive preflight recording/latest reads, Meeting Vault ACL audit recording, auto-enforcement recording/latest reads, legacy exception reads, and change-event emission without live Drive calls or live DB writes.

## Line Count

- `lib/foundation-db.js`: 6,149 lines before this slice, 5,609 lines after the extraction.
- The file remains above the 5,000-line refactor threshold, so the next Foundation DB slice should continue shrinking it unless verifier risk becomes more urgent.

## Boundaries

This was proof-store cleanup only. It did not:

- mutate Drive permissions
- send request-access emails
- run Meeting Vault Phase B
- change table schema, indexes, constraints, columns, or migrations
- run source extraction or live connector APIs
- touch Canva, Marketing Video Lab, paid-source auth, Build Intel extraction, or hub feature work

## Next

Continue no-auth Foundation cleanup. The next likely slice is another bounded `lib/foundation-db.js` store extraction to get the DB monolith under 5,000 lines, unless a verifier split is the safer next move after the full ship gate.
