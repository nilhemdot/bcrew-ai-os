# FOUNDATION-HEALTH-GREEN-LOCK-001 Plan

## What

Lock Foundation health semantics so green means green.

This card replaces the last classification loophole: raw red/yellow System Health rows cannot report top-level green unless every visible row has an explicit Steve-approved exception in live sprint truth. Stale embedded sprint health summaries also fail proof instead of letting old raw counts sit in metadata.

## Why

The May 19 recovery showed the failure mode clearly: the system could classify red/yellow rows and make the operator surface look green while live workflows were still broken or stale. Steve's rule is stricter:

- classification is not repair
- repeated failure is a repair trigger
- workflow red/yellow blocks normal progression
- exceptions require explicit Steve approval in sprint truth
- stale sprint health cannot pretend to be current truth

## Acceptance Criteria

- `buildFoundationSystemHealthSnapshot()` uses a green-lock layer after classification.
- Raw risk/watch rows block green by default even if classified.
- The only allowed non-raw-green path requires a Steve-approved sprint exception with finding ID or repair card, owner, reason, threshold, next action, repair card, approval source, and review/expiry.
- Hidden raw counts fail closed.
- Thresholdless or ownerless exceptions fail.
- Stale embedded sprint health summaries are refreshed or removed during closeout.
- Live System Health remains healthy with `rawRiskCount=0` and `rawWatchCount=0`.
- Current Sprint advances to `FOUNDATION-LESSONS-LEARNED-LOOP-001` after closeout and the approved Foundation-only run order is represented in live sprint truth.

## Definition Of Done

- `lib/foundation-health-green-lock.js` owns reusable green-lock evaluation and dogfood proof.
- `lib/foundation-system-health.js` reports `greenLockStatus`, `greenLockBlocksGreen`, and current-sprint health truth lock output.
- `scripts/process-foundation-health-green-lock-check.mjs` proves live health, dogfood, stale-sprint-health rejection, package script, verifier coverage, closeout registry, live backlog, and Current Sprint progression.
- Missing approved next cards are created/scoped if absent.
- The live sprint metadata no longer carries stale `systemHealthSummary` raw counts.
- Focused proof, System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` pass before push.

## Details

The lock runs after existing health classification. Existing classification remains useful for owner, reason, repair card, threshold, and next action visibility, but classification alone no longer changes the top-level health status to green.

Approved exception shape:

- `findingId` or matching `repairCardId`
- `approvedBy: Steve`
- `owner`
- `reason`
- `threshold`
- `nextAction`
- `repairCardId`
- `approvalSource`
- `expiresAt` or `reviewBy`

If a row is approval-bound or intentionally paused, the health rollup still cannot call the system green unless that exact exception exists in sprint truth.

Root invariant: System Health top-level green must prove live raw health is green or every visible raw non-green finding has a specific Steve-approved sprint exception. The proof must not make Current Sprint, active blocker, dashboard, or verifier symptoms pass by suppressing rows, ignoring failures, or bypassing stale metadata. It must prove the actual invariant through DB-backed sprint truth, function path behavior, and focused process checks.

## Reuse Existing Work

Reuse existing code:

- `lib/foundation-system-health.js`
- `lib/foundation-health-watch-to-green.js`
- `lib/foundation-current-sprint.js`
- `lib/foundation-db.js`
- `lib/connector-uptime-monitor.js`

Reuse existing docs:

- `docs/process/foundation-raw-green-repair-and-lock-001-plan.md`
- `docs/process/foundation-file-size-watch-classifier-001-plan.md`
- `docs/_archive/handoffs/2026-05-19-foundation-file-size-watch-classifier-closeout.md`
- live Current Sprint truth
- live backlog truth

Reuse existing scripts:

- `scripts/process-system-health-nightly-audit-check.mjs`
- `scripts/process-current-sprint-dynamic-truth-check.mjs`
- `scripts/process-build-lane-repeated-failure-action-gate-check.mjs`
- `scripts/process-foundation-ship.mjs`

## Behavioral Proof

Behavior proof runs actual function paths, not substring-only markers. Substring-only proof is rejected.

- `buildFoundationHealthGreenLockDogfoodProof()` dogfoods raw green, unapproved raw watch, Steve-approved exception, thresholdless exception, hidden raw count, and stale embedded sprint health.
- `buildFoundationSystemHealthSnapshot()` is called through the live process path and must return raw green before closeout.
- `buildCurrentSprintHealthTruthLock()` rejects stale embedded Current Sprint health summaries.
- The focused process check reads live DB-backed backlog and Current Sprint truth before mutating anything.
- The focused process check runs System Health, Current Sprint dynamic truth, and repeated-failure gate as subprocesses.

The card also refreshes the unattended Foundation-only sprint order:

1. `FOUNDATION-LESSONS-LEARNED-LOOP-001`
2. `FOUNDATION-BACKLOG-P0-REALITY-CLEANUP-001`
3. `SYSTEM-010`
4. `SOURCE-012`
5. `SOURCE-018`
6. `EXTRACT-CURRENT-001`
7. `EXTRACT-BACKFILL-001`
8. `DRIVE-CONTENT-001`
9. `EMAIL-ATTACHMENTS-001`
10. `FOUNDATION-SPRINT-CLOSEOUT-AND-CONTINUOUS-WORK-READY-001`

## Risks

- This touches the main System Health rollup, so the full ship gate is required.
- If live raw health becomes red/yellow during the card, the card must stop and repair or report the real blocker.
- The script mutates backlog and Current Sprint only under explicit `--apply --close-card`.
- This must not become source/extract/value work. The only sprint changes are card scoping and sequencing.

## Tests

- `node --check lib/foundation-health-green-lock.js lib/foundation-system-health.js lib/foundation-current-sprint.js scripts/process-foundation-health-green-lock-check.mjs`
- `npm run process:foundation-health-green-lock-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:current-sprint-dynamic-truth-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-HEALTH-GREEN-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-GREEN-LOCK-001.json --closeoutKey=foundation-health-green-lock-v1 --commitRef=HEAD`

Gate decision tree: this is a full blast-radius card because it touches System Health rollup semantics, Current Sprint metadata, live backlog/sprint closeout, and the Foundation ship path. Focused proof catches the specific invariant first, then `foundation:verify` and `process:foundation-ship` run before push.

## Operator Value

Steve gets a health surface that cannot claim green by clever classification. Yellow can be managed, red can be repaired, and exceptions can exist, but the system has to show the exact approval and next action instead of hoping someone notices later.

Useful operator behavior: Steve can leave the builder unattended without babysitting whether a classified workflow failure is being hidden. The next real workflow blocker stays visible, quality improves because false-green paths fail closed, and speed improves because builders stop burning repeated runs on broken proof loops.

## Speed And File-Size Budget

The focused green-lock proof is thin and should run in under 2 minutes. It uses direct function dogfood and subprocess checks instead of another heavy audit. Full `foundation:verify` and `process:foundation-ship` still run at closeout because the blast radius is the System Health substrate.

## Rollback Or Repair Path

If this proof fails, keep `FOUNDATION-HEALTH-GREEN-LOCK-001` active. Repair the underlying health row first if raw health is not green. If the green-lock logic is wrong, revert only this card's helper/wiring and restore the previous health rollup, then reopen the card with the failing dogfood case attached.

## Tight Scope And Not Next

This card does not:

- start Value Builder split
- start source/value/agent feature work
- run live extraction or private broad extraction
- mutate Drive permissions
- send email, Agent Feedback, or external writes
- rotate provider keys
- launch parallel builders
