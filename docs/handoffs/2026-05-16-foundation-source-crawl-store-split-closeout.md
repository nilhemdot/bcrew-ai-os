# Foundation Source-Crawl Store Split Closeout

Date: 2026-05-16
Card: `FOUNDATION-DB-MONOLITH-SPLIT-012`
Sprint: `foundation-db-source-crawl-store-split-2026-05-16`
Closeout key: `foundation-source-crawl-store-split-v1`

## Verdict

Accepted. This was a bounded Foundation DB monolith cleanup slice. Source crawl and extraction-control store behavior now lives in `lib/foundation-source-crawl-store.js`, while `lib/foundation-db.js` preserves existing public exports as delegates for current callers.

## What Changed

- Added `lib/foundation-source-crawl-store.js` with a dependency-injected `createFoundationSourceCrawlStore()` factory.
- Moved source crawl target/run/item mappers, schedule overlays, item summaries, target/run coverage, target health findings, target leasing/finish, stale target-run reaper, item upsert/listing, retry classification/lease, attempt start/finish, stale item reaper, external-ID lookup, Drive/video extraction queues, extraction-control snapshot, extraction hardening snapshot, and Drive corpus inventory snapshot behavior out of `lib/foundation-db.js`.
- Kept stable `lib/foundation-db.js` public export names as delegates for source crawl, Drive/video queue, extraction-control, and extraction-hardening callers.
- Added focused proof script `scripts/process-foundation-source-crawl-store-split-check.mjs`.
- Added DB split verifier coverage for `FOUNDATION-DB-MONOLITH-SPLIT-012`.
- Updated extraction-runtime verifier ownership so source-crawl proof terms may live in the extracted source-crawl store instead of being falsely required inside the DB monolith.
- Preserved Drive Access and Meeting Vault row mappers in `lib/foundation-db.js` because those stores have not been split yet.
- Updated Current Sprint review-state behavior so a fully done sprint with no next card derives "Sprint review/rollover is next" instead of reusing stale build-start metadata.

## Proof

Commands run:

```bash
node --check lib/foundation-source-crawl-store.js lib/foundation-db.js lib/foundation-current-sprint.js lib/foundation-db-split-verifier.js lib/foundation-extraction-runtime-verifier.js scripts/foundation-verify.mjs scripts/process-foundation-source-crawl-store-split-check.mjs scripts/process-verifier-extraction-runtime-split-module-check.mjs scripts/process-verifier-foundation-db-split-module-check.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:foundation-source-crawl-store-split-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run process:verifier-foundation-db-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-012 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-012.json --closeoutKey=foundation-source-crawl-store-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-DB-MONOLITH-SPLIT-012 --closeoutKey=foundation-source-crawl-store-split-v1
npm run process:post-ship-fanout -- --card=FOUNDATION-DB-MONOLITH-SPLIT-012 --closeoutKey=foundation-source-crawl-store-split-v1
npm run process:foundation-ship -- --card=FOUNDATION-DB-MONOLITH-SPLIT-012 --planApprovalRef=docs/process/approvals/FOUNDATION-DB-MONOLITH-SPLIT-012.json --closeoutKey=foundation-source-crawl-store-split-v1 --commitRef=HEAD
```

Dogfood proof:

- Missing source-crawl module ownership fails.
- Old inline source-crawl ownership in `lib/foundation-db.js` fails.
- Missing delegate wiring fails.
- Weak split plans fail.
- Synthetic fake-pool behavior exercises stale target-run reaping, target/item mapping, Drive/video queue reads, extraction-control snapshots, and extraction-hardening status without live connectors or source extraction.

## Boundaries

Not changed:

- Source crawl target definitions
- Runtime schedules
- Retry policy defaults
- Worker process-control behavior
- Table schema, columns, indexes, constraints, or migrations
- Connector credentials or provider auth
- Live source extraction or scheduled jobs
- Hub feature work
- Canva assets or Marketing Video Lab route wiring
- Build Intel extraction implementation
- Drive permission mutation or Meeting Vault Phase B

## Next

Continue no-auth Foundation cleanup. The remaining DB monolith is still above the 5,000-line risk line, so the next card should either split the next bounded Foundation DB store domain or shrink the verifier if current proof health makes that safer.
