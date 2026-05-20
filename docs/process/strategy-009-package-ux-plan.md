# STRATEGY-009 - Strategy Package UX Cleanup

## What

Clean the Strategy Hub v2 package so each live planning section has one clear job:

- Overview is the command cockpit with compact pressure, planning, meeting, and source status previews.
- Planning Workflow owns priority, carry-forward, stop, and missing-data queues.
- Meeting Packet owns the ownership meeting agenda, pressure readout, and meeting-safe review readout.
- Source Truth owns source-to-gap goal and operating truth.
- Review Queue owns Strategy route decision controls.

The card removes the duplicated Strategy review board preview from Overview and creates a reusable UX contract that fails if route controls leak into Overview, Planning, Meeting, or Source Truth.

## Why

Steve needs the Strategy surface to be usable during live planning without having to translate repeated packet, board, and priority blocks. The system now has source-to-gap truth, planning workflow queues, meeting packet proof, and Strategy route review controls. Those surfaces need clear ownership so future cards do not rebuild the old confusing Strategy Advisor package.

This is not another advisor, model, or extraction card. It is a trust and usability cleanup for the already-built Strategy package.

## Acceptance Criteria

- Strategic Execution navigation has the current live package sections: Overview, Planning Workflow, Meeting Packet, Source Truth, and Review Queue.
- Overview keeps compact previews only and does not render the full Strategy route board or route action controls.
- Planning Workflow, Meeting Packet, and Source Truth do not render route action controls.
- Review Queue remains the only section that renders owner decision, approve/apply, snooze, ignore, and reject controls.
- The old Strategy Advisor chat, old recommended-priority feed, and old package section labels are not revived.
- The focused proof dogfoods duplicate Overview route-board drift, route-control leaks, missing navigation, revived advisor surfaces, and missing Review Queue controls.
- Current Sprint marks `STRATEGY-009` done and advances to `KPI-APPT-QUALITY-001`.

## Definition Of Done

- `lib/strategy-package-ux-contract.js` owns the section contract, evaluator, and dogfood proof.
- `public/strategic-execution.html` uses the cleaned section labels.
- `public/strategic-execution.js` centralizes section definitions and removes the duplicate full route-board preview from Overview.
- `scripts/process-strategy-009-check.mjs` validates approval, Plan Critic, live backlog, Current Sprint truth, dogfood behavior, UI contract, verifier coverage, closeout registry, and read-only proof posture.
- Full closeout gates pass and main is clean/pushed.

## Details

## Reuse Existing Work

This card does not rebuild Strategy Hub. It reuses the current source-backed stack:

- `STRATEGY-004` already built the deterministic source-backed planning workflow.
- `lib/strategy-shared-comms-routes.js` already exposes `/api/strategic-execution/v2`.
- `public/strategic-execution.js` already renders Overview, Planning Workflow, Meeting Packet, Source Truth, and Review Queue sections.
- `lib/strategy-hub-meeting-ready.js` already owns meeting packet behavior.
- `lib/strategy-planning-workflow.js` already owns planning queue behavior.
- `lib/intelligence-action-router.js` already owns strategy route provenance and controls.
- Existing gates reused: `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Existing docs reused:

- `docs/process/strategy-004-planning-workflow-plan.md`
- `docs/process/strategy-hub-meeting-ready-001-plan.md`
- `docs/process/strategic-intel-001-plan.md`
- `docs/process/intel-scoper-001-plan.md`
- `docs/specs/2026-04-27-strategy-hub-v2-source-to-gap-manifest.md`

Existing policy reused:

- Strategy Hub v2 consumes deterministic source-backed payloads; old advisor chat stays offline.
- Detected decisions and Strategy route writes remain human-approved.
- Route controls belong in Review Queue, not passive readout surfaces.
- Meeting Vault Phase B and Drive permission mutation are explicitly out of scope.

Behavioral cleanup:

- Overview remains useful, but it no longer repeats the full Strategy route review board. It can show compact status and links to the owned sections.
- Route controls stay in Review Queue because applying, snoozing, rejecting, or owner-routing a Strategy route is a decision workflow, not passive planning context.
- Meeting Packet may show meeting-safe route readout, but not action controls.
- Source Truth stays about live source-backed facts, not recommendations.

The focused proof checks behavior boundaries, not just string presence. It extracts the UI function bodies and proves route controls are only owned by Review Queue.

Gate decision: full gate. The blast radius touches a live operator UI, package navigation, Current Sprint truth, and verifier coverage. The implementation is intentionally small: one contract module, one focused process check, a narrow UI label/Overview cleanup, closeout docs, and registry wiring.

Speed bound: the focused proof must stay fast enough to run by default. It reads local files, validates live sprint/backlog metadata, and evaluates synthetic fixtures only. It must not launch jobs, call providers, crawl sources, run browser automation, or run full `foundation:verify` internally. Full `foundation:verify` and `process:foundation-ship` remain closeout gates, not inner-loop checks.

## Risks

- Risk: the cleanup removes useful command context from Overview. Repair path: keep compact planning, meeting, source, and KPI previews; only remove the duplicate full route-board preview.
- Risk: the proof becomes a brittle substring check. Repair path: parse relevant function bodies and dogfood known UI drift modes.
- Risk: the old advisor/recommended-priority surface sneaks back in. Repair path: fail focused proof if old advisor or recommendation names return.
- Risk: this expands into broader Strategy features. Repair path: keep this card to UX contract and section ownership; advance to KPI cards after closeout.

## Tests

- `node --check lib/strategy-package-ux-contract.js public/strategic-execution.js scripts/process-strategy-009-check.mjs`
- `npm run process:strategy-009-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=STRATEGY-009 --planApprovalRef=docs/process/approvals/STRATEGY-009.json --closeoutKey=strategy-009-package-ux-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=STRATEGY-009 --closeoutKey=strategy-009-package-ux-v1`
- `npm run process:foundation-ship -- --card=STRATEGY-009 --planApprovalRef=docs/process/approvals/STRATEGY-009.json --closeoutKey=strategy-009-package-ux-v1 --commitRef=HEAD`

## Not Next

- No old Strategy Advisor chat.
- No model/provider/browser/auth/private extraction lanes.
- No external writes, sends, credential mutation, provider config change, Drive permission mutation, or paid/browser-auth work.
- No auto-created backlog cards or auto-applied decisions.
- No KPI appointment or lead-quality implementation until this card ships.
- No broad Strategy feature expansion outside package UX cleanup.
