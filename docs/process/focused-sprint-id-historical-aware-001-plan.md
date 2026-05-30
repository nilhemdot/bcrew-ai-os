# FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 Plan

Card: `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001`
Closeout key: `focused-sprint-id-historical-aware-v1`

## What

Close the May 19 deep-audit finding that focused checks still assert exact dated active sprint IDs.

This card applies the shipped `sprint-check-historical-mode-v1` helper to the remaining focused checks named by the audit, then adds a reusable detector so future focused checks cannot quietly return to exact active-sprint literals.

## Why

A focused proof should keep passing after a card ships because live backlog says the card is done and a verified closeout exists. It should not pass or fail because an old dated sprint is still the active Current Sprint.

Exact dated sprint IDs are allowed only as metadata, bootstrap defaults, or historical replay identifiers. They are not allowed to masquerade as live Current Sprint truth.

Exact dated sprint IDs are allowed only as metadata when the file names the non-live posture. Closed focused checks must use verified closeout proof.

## Existing Work Reused

Existing code:

- `lib/sprint-check-historical-mode.js` already owns `evaluateSprintCheckHistoricalMode()`.
- `lib/foundation-build-log.js` already exposes verified closeout records through `getFoundationBuildCloseouts()`.
- `lib/deep-audit-findings-closure-gate.js` already owns May 19 deep-audit finding routing.
- `lib/foundation-current-sprint.js` already marks bootstrap and historical sprint constants with explicit live-truth posture comments.
- `scripts/process-agent-feedback-routes-split-check.mjs` and `scripts/process-app-page-routes-split-check.mjs` are the remaining audit-named focused checks with exact active-sprint assumptions.
- `lib/agent-feedback-routes.js` owns the Agent Feedback route split dogfood used by the historical proof.

Existing docs:

- `docs/process/sprint-check-historical-mode-001-plan.md`
- `docs/_archive/audits/2026-05-19-foundation-deep-merge-audit.md`
- `docs/process/deep-audit-findings-closure-gate-001-plan.md`

Existing scripts:

