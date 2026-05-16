# CRAWL-RUN-LEDGER-001 Plan

## What

Close `CRAWL-RUN-LEDGER-001` as a Foundation reconciliation card.

The actual source crawl run-ledger behavior already shipped through extraction hardening and the source-crawl store split: `source_crawl_target_runs` exists, target leases create run IDs, `scripts/run-extraction-target.mjs` propagates `crawlRunId`, target completion finishes by run ID, repeated finish by the same run ID is idempotent, and extraction-control snapshots expose run history.

This card adds the missing focused proof, thin verifier coverage, and backlog/current-plan closeout so live task truth matches shipped behavior.

## Why

Foundation cannot keep old scoped cards around after the implementation already exists. That makes the queue look larger and less trustworthy than it is.

The operator value is concrete: source extraction has a real run identity layer, so future retry/backoff and source completeness work can reason about a target run instead of guessing from lease owner and timestamps.

For Steve and the team, the useful product behavior is simpler: when a source target runs, Foundation can answer "which exact crawl run produced this result, did it finish, and can repeated finish calls avoid double counting?" That improves quality and speed for later source-health work because operators can inspect one ledgered run instead of reconstructing history from scattered logs.

## Acceptance Criteria

- Focused proof exercises the real `createFoundationSourceCrawlStore()` behavior with a synthetic store round trip.
- Dogfood proof fails when the source crawl target run insert is missing.
- Dogfood proof fails when idempotent finish lookup is missing.
- Source proof confirms `scripts/run-extraction-target.mjs` passes `--crawlRunId=<id>` into child scripts and records the run ID in the intelligence job ledger.
- Current plan and current state record `source_crawl_target_runs` and `crawlRunId` as shipped behavior.
- `lib/foundation-extraction-runtime-verifier.js` keeps thin verifier coverage for `CRAWL-RUN-LEDGER-001`.
- `CRAWL-RUN-LEDGER-001` moves from stale scoped truth to done with closeout evidence.
- No live extraction runs.
- No new source lanes, connector auth, Skool/myICOR/YouTube/Loom work, hub UI, Marketing Video Lab wiring, Canva asset mutations, or retry/backoff execution changes.
- Full Foundation ship gate passes.
- Plan Critic row records score `>= 9.8` and status `pass` before the card can leave Building Now; a `revise` result blocks closeout.

## Definition Of Done

- `lib/crawl-run-ledger.js` owns constants, source evaluation, and synthetic run-ledger dogfood proof.
- `scripts/process-crawl-run-ledger-check.mjs` proves backlog/sprint state, approval, Plan Critic, source shape, dogfood behavior, read-only posture, and verifier coverage.
- `package.json` exposes `process:crawl-run-ledger-check`.
- `lib/foundation-extraction-runtime-verifier.js` covers the card through the existing extraction runtime verifier module.
- `scripts/foundation-verify.mjs` passes the existing source input and closeout context into that module.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the closeout.
- `docs/handoffs/2026-05-16-crawl-run-ledger-reconcile-closeout.md` exists.
- Recent Builds closeout registry includes `crawl-run-ledger-reconcile-v1`.
- Backlog, Current Sprint, focused proof, `foundation:verify`, and `process:foundation-ship` agree.
- Proof commands are run and recorded: `node --check`, `npm run process:crawl-run-ledger-check -- --json`, `npm run process:verifier-extraction-runtime-split-module-check -- --json`, `npm run backlog:hygiene -- --json`, `npm run foundation:verify -- --json-summary`, and `npm run process:foundation-ship -- --card=CRAWL-RUN-LEDGER-001 --planApprovalRef=docs/process/approvals/CRAWL-RUN-LEDGER-001.json --closeoutKey=crawl-run-ledger-reconcile-v1 --commitRef=HEAD`.

## Details

Existing code to reuse:

- `lib/foundation-source-crawl-store.js`
- `scripts/run-extraction-target.mjs`
- `lib/foundation-extraction-runtime-verifier.js`
- `docs/process/extract-run-hardening-001-plan.md`
- `docs/process/extract-run-hardening.md`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- Live backlog card `CRAWL-RUN-LEDGER-001`

Implementation shape:

- Add a focused helper module that validates the already-shipped run-ledger behavior.
- Use the real store factory against a synthetic fake pool so the proof calls actual lease and finish functions without touching live source systems.
- Add missing-run-table-insert and missing-idempotent-finish fixtures to prove the dogfood catches the audit failure class.
- Add read-only proof script that does not import live DB write helpers or write files.
- Add verifier coverage in the existing extraction runtime verifier rather than creating another root-verifier branch.

Split/extraction plan:

- Do not add new code to `lib/foundation-db.js`.
- Do not add inline verifier logic to `scripts/foundation-verify.mjs` beyond passing one source text input into the existing module.
- Keep new behavior in `lib/crawl-run-ledger.js` and the focused proof script.

Gate decision tree:

- Static gate: `node --check` for changed JS and the root verifier.
- Focused gate: `npm run process:crawl-run-ledger-check -- --json`.
- Full gate: `npm run process:foundation-ship -- --card=CRAWL-RUN-LEDGER-001 --planApprovalRef=docs/process/approvals/CRAWL-RUN-LEDGER-001.json --closeoutKey=crawl-run-ledger-reconcile-v1 --commitRef=HEAD`.

Check-script apply posture:

- `scripts/process-crawl-run-ledger-check.mjs` is read-only by default and has no `--apply` path.
- It must not call backlog/current-sprint write helpers, raw SQL mutation, live source connectors, paid APIs, source extraction, or `fs.writeFile`.

Speed budget:

- Focused proof should run under 10 seconds.
- Full ship gate stays under the existing 300 second budget.

## Risks

- **Fake closure risk:** Closing the card only because strings exist would repeat verifier theater. Mitigation: synthetic proof calls the real store lease/finish/idempotent path and proves failure fixtures fail.
- **Scope creep risk:** This can drift into `EXTRACT-RETRY-001`. Mitigation: retry/backoff execution is explicitly not next.
- **Live source risk:** Running extraction could mutate cursors or source ledger state. Mitigation: proof uses synthetic store behavior and source inspection only.
- **Verifier growth risk:** Adding coverage to the root verifier would grow the remaining monolith. Mitigation: coverage is inside the existing extraction runtime verifier module.
- **Rollback path:** Remove the new proof module/script and verifier coverage; leave already-shipped extraction runtime behavior unchanged.

## Tests

```sh
node --check lib/crawl-run-ledger.js scripts/process-crawl-run-ledger-check.mjs lib/foundation-extraction-runtime-verifier.js scripts/process-verifier-extraction-runtime-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:crawl-run-ledger-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=CRAWL-RUN-LEDGER-001 --planApprovalRef=docs/process/approvals/CRAWL-RUN-LEDGER-001.json --closeoutKey=crawl-run-ledger-reconcile-v1 --commitRef=HEAD
```

Not next: no live extraction, no `EXTRACT-RETRY-001` retry/backoff execution, no new source lanes, no paid-source auth, no Skool/myICOR/YouTube/Loom work, no Build Intel extraction, no hub feature work, no Marketing Video Lab route wiring, no Canva asset mutation, no Drive permission mutation, and no Meeting Vault Phase B.
