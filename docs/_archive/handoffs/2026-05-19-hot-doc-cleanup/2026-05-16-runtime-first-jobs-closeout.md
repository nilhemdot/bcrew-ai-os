# Runtime First Jobs Closeout - 2026-05-16

Closeout key: `runtime-first-jobs-v1`
Card: `RUNTIME-FIRST-JOBS-001`
Sprint: `runtime-first-jobs-2026-05-16`

## What Changed

`RUNTIME-WORKER-001` made failed scheduled jobs visible. The first failure was internal: Gmail/Missive current-sync jobs could not import the source-crawl delegates after the store split.

This card repaired that seam and added proof:

- `lib/foundation-source-crawl-store.js` now returns `leaseSourceCrawlTarget` and `finishSourceCrawlTargetRun`.
- `lib/foundation-db.js` now re-exports those delegates.
- `scripts/run-extraction-target.mjs` now normalizes `--dry-run` to `dryRun` before any lease can happen.
- `lib/runtime-first-jobs.js` owns the missing-export and dry-run parser dogfood proof.
- `scripts/process-runtime-first-jobs-check.mjs` proves the first Gmail/Missive scheduled targets load through dry-run without live connector work.
- Runtime reliability verifier coverage now includes `RUNTIME-FIRST-JOBS-001`.

## Proof

- `npm run process:runtime-first-jobs-check -- --json` passed `22/22`.
- `npm run extraction:target -- --target=gmail-current-day --dry-run` returned dry-run JSON without leasing.
- `npm run extraction:target -- --target=missive-current-day --dry-run` returned dry-run JSON without leasing.
- `npm run backlog:hygiene -- --json` passed with 0 findings across 527 cards.
- `npm run foundation:verify -- --json-summary` passed `400/400`.

Focused measurements:

- Gmail dry-run: about 320ms.
- Missive dry-run: about 317ms.
- `/api/foundation/jobs`: about 54ms / 171KB.
- default `/api/foundation-hub`: about 67ms / 533KB.

## Dogfood Finding

The first attempted proof caught a real bug: `--dry-run` was parsed as `dry-run`, while the runner checked `args.dryRun`. That meant the proof command fell through to the live lease path. The live child process was stopped immediately, and the parser was fixed so both `--dry-run` and `--dryRun` are accepted before lease/run.

The focused dogfood now rejects both old failure modes:

- missing public `finishSourceCrawlTargetRun` / `leaseSourceCrawlTarget` exports
- dry-run parser fallthrough

## Not Changed

This did not add jobs, change schedules, run intentional live extraction, change source auth, connect paid sources, build hubs, wire Marketing Video Lab, build Canva asset-library behavior, start Build Intel extraction, work Meeting Vault Phase B, or mutate Drive permissions.

## Next

Continue the no-auth Foundation cleanup queue. The next card should stay in verifier/runtime/store cleanup unless Steve explicitly chooses to return to Build Intel extraction or hub work.