- `process:sprint-check-historical-mode-check`
- `process:code-quality-nightly-audit-check`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`
- `process:foundation-ship`

Live backlog truth:

- `SPRINT-CHECK-HISTORICAL-MODE-001` is done and reusable.
- `FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001` is the active blocker.
- `FOUNDATION-CSS-SURFACE-DECOUPLE-001` is the next audit-control card.

Not rebuilt:

- No second sprint system.
- No broad rewrite of every legacy focused proof.
- No replacement of live Current Sprint DB/API truth.
- No source/value/extraction expansion.

Exact gap:

- The May 19 deep audit named dated sprint-ID assumptions in these refs:
  - `lib/foundation-current-sprint.js`
  - `lib/foundation-verify-registry-split.js`
  - `lib/kpi-health.js`
  - `lib/gstack-build-intel.js`
  - `scripts/process-agent-feedback-routes-split-check.mjs`
  - `scripts/process-app-page-routes-split-check.mjs`

## Acceptance Criteria

- `scripts/process-agent-feedback-routes-split-check.mjs` imports `evaluateSprintCheckHistoricalMode()` and `getFoundationBuildCloseouts()`.
- `scripts/process-app-page-routes-split-check.mjs` imports `evaluateSprintCheckHistoricalMode()` and `getFoundationBuildCloseouts()`.
- `npm run process:focused-sprint-id-historical-aware-check -- --json` reports `snapshot.ok=true`.
- The focused proof classifies all 8 audit-named sprint ID refs as one of:
  - bootstrap metadata only,
  - historical closeout metadata only,
  - card metadata only,
  - verified-closeout-aware focused proof.
- The proof output shows `8/8 audit refs allowed` and `0 unsafe direct sprint comparisons`.
- Dogfood output shows `staleDirect.historicalAware=false` and `doneFallback.historicalAware=true`.
- `lib/deep-audit-findings-closure-gate.js` marks `focused-check-active-sprint-id-assumption` as `routeStatus: 'done'` with `targetCloseoutKey: 'focused-sprint-id-historical-aware-v1'`.
- `npm run process:focused-sprint-id-historical-aware-check -- --close-card --json` marks the card done and advances Current Sprint to `FOUNDATION-CSS-SURFACE-DECOUPLE-001`.
- Pass score/status: the Plan Critic result must be `pass` at score `9.8` or higher before close-card writeback.

## Operator Value

Steve and the overnight builder can rerun old focused checks after a sprint rolls forward without false failures from stale dated sprint IDs. If a future proof reintroduces the bad pattern, the detector names the exact file and line instead of letting the system burn time on confusing closeout failures.

## Definition Of Done

- Focused proof: `npm run process:focused-sprint-id-historical-aware-check -- --close-card --json` exits 0 with `status=healthy`, `failedCount=0`, `snapshot.ok=true`, and active blocker `FOUNDATION-CSS-SURFACE-DECOUPLE-001`.
- Code-quality audit: `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch` exits 0 and does not emit `focused-check-active-sprint-id-assumption`.
- System Health: `npm run process:system-health-nightly-audit-check -- --json` exits 0 with healthy status.
- Repeated-failure gate: `npm run process:build-lane-repeated-failure-action-gate-check -- --json` exits 0 with no blockers.
- Backlog hygiene: `npm run backlog:hygiene -- --json` exits 0.
- Verifier: `npm run foundation:verify -- --json-summary` exits 0.
- Ship: `npm run process:foundation-ship -- --card=FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 --planApprovalRef=docs/process/approvals/FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001.json --closeoutKey=focused-sprint-id-historical-aware-v1 --commitRef=HEAD` exits 0.
- Git: main is clean, pushed, and `HEAD == origin/main` after ship.

## Details

Behavior boundary:

- Active cards can still prove against the active Current Sprint.
- Closed cards must prove through live done-lane backlog truth plus a matching verified closeout.
- Bootstrap/default sprint literals must be explicitly marked as non-live truth.
- Historical replay literals must be explicitly marked as historical closeout truth.

Implementation scope:

- Add `lib/focused-sprint-id-historical-aware.js` for the reusable detector and dogfood proof.
- Add `scripts/process-focused-sprint-id-historical-aware-check.mjs` for focused proof and guarded closeout.
- Update the two audit-named focused checks to use `evaluateSprintCheckHistoricalMode()`.
- Route the May 19 audit finding to this closeout.

Not in scope:

- Do not rewrite every legacy process check in this card.
- Do not remove bootstrap/default sprint metadata that is explicitly marked as non-live truth.
- Do not weaken active Current Sprint proof for cards that are actually active.
- Do not start source/value/extraction expansion.

Gate decision tree:

- Static syntax check first.
- Focused proof with `--close-card` next because this mutates backlog and Current Sprint only through guarded closeout posture.
- Health gates next: System Health, repeated-failure gate, and backlog hygiene.
- Full ship gate last because this touches process proof, audit routing, package scripts, closeout records, and verifier coverage.

Speed bound:

- The focused proof is local-file and local-DB only.
- It does not fetch external providers, run extraction jobs, mutate source systems, or hit browser/auth surfaces.
- Target runtime is under 2 minutes so it can run during every card closeout.

Rollback or repair path:

- If the focused detector finds an unsafe direct active-sprint comparison, do not close the card; update that focused proof to use `evaluateSprintCheckHistoricalMode()` or explicitly mark the literal as metadata-only.
- If the Agent Feedback or App Page historical proof fails, repair the verified closeout lookup first; do not reintroduce exact active-sprint assertions as a force-pass.
- If Plan Critic fails, revise the plan before close-card writeback.
- If System Health or repeated-failure gates fail, repair raw health first, then rerun this focused proof.
- If the full ship gate fails after commit, keep the card unpushed until the failing proof is fixed and `process:foundation-ship` passes.

## Risks

- Risk: this becomes a broad rewrite of old proofs. Mitigation: V1 handles the audit-named refs and adds a reusable detector.
- Risk: active-card proof gets weakened. Mitigation: the existing helper still requires active cards to be in allowed active proof stages unless a verified historical closeout exists.
- Risk: bootstrap sprint metadata is mistaken for live truth. Mitigation: the focused detector requires explicit metadata-only posture comments.

## Tests

```bash
node --check lib/focused-sprint-id-historical-aware.js lib/agent-feedback-routes.js scripts/process-focused-sprint-id-historical-aware-check.mjs scripts/process-agent-feedback-routes-split-check.mjs scripts/process-app-page-routes-split-check.mjs
npm run process:focused-sprint-id-historical-aware-check -- --close-card --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 --planApprovalRef=docs/process/approvals/FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001.json --closeoutKey=focused-sprint-id-historical-aware-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 --closeoutKey=focused-sprint-id-historical-aware-v1
npm run process:foundation-ship -- --card=FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001 --planApprovalRef=docs/process/approvals/FOCUSED-SPRINT-ID-HISTORICAL-AWARE-001.json --closeoutKey=focused-sprint-id-historical-aware-v1 --commitRef=HEAD
```

## Not Next

- Do not rewrite every legacy focused check.
- Do not create a second sprint system.
- Do not use hardcoded sprint IDs as live truth.
- Do not work `FOUNDATION-CSS-SURFACE-DECOUPLE-001` inside this card.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- Do not mutate Drive permissions.
- Do not send emails/messages, rotate credentials, run paid/provider access, or perform private broad extraction.
