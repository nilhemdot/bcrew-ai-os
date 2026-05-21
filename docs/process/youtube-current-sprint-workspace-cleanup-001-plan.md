# YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001 Plan

## What

Clean the live `YouTube To Dev Team Intelligence V1` sprint workspace.

The active sprint is correct, but the Current Sprint overlay still carries old `done_this_sprint` rows from prior Foundation/Brain Fleet work. Those cards are real shipped work, but they belong in Backlog `done` and Recent Work, not inside the new sprint board.

## Why

Steve should be able to open Recent Work / Current Sprint and see only the sprint we are actually executing. Old done rows make the board look like one giant continuous sprint and make it harder to trust what is next.

## Acceptance Criteria

- Live Current Sprint contains only the active YouTube sprint cards.
- `Done This Sprint` is empty immediately after the cleanup; historical shipped cards stay in Backlog `done` and Recent Work.
- Active blocker remains `YOUTUBE-CREATOR-DAILY-WATCH-001`.
- Sprint order is exactly:
  1. `YOUTUBE-CREATOR-DAILY-WATCH-001`
  2. `DEV-TEAM-HUB-V0-001`
  3. `YOUTUBE-BUILD-INTEL-LINK-RESOURCE-002`
  4. `EXTRACTOR-OVERNIGHT-RUN-GUARD-001`
  5. `MARK-KASHEF-LAST-50-BASELINE-001`
  6. `YOUTUBE-LATEST-20-INTEL-RUN-001`
  7. `DEV-TEAM-INTELLIGENCE-DIRECTOR-001`
  8. `BUILD-OPPORTUNITY-PROMOTION-GATE-001`
  9. `BUILD-INTEL-EXTRACTION-IMPLEMENTATION`
- The Current Sprint panel in Recent Work shows the sprint plan reference so the sprint plan is visible where execution is managed.
- The prior daily-watch sprint writer no longer preserves old `done_this_sprint` rows on apply.
- Focused proof verifies live DB/API readback, docs, package script, closeout registry, verifier coverage, UI sprint-plan link wiring, and old-card removal.
- The focused proof command must pass/revise correctly: it blocks before apply, passes after guarded apply, and records a durable Plan Critic pass score for `YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001`.

## Definition Of Done

Done means `YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001` is closed under `youtube-current-sprint-workspace-cleanup-v1`, live Current Sprint is reset to the nine active YouTube sprint cards only, the Current Sprint panel exposes the sprint plan reference, the focused proof and `process:foundation-ship` pass, and Foundation gates remain green.

## Details

Existing code, existing docs, existing scripts, and live backlog truth reused:

- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/process/youtube-dev-team-intelligence-sprint-plan-001-plan.md`
- `docs/process/youtube-creator-daily-watch-sprint-update-001-plan.md`
- `scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs`
- `lib/foundation-current-sprint.js`
- `lib/foundation-db.js`
- `public/foundation-operations-renderers.js`
- live Backlog and live Current Sprint `YOUTUBE-TO-DEV-TEAM-INTELLIGENCE-V1-2026-05-21`

New focused proof:

- `scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs`

Gate decision tree: this chooses the full gate, not a static-only or focused-only closeout. The blast radius includes live Current Sprint overlay truth, operator-facing UI, control docs, package script, closeout registry, verifier coverage, and `process:foundation-ship`, so the card must run the focused cleanup proof plus full Foundation ship gates.

Behavior proof: the focused proof calls the actual function path through `upsertFoundationCurrentSprintOverlay()`, `getActiveFoundationCurrentSprint()`, live Backlog reads, and the Current Sprint DB/API helper round trip. It rejects weak dogfood cases where the board still has old `done_this_sprint` rows, where the active blocker moves, where the order is wrong, or where the sprint-plan metadata is missing. It does not accept substring-only proof; marker checks cannot replace the live DB/API/process behavior.

Operator value: Steve and the build team get real workflow quality: a clean Current Sprint board showing only the work being executed now, with the sprint plan visible at the top of the Recent Work Current Sprint panel. This unlocks faster builder check-ins and less time wasted re-explaining that old shipped cards are history, not current blockers.

Speed boundary: this is a narrow, fast, proportional sprint-workspace repair designed to run under two minutes outside full ship. It is not another heavy crawl. It does not build the daily watcher, crawl YouTube, run extraction, call models, or change source authorization.

Repair path: if the live sprint still shows old done rows, the card fails closed and remains active. The repair is to fix the exact sprint writer or overlay invariant, rerun the focused proof with `--apply`, and then rerun readback plus full gates. Do not manually edit live DB rows or suppress the Current Sprint gate.

## Risks

- Old cards could be accidentally deleted from backlog. Mitigation: the proof checks old shipped cards are removed only from the active sprint overlay, not from backlog/Recent Work.
- The cleanup could hide current sprint setup context. Mitigation: the sprint plan and correction plan remain in Recent Work closeouts and are linked from the sprint metadata.
- UI could still make the plan hard to find. Mitigation: the Current Sprint panel renders a visible `Sprint plan` link.

## Not Next

- No YouTube crawl or daily watcher implementation.
- No Skool, MyICOR, paid/private/auth/member/community/comment extraction.
- No external writes, purchases, opt-ins, forms, credential mutation, or browser profile mutation.
- No Strategy/People work.
- No MEETING-VAULT-ACL-001 Phase B or Drive permission mutation.

## Tests

- `node --check scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs`
- `npm run process:youtube-current-sprint-workspace-cleanup-check -- --apply --json`
- `npm run process:youtube-current-sprint-workspace-cleanup-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

## Changed Files

- `scripts/process-youtube-current-sprint-workspace-cleanup-check.mjs`
- `docs/process/youtube-current-sprint-workspace-cleanup-001-plan.md`
- `docs/process/approvals/YOUTUBE-CURRENT-SPRINT-WORKSPACE-CLEANUP-001.json`
- `docs/handoffs/2026-05-21-youtube-current-sprint-workspace-cleanup-closeout.md`
- `scripts/process-youtube-creator-daily-watch-sprint-update-check.mjs`
- `public/foundation-operations-renderers.js`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-process-gate-records.js`
- `lib/foundation-verify-coverage-card-ids.js`
- `package.json`
