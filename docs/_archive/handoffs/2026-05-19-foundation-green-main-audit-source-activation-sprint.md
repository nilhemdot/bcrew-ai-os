# Foundation Green Main Audit Source Activation Sprint

Date: 2026-05-19
Sprint: `FOUNDATION-GREEN-MAIN-AUDIT-AND-SOURCE-ACTIVATION-2026-05-19`

## Mission

Get Foundation fully green, upgrade the auditor, lock main integration discipline, upgrade dual/parallel work lanes, then resume source/extraction activation.

Work from `main`. Do not let completed work pile up on long-lived branches. Commit and push each completed card or tight bundle to `main` after proof passes.

## Confirmed Context

- `main` is synced at `9b6111c`.
- `origin/main` matches local `main`.
- `foundation:verify` passes `516/516`.
- Backlog hygiene is clean.
- System health has been watch/yellow, not fully green.
- The 108-card/108-commit Foundation branch pileup is merged, but the process guardrail must prevent recurrence.

## Sprint Order

### 1. `FOUNDATION-MAIN-INTEGRATION-LOCK-001`

Goal: Make `main` the enforced integration truth.

Required:

- Prove `main`, `origin/main`, served dashboard, served worker, and current closeout truth agree.
- Prove no completed Foundation card/bundle is sitting only on a long-lived branch without an explicit release-train record.
- Preserve or route side commits without silently mixing them into Foundation main.
- Add proof so future completed cards cannot pile up outside main unnoticed.
- Dogfood the 108-card/108-commit pileup: it should be risk unless merged or explicitly release-trained.

Done:

- Main integration check passes.
- Current repo is clean/synced.
- Branch pileup detection proof exists.
- Commit pushed to main.

### 2. `PARALLEL-BUILDER-MERGE-LANE-ENFORCEMENT-001`

Goal: Upgrade dual/parallel builder rules so multiple workers can run without branch/main chaos.

Required:

- Define builder lanes: main session, worker branch/worktree, review/integration lane.
- Require file ownership and non-overlap for parallel work.
- Require every completed card/bundle to enter a merge queue.
- Serialize merges to main.
- Require post-merge main verification.
- If main fails after merge, pause the queue and route repair before more work merges.
- If a worker blocks, it records the blocker and continues only on non-conflicting safe work.
- No hidden workers or untracked parallel builders.

Done:

- Parallel builder protocol includes merge queue behavior.
- Proof rejects shared branch chaos, same-worktree conflict, overlapping file scopes, and unmerged completed-card pileup.
- Commit pushed to main.

### 3. `FOUNDATION-HEALTH-WATCH-TO-GREEN-001`

Goal: Move Foundation from system-health watch/yellow to green.

Required:

- Clear every avoidable yellow/watch row.
- For approval/provider/private/external-write limits, classify the row with owner, reason, threshold, and next action.
- Meeting-notes current sync stays approval-bound unless Steve explicitly approves live rerun.
- Google Workspace degraded row is repaired or honestly classified.
- Runtime/job failures do not stay ambiguous.
- Endpoint/doc/file-size watch rows are handled or classified.

Done:

- System health is green, or any remaining non-green row is explicitly approval-bound/watch-thresholded and not misleading.
- Full gates pass.
- Commit pushed to main.

### 4. `AUDIT-FINDING-TO-BACKLOG-ROUTER-001`

Goal: Audits create motion instead of report-only work.

Required:

- Every red/yellow audit finding routes to one of: existing live backlog card, new proposed/scoped card, stale/obsolete with proof, approval-required blocker, or watch-only threshold item.
- If audit names a card-shaped ID, that ID must exist in live backlog or be created as proposed/scoped.
- Audit cannot leave recommended repair work only in markdown/json.
- Dogfood a missing card-shaped audit recommendation and prove the router creates/routes it.
- Include May 18/19 audit findings as current dogfood.

Done:

- Audit-to-backlog router proof passes.
- No missing card-shaped audit recommendations remain.
- Commit pushed to main.

### 5. `FOUNDATION-ENDPOINT-METRICS-FRESHNESS-001`

Goal: Make endpoint/API budget health current and trustworthy.

