# EXTRACT-RETIRE-001 Plan

## What

Close `EXTRACT-RETIRE-001` by adding a bounded retirement policy for empty historical and corpus extraction targets.

When a backfill/history/corpus mission completes a configured number of clean zero-work runs, Foundation marks the target terminal (`status: complete`, `runtimeMode: paused`, `nextRunAt: null`) with explicit retirement metadata. Current-day lanes must keep scheduling and must not retire from empty runs.

## Why

Daily history and corpus missions can currently run successfully with no eligible work forever. That makes Runtime Health look busy without moving the system toward source completion.

The operator value is concrete: Foundation can distinguish "still scheduled because current-day work keeps flowing" from "historical queue is empty, stop spending runtime on it." This keeps source automation tighter without requiring Steve to inspect quiet jobs manually.

## Acceptance Criteria

- A shared helper calculates retirement decisions from target lane/type, run status, zero-work streak, threshold, and current-day exclusion.
- `finishSourceCrawlTargetRun()` applies the decision during normal target completion without running any live extraction.
- Historical/backfill/corpus targets retire only after the configured clean zero-work threshold is met.
- Current-day targets never retire from zero-work runs.
- Failed or partial runs reset the clean-run streak and do not retire the target.
- Positive-work runs reset the clean-run streak and do not retire the target.
- Retired targets are not treated as scheduled through the target scheduler fallback.
- A focused dogfood proof uses the real source-crawl store factory against a synthetic fake pool and proves the exact failure modes.
- `lib/foundation-extraction-runtime-verifier.js` keeps thin coverage for this card.
- No live extraction, no paid-source auth, no new source lanes, no Build Intel extraction, no hub feature work, and no Canva/Marketing route wiring.
- Full Foundation ship gate passes.

## Definition Of Done

- `lib/extract-retire.js` owns constants, pure retirement decision helpers, source evaluator, and pure dogfood fixtures.
- `lib/foundation-source-crawl-store.js` imports and applies the helper inside `finishSourceCrawlTargetRun()`.
- `scripts/process-extract-retire-check.mjs` proves backlog/sprint state, approval, Plan Critic, source shape, real store dogfood behavior, read-only posture, and verifier coverage.
- `package.json` exposes `process:extract-retire-check`.
- `lib/foundation-extraction-runtime-verifier.js` covers `EXTRACT-RETIRE-001` without adding inline root-verifier logic.
- `scripts/foundation-verify.mjs` and the extraction-runtime split check pass the needed source into the verifier module.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` record the closeout.
- `docs/handoffs/2026-05-16-extract-retire-closeout.md` exists.
- Recent Builds closeout registry includes `extract-retire-v1`.
- Backlog, Current Sprint, focused proof, `foundation:verify`, and `process:foundation-ship` agree.

## Details

Existing code and existing docs to reuse:

- `lib/foundation-source-crawl-store.js`
- `lib/extraction-run-hardening.js`
- `scripts/run-extraction-target.mjs`
- `lib/foundation-extraction-runtime-verifier.js`
- `docs/process/extract-run-hardening-001-plan.md`
- `docs/process/crawl-run-ledger-001-plan.md`
- Live backlog card `EXTRACT-RETIRE-001`

Existing scripts to reuse:

- `scripts/process-verifier-extraction-runtime-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `scripts/run-extraction-target.mjs`

Live backlog and Current Sprint truth stay authoritative for card status, proof commands, and closeout state.

Implementation shape:

- Add a small helper module rather than growing `lib/foundation-db.js`.
- Treat `current_day` and `current_day_sync` lanes as always-retained.
- Treat `backfill`, `history`, `historical`, and `corpus_mining` lanes or target types as retirement-eligible.
- Default threshold is two clean zero-work successful runs unless `budget.retireAfterCleanRuns`, `budget.cleanRunRetireThreshold`, or `metadata.retirementPolicy.cleanRunThreshold` overrides it.
- Store streak and last decision under `metadata.extractRetire`.
- On retirement, set `status = complete`, `runtime_mode = paused`, and clear `next_run_at`.
- Keep proof synthetic; do not lease or finish any production source target.

Split/extraction plan:

- Do not add new code to `lib/foundation-db.js`.
- Do not add broad inline verifier logic to `scripts/foundation-verify.mjs`; only pass source text into the existing extraction runtime verifier module.
- Keep new behavior in `lib/extract-retire.js`, `lib/foundation-source-crawl-store.js`, the focused check script, and thin verifier wiring.

Gate decision tree:

- Static gate: `node --check` for changed JS and the root verifier.
- Focused gate: `npm run process:extract-retire-check -- --json`.
- Regression gate: `npm run process:verifier-extraction-runtime-split-module-check -- --json`.
- Full gate: `npm run process:foundation-ship -- --card=EXTRACT-RETIRE-001 --planApprovalRef=docs/process/approvals/EXTRACT-RETIRE-001.json --closeoutKey=extract-retire-v1 --commitRef=HEAD`.

Check-script apply posture:

- `scripts/process-extract-retire-check.mjs` is read-only by default and has no `--apply` path.
- It must not call backlog/current-sprint write helpers, raw SQL mutation against live tables, live source connectors, paid APIs, source extraction, or `fs.writeFile`.

Speed budget:

- Focused proof should run under 10 seconds.
- Full ship gate stays under the existing 300 second budget.

## Risks

- **False retirement risk:** A quiet current-day target could be accidentally paused. Mitigation: current-day lanes are excluded and dogfood proves they do not retire.
- **False green risk:** Source strings could claim retirement without behavior. Mitigation: the dogfood proof calls the real store finish path with synthetic state.
- **Scheduler drift risk:** A complete target with a foundation job key could still look scheduled. Mitigation: stopped target statuses use target stop-state scheduling instead of job schedule.
- **Scope creep risk:** This can drift into `EXTRACT-RETRY-001`, YouTube/Skool/myICOR extraction, or source auth. Mitigation: explicit not-next boundaries and synthetic proof only.
- **Rollback path:** Remove the helper import and the extra finish-target status/runtime fields; leave existing run ledger behavior unchanged.

## Tests

```sh
node --check lib/extract-retire.js lib/foundation-source-crawl-store.js scripts/process-extract-retire-check.mjs lib/foundation-extraction-runtime-verifier.js scripts/process-verifier-extraction-runtime-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:extract-retire-check -- --json
npm run process:verifier-extraction-runtime-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=EXTRACT-RETIRE-001 --planApprovalRef=docs/process/approvals/EXTRACT-RETIRE-001.json --closeoutKey=extract-retire-v1 --commitRef=HEAD
```

Not next: no live extraction, no `EXTRACT-RETRY-001` retry/backoff execution, no new source lanes, no paid-source auth, no Skool/myICOR/YouTube/Loom work, no Build Intel extraction, no hub feature work, no Marketing Video Lab route wiring, no Canva asset mutation, no Drive permission mutation, and no `MEETING-VAULT-ACL-001 Phase B`.
