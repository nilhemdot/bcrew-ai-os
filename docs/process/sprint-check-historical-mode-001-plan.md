# SPRINT-CHECK-HISTORICAL-MODE-001 Plan

## What

Build a narrow V1 historical mode for focused sprint proof scripts. The current failure pattern is that a proof script can remain valid evidence for a closed card, but later fail only because the active Current Sprint has rolled forward.

V1 adds a reusable `lib/sprint-check-historical-mode.js` helper and updates one real closed proof script, `scripts/process-check-readonly-mode-check.mjs`, to accept either the current active sprint item or a verified historical closeout for the same card. This is not a broad rewrite of every process script.

## Why

Steve needs ship gates to be fast and trustworthy. Old focused proofs should keep proving their shipped artifact without blocking future sprints on stale active-sprint assumptions. The operator value is less verification drag and fewer false blockers when Foundation work continues card by card.

The root invariant is: a focused proof is valid after rollover only when the live backlog card is done and the matching verified closeout for that exact card/key still exists. It is not enough to add an `activeSprintAtOrPast` escape hatch or silence the warning.

For Steve and the team, the useful thing this unlocks is practical speed with quality: closed proof scripts can be rerun during ship gates without stopping active hub/Foundation work for a stale sprint-ID mismatch, while current-card proofs still fail when the live sprint is wrong.

## Acceptance Criteria

- A reusable helper evaluates active-current mode and historical-closeout mode through one actual function path.
- Active-current mode passes only when the expected sprint is active and the card is in `building_now` or `done_this_sprint`.
- Historical-closeout mode passes only when the active sprint has rolled forward, the live backlog card lane is `done`, and the matching closeout key is verified for that card.
- A done card without verified closeout fails.
- A non-done card with a verified-looking closeout fails.
- A wrong closeout key fails.
- `scripts/process-check-readonly-mode-check.mjs` uses the helper instead of hard-failing on `sprintId === process-check-readonly-mode-2026-05-15`.
- The focused proof calls real helper behavior and rejects substring-only proof.
- The focused proof stays read-only and does not mutate backlog, sprint, source, job, report, or external state.

## Definition Of Done

- Live backlog card `SPRINT-CHECK-HISTORICAL-MODE-001` is in `done` and Current Sprint shows it in `Done This Sprint`.
- Durable Plan Critic pass row exists at 9.8+ before build.
- Focused proof passes through `npm run process:sprint-check-historical-mode-check -- --json`.
- The previous readonly-mode proof passes after the active sprint has rolled forward.
- `foundation:verify` includes this boundary and passes.
- Full `process:foundation-ship` passes before push.
- Closeout and Recent Builds identify `sprint-check-historical-mode-v1`.

## Details

Existing code to reuse: `lib/foundation-verifier-sprint-proof.js`, `lib/foundation-current-sprint-store.js`, `lib/foundation-build-closeout-overnight-records.js`, `scripts/process-check-readonly-mode-check.mjs`, `scripts/process-sprint-stage-gate-check.mjs`, and the live backlog/Current Sprint/Plan Critic APIs.

Implementation shape:

- Add `lib/sprint-check-historical-mode.js` with constants, `evaluateSprintCheckHistoricalMode()`, and `buildSyntheticSprintCheckHistoricalModeProof()`.
- Update `scripts/process-check-readonly-mode-check.mjs` so its sprint assertion uses the helper. This is the dogfood target because it just shipped and currently has the exact active-sprint-only assumption.
- Add `scripts/process-sprint-check-historical-mode-check.mjs` as the read-only focused proof for this card.
- Add package script `process:sprint-check-historical-mode-check`.
- Add verifier coverage that calls the helper proof and confirms the readonly proof script is historical-aware.

Actual function path: `evaluateSprintCheckHistoricalMode()` receives the active sprint object, the live backlog card, expected sprint ID, closeout key, and closeout records. The dogfood proof calls that function with active-current, rolled-forward, missing-closeout, wrong-key, and non-done-card fixtures.

Split plan for the over-5K verifier file: this card adds only a thin import/delegation row to `scripts/foundation-verify.mjs`; all new behavior and dogfood logic live in `lib/sprint-check-historical-mode.js`. A broader verifier split remains separate work.

Gate decision tree: static proof alone is insufficient because a source marker could hide the stale active-sprint failure. Focused proof is required because the failure is a process behavior boundary. Full Foundation ship is required because this touches verifier/process gates and Current Sprint trust. The focused proof must remain fast and proportional, target under 2 minutes, with no external API calls and no live mutation.

Check-script apply posture: both process check scripts touched by this card are read-only by default. They must not call `updateBacklogItem()`, `createBacklogItem()`, `upsertFoundationCurrentSprintOverlay()`, raw `INSERT INTO`, raw `UPDATE`, raw `DELETE FROM`, or `fs.writeFile()`. No `--apply` path is added in this card; if a future check script needs live writes, it must use explicit apply posture and a separate reviewed card.

## Risks

- Risk: historical mode becomes a broad escape hatch for stale proofs.
  - Repair path: fail closed unless the live backlog card is done and the exact verified closeout key matches the card.
- Risk: old proof scripts still hardcode active sprint IDs elsewhere.
  - Repair path: V1 updates one real script and the audit-derived follow-up can migrate additional scripts in batches.
- Risk: the verifier monolith grows.
  - Repair path: keep verifier changes to a thin row and keep the behavior in a new module; continue verifier split sprints separately.

## Tests

```bash
node --check lib/sprint-check-historical-mode.js scripts/process-sprint-check-historical-mode-check.mjs scripts/process-check-readonly-mode-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:sprint-check-historical-mode-check -- --json
npm run process:process-check-readonly-mode-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=SPRINT-CHECK-HISTORICAL-MODE-001 --planApprovalRef=docs/process/approvals/SPRINT-CHECK-HISTORICAL-MODE-001.json --closeoutKey=sprint-check-historical-mode-v1 --commitRef=HEAD
```

Dogfood proof recreates the rollover failure: `process-check-readonly-mode-2026-05-15` is no longer the active sprint, but `PROCESS-CHECK-READONLY-MODE-001` is done and has a verified closeout. The updated focused proof must pass from that historical evidence and still fail synthetic weak cases. Substring-only proof is rejected.

## Not Next

- Do not rewrite every historical process script.
- Do not add an `activeSprintAtOrPast` bypass.
- Do not weaken active Current Sprint checks for the card currently being built.
- Do not mutate source systems, Drive permissions, or external providers.
- Do not build hub features, Marketing Video Lab routes, Build Intel extraction, paid-source auth, or Meeting Vault Phase B.
