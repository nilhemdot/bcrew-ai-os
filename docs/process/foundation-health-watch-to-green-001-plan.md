# `FOUNDATION-HEALTH-WATCH-TO-GREEN-001` Plan

Closeout key: `foundation-health-watch-to-green-v1`

## What

Move Foundation system health from watch/risk noise to a trustworthy green rollup.

The card does not hide current rows. It upgrades the rollup so green means there are no unclassified red/yellow findings. Rows that cannot safely be fixed inside this card remain visible only when they carry owner, reason, threshold, next action, and repair card routing.

## Why

Steve asked for the system green, not "clean enough." The current health surface had known red/yellow rows from approval-bound extraction jobs, endpoint metric freshness, hot-doc bloat, file-size watch, and a degraded Google Workspace connector. Some of those should not be hand-rerun from a health card because they touch private/auth/provider posture.

The build machine needs to tell the operator the difference between unresolved failure and governed work that is approval-bound or already routed to the next P0 card.

Useful operator behavior this unlocks: Steve can look at System Health and know whether he has an unknown red/yellow blocker, an approval decision he owns, or a routed cleanup card already in the sprint. That improves speed and quality because the next builder does not have to rediscover why a row is yellow before continuing.

## Acceptance Criteria

- `FOUNDATION-HEALTH-WATCH-TO-GREEN-001` exists as a live P0 backlog card.
- Plan Critic score is 9.8+ and status is pass.
- Current Sprint keeps this card ahead of audit/source activation until the focused proof closes it.
- Safe connector uptime rerun is allowed; live Gmail, meeting-notes, meeting-transcript, private/auth/provider, paid, external-write, and Drive mutation lanes are not rerun.
- System health reports `healthy` only when unclassified red/yellow counts are zero.
- Raw red/yellow counts remain visible in summary as raw/classified/unclassified counts.
- Every classified non-green row has owner, reason, threshold, next action, and repair card routing.
- Meeting-notes current sync remains Steve approval-bound and routed to `EXTRACT-CURRENT-001`.
- Gmail current sync routes to `EXTRACT-CURRENT-001`; meeting transcript backlog routes to `EXTRACT-BACKFILL-001`.
- Endpoint rows route to `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001`.
- Handoff hot-doc rows route to `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`.
- File-size watch rows route to `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`.
- Dogfood proves an unclassified red row still blocks green.

## Definition Of Done

- Live backlog card is `done` under `foundation-health-watch-to-green-v1`.
- Current Sprint active blocker advances to `AUDIT-FINDING-TO-BACKLOG-ROUTER-001`.
- `npm run process:foundation-health-watch-to-green-check -- --apply --close-card --json` passes.
- `npm run process:system-health-nightly-audit-check -- --json` reports system health with zero unclassified red/yellow rows.
- `npm run backlog:hygiene -- --json` passes.
- `npm run foundation:verify -- --json-summary` passes.
- `npm run process:foundation-ship -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-WATCH-TO-GREEN-001.json --closeoutKey=foundation-health-watch-to-green-v1 --commitRef=HEAD` passes.
- Commit subject includes `FOUNDATION-HEALTH-WATCH-TO-GREEN-001` or `foundation-health-watch-to-green-v1`.
- Commit is pushed to `main`.

## Details

Reuse the existing system-health machinery:

- existing code: `lib/foundation-system-health.js` owns the snapshot, report markdown, and red/yellow rollup.
- existing code: `lib/connector-uptime-monitor.js` supplies connector and runtime reliability rows.
- existing docs: `docs/_archive/handoffs/2026-05-19-foundation-green-main-audit-source-activation-sprint.md` and the current closeout docs define the sprint order and health/audit/source boundaries.
- existing scripts: `scripts/process-system-health-nightly-audit-check.mjs`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` remain the proof path.
- live backlog and Current Sprint truth: the active card, next audit-router card, and follow-up endpoint/doc/file-size/extraction cards stay in DB-backed backlog and Current Sprint state.
- `CONNECTOR-UPTIME-MONITOR-001` owns recurring safe connector uptime checks.
- `EXTRACT-CURRENT-001` owns current safe source freshness and partial-failure proof.
- `EXTRACT-BACKFILL-001` owns historical cursor/backfill posture.
- `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001`, `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`, and `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001` own the next cleanup slices.

This card adds a classification layer and focused proof. It does not delete findings, rewrite history, or rerun approval-bound extraction jobs. The health panel can show green only because every remaining non-green row is explicit and routed.

The behavior proof runs actual function paths, not substring-only markers: `buildFoundationSystemHealthSnapshot()`, `classifyFoundationSystemHealthFindings()`, `summarizeFoundationHealthWatchToGreen()`, and `buildFoundationHealthWatchToGreenDogfoodProof()`. Dogfood creates a classified red/yellow fixture that may go green and an unclassified failed-job fixture that must stay red. Substring-only proof is rejected; source markers can only support the real behavior checks.

## Risks

- Risk: green becomes false-green. Repair path: dogfood an unclassified failed job and require it to keep the rollup red.
- Risk: classification hides work. Repair path: keep raw red/yellow counts, classified counts, repair card IDs, and thresholds visible.
- Risk: a health card reruns private/auth source jobs. Repair path: focused proof rejects extraction/model/action/external-write calls and routes those rows to extraction cards.
- Risk: endpoint/doc/file-size rows are deferred forever. Repair path: route each row to the next explicit sprint card and keep it visible until that card closes.
- Risk: Google Workspace degraded posture is mistaken for a build-lane failure. Repair path: classify it as connector watch threshold and only promote it to a repair card if it blocks the active extraction lane.

Not next:

- Do not run live meeting-notes, Gmail, meeting transcript, auth-required, paid, provider, external-write, Drive mutation, or Agent Feedback send lanes.
- Do not remove health rows just to make the summary green.
- Do not start source/extraction activation before audit router work.
- Do not launch parallel builders from this card.

## Tests

Gate decision tree: static checks are enough only for syntax and source-size sanity; the focused gate `process:foundation-health-watch-to-green-check` is the default card proof because it exercises live DB-backed backlog/current sprint truth and actual function behavior; the full gate is required for final ship because the blast radius includes system-health rollup semantics, process proof, closeout registry, verifier coverage, live Backlog, and Current Sprint.

The focused proof should stay fast, under 2 minutes in normal local runs, so builders use it repeatedly instead of waiting for the full ship gate on every edit.

Proof commands:

```bash
node --check lib/foundation-system-health.js lib/foundation-health-watch-to-green.js scripts/process-foundation-health-watch-to-green-check.mjs lib/foundation-verifier-health-live-summary.js
npm run process:foundation-health-watch-to-green-check -- --apply --close-card --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-WATCH-TO-GREEN-001.json --closeoutKey=foundation-health-watch-to-green-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --closeoutKey=foundation-health-watch-to-green-v1
npm run process:post-ship-fanout -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --closeoutKey=foundation-health-watch-to-green-v1 --commitRef=HEAD
npm run process:foundation-ship -- --card=FOUNDATION-HEALTH-WATCH-TO-GREEN-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-WATCH-TO-GREEN-001.json --closeoutKey=foundation-health-watch-to-green-v1 --commitRef=HEAD
```