Required:

- Refresh or repair missing endpoint metrics for key Foundation APIs.
- Ensure system health does not show stale/missing endpoint budget rows when endpoints are measurable.
- Preserve lazy-loading and route budget rules.
- Include payload and latency proof for Foundation Hub, source-of-truth, source-lifecycle, build-log, and gstack/build-intel routes.

Done:

- Endpoint metrics are current.
- Endpoint watch rows clear or become explicit threshold watch rows.
- Commit pushed to main.

### 6. `FOUNDATION-HANDOFF-HOT-DOC-CLEANUP-001`

Goal: Clean `docs/handoffs` hot-doc bloat without deleting useful history.

Required:

- Archive or roll up cold handoffs.
- Keep current working handoffs hot.
- Preserve history in archive/monthly summary.
- Do not delete useful closeouts.
- Update references if paths move.

Done:

- Hot-doc line/file watch rows are reduced or honestly classified.
- Doc artifact guard passes.
- Commit pushed to main.

### 7. `FOUNDATION-FILE-SIZE-WATCH-CLASSIFIER-001`

Goal: Make file-size watch rows actionable instead of vague noise.

Required:

- For each watched large file, classify as split now, wrapper-only allowed, planned split with owner/threshold, or acceptable generated/registry file.
- Split only if needed.
- Do not add responsibility to files already near limits.
- Keep verifier under hard guard.

Done:

- File-size watch rows clear or become explicit classified watch rows.
- Proof prevents vague size warnings.
- Commit pushed to main.

### 8. `FOUNDATION-HEALTH-GREEN-LOCK-001`

Goal: Prevent false-green system health.

Required:

- System health cannot report green if red/yellow rows are unclassified.
- Approval-bound rows can be non-green only if owner/reason/next action are explicit.
- Watch rows need thresholds.
- Add dogfood for false-green prevention.

Done:

- Health-green lock proof passes.
- Full system health reflects real status.
- Commit pushed to main.

### 9. `EXTRACT-CURRENT-001`

Goal: Start real Foundation mission work with current-day source freshness.

Required:

- Prove current-day safe source lanes are fresh or truthfully degraded.
- Prove partial-failure behavior.
- Meeting-notes live rerun stays approval-bound.
- No private/auth/paid/provider/external-write lanes.
- Focused proof first, then full gates.

Done:

- Current extraction readiness proof exists.
- Source lanes have clear safe/blocked/degraded status.
- Commit pushed to main.

### 10. `EXTRACT-BACKFILL-001`

Goal: Define durable historical backfill/cursor contract.

Required:

- Backfill has cursor, source posture, skip reason, retry, and partial-failure rules.
- No broad live extraction unless source posture allows it.
- Approval-required/private/auth sources stay blocked.

Done:

- Backfill contract/proof exists.
- Commit pushed to main.

### 11. `DRIVE-CONTENT-001`

Goal: Ship the next safe Drive content extraction bite.

Required:

- No-auth/safe Drive file coverage.
- File-type support list.
- Skip reasons.
- Manifest/ledger proof.
- No Drive permission mutation.

Done:

- Drive content bite proof passes.
- Commit pushed to main.

### 12. `EMAIL-ATTACHMENTS-001`

Goal: Ship email/Missive attachment lane proof.

Required:

- Manifest, supported types, and skip reasons.
- No unsafe private extraction.
- No external writes.

Done:

- Attachment lane proof passes.
- Commit pushed to main.

## Operating Rules

- Work from `main`.
- Commit and push every completed card or tight bundle to `main`.
- Do not leave finished work on long-lived branches.
- Do not stop after one card.
- If a card blocks on Steve approval, classify it with owner/next action and continue to the next safe card.
- If red health appears, fix it before continuing.
- If yellow/watch appears, clear or classify it before calling the system green.
- Keep Current Sprint accurate.
- Focused proof first, then full gates.
- End each card with closeout, proof, commit, push.

## End-Of-Run Report

- Cards shipped.
- Commits pushed to main.
- System health status.
- Remaining watch rows, if any, with classification.
- Audit router status.
- Merge/parallel lane status.
- Next recommended work.
