# EXTRACT-RETIRE-001 Closeout

Date: 2026-05-16

Sprint: `extract-retire-2026-05-16`

Closeout key: `extract-retire-v1`

## Summary

`EXTRACT-RETIRE-001` is complete.

Foundation now has a bounded source-crawl retirement policy. Historical/backfill/corpus targets that complete a configured number of clean zero-work successful runs are marked terminal (`status: complete`, `runtimeMode: paused`, `nextRunAt: null`) with explicit `metadata.extractRetire` proof. Current-day lanes are excluded and remain scheduled.

## What Changed

- Added `lib/extract-retire.js` for pure retirement decision logic, constants, source evaluation, and pure dogfood fixtures.
- Updated `lib/foundation-source-crawl-store.js` so `finishSourceCrawlTargetRun()` applies retirement decisions inside the existing target-finish transaction.
- Updated stopped-target scheduling so complete/paused/blocked targets use target stop-state scheduling even when a Foundation job key exists.
- Added `scripts/process-extract-retire-check.mjs` as a read-only focused proof.
- Added `process:extract-retire-check` to `package.json`.
- Added thin `EXTRACT-RETIRE-001` coverage to `lib/foundation-extraction-runtime-verifier.js`, `scripts/process-verifier-extraction-runtime-split-module-check.mjs`, and `scripts/foundation-verify.mjs`.
- Updated rebuild current-plan/current-state docs and live backlog/current sprint state.

## Dogfood Proof

The focused proof uses the real `createFoundationSourceCrawlStore()` factory against a synthetic fake pool.

It proves:

- A corpus/history target with prior clean streak `1`, threshold `2`, and another zero-work successful run becomes `complete` and `paused`.
- A current-day target with repeated zero-work runs stays `active` and `scheduled`.
- A failed history run resets the clean-run streak and does not retire.
- A positive-work backfill run resets the clean-run streak and does not retire.

## Proof Commands

```sh
node --check lib/extract-retire.js lib/foundation-source-crawl-store.js lib/crawl-run-ledger.js scripts/process-extract-retire-check.mjs lib/foundation-extraction-runtime-verifier.js scripts/process-verifier-extraction-runtime-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:extract-retire-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

Results:

- `process:extract-retire-check`: 12/12 passed.
- `process:verifier-extraction-runtime-split-module-check`: 26/26 passed.
- `backlog:hygiene`: healthy, 527 cards, 0 findings.
- `foundation:verify`: 403/403 passed before closeout.

## Limits

- No live extraction ran.
- No retry/backoff execution changed.
- No new source lanes or connector auth were added.
- No Skool, myICOR, YouTube, Loom, or Build Intel extraction was built.
- No hub feature work, Marketing Video Lab route wiring, Canva asset mutation, Drive permission mutation, request-access email, or `MEETING-VAULT-ACL-001 Phase B` work was done.

## Next

Continue the no-auth Foundation cleanup queue. Best next candidates are `EXTRACT-RETRY-001` if we want to continue source automation, or the next verifier/store cleanup card if the goal is more monolith/verifier risk reduction before Build Intel extraction resumes.
