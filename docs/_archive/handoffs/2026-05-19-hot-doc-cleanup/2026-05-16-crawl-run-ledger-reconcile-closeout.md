# Crawl Run Ledger Reconcile Closeout

Date: 2026-05-16
Card: `CRAWL-RUN-LEDGER-001`
Sprint: `crawl-run-ledger-reconcile-2026-05-16`
Closeout key: `crawl-run-ledger-reconcile-v1`

## What Changed

`CRAWL-RUN-LEDGER-001` is closed as a Foundation reconciliation card. The source-crawl run-ledger behavior already existed from extraction hardening and the source-crawl store split; this card added the missing focused proof, thin verifier coverage, plan approval, Recent Builds closeout, and rebuild doc truth.

The proof now covers `source_crawl_target_runs`, target lease `crawlRunId` creation, child-script `--crawlRunId` propagation, intelligence job `sourceCrawlRunId` recording, finish-by-run-ID behavior, and idempotent repeated finish behavior.

## Why It Matters

Future source-health, retry/backoff, and extraction completeness work need a stable run identity. Operators should not have to reconstruct a source run from lease owner and timestamp clues. Foundation can now prove that a source-crawl target has a ledgered run ID and that completion updates the matching run.

## Files

- `lib/crawl-run-ledger.js` owns card constants, source evaluation, and synthetic dogfood proof.
- `scripts/process-crawl-run-ledger-check.mjs` is the focused read-only proof.
- `lib/foundation-extraction-runtime-verifier.js` includes thin coverage for `CRAWL-RUN-LEDGER-001`.
- `scripts/process-verifier-extraction-runtime-split-module-check.mjs` passes the new source input into the extraction-runtime verifier regression proof.
- `scripts/foundation-verify.mjs` passes crawl-run ledger proof-script source into the extraction-runtime verifier.
- `package.json` exposes `process:crawl-run-ledger-check`.
- `docs/process/crawl-run-ledger-001-plan.md` and `docs/process/approvals/CRAWL-RUN-LEDGER-001.json` hold the approved plan.
- `lib/foundation-build-closeout-overnight-records.js` registers `crawl-run-ledger-reconcile-v1`.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the active and closed sprint truth.

## Proof

- `node --check lib/crawl-run-ledger.js scripts/process-crawl-run-ledger-check.mjs lib/foundation-extraction-runtime-verifier.js scripts/process-verifier-extraction-runtime-split-module-check.mjs scripts/foundation-verify.mjs` passed.
- `npm run process:crawl-run-ledger-check -- --json` passed 12/12 while active.
- Dogfood used the real `createFoundationSourceCrawlStore()` path against a synthetic pool.
- Dogfood accepted healthy lease, finish, and idempotent finish behavior.
- Dogfood rejected missing target-run insert.
- Dogfood rejected missing idempotent finish lookup.
- `npm run process:verifier-extraction-runtime-split-module-check -- --json` passed 25/25 after the new verifier coverage.
- Full ship proof is required through `npm run process:foundation-ship -- --card=CRAWL-RUN-LEDGER-001 --planApprovalRef=docs/process/approvals/CRAWL-RUN-LEDGER-001.json --closeoutKey=crawl-run-ledger-reconcile-v1 --commitRef=HEAD`.

## Not Changed

No live extraction ran. No source cursor, retry/backoff execution, source connector auth, source lane, hub feature, Marketing Video Lab route, Canva asset, Drive permission, Meeting Vault Phase B, Skool, myICOR, YouTube, or Loom behavior changed.

## Next

Continue the no-auth Foundation cleanup queue. Good next candidates are another verifier/runtime/source-health reliability card or a stale scoped Foundation card that can be reconciled with real proof before Build Intel extraction resumes.
