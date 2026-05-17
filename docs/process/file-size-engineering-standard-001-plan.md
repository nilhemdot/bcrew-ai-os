# FILE-SIZE-ENGINEERING-STANDARD-001 Plan

## What
Canonicalize the Foundation file-size engineering standard as a narrow V1 guardrail across Plan Critic, System Health, ship preflight, verifier coverage, focused proof, and Recent Work closeout.

## Why
Foundation just brought the emergency critical files under 5,000 lines, but without an enforced standard the same old-system pattern can return: large roots absorb new responsibility until review, proof, and ship gates become brittle. Steve and the operator team need this real workflow to unlock speed and quality without depending on manual file-size judgment.

## Acceptance Criteria
- The standard encodes preferred hand-written modules at 1,500 lines or less, watch posture above 1,500 lines, and red/danger posture above 10,000 lines.
- Generated files, data records, approval JSON, and report artifacts require separate explicit file-size budgets before they grow.
- Plan Critic rejects a synthetic plan that adds behavior to an over-budget hand-written file without a split/no-new-responsibility plan.
- System Health surfaces file-size risk with a synthetic red/danger row and keeps current watched roots visible.
- Ship preflight/verifier fail if the file-size standard is missing or a watched hand-written file crosses red/danger.
- Focused proof is `npm run process:file-size-engineering-standard-check -- --json`; full proof is `npm run process:foundation-ship`.

## Definition Of Done
- Reuse the existing Plan Critic architecture-rule path, existing System Health snapshot/report path, existing ship preflight path, existing verifier runtime reliability module, existing approval integrity, existing live backlog, and existing closeout registry.
- Existing code, existing docs, existing scripts, Current Sprint context, and live backlog truth are reused; no parallel file-size source of truth is introduced.
- Add `lib/foundation-file-size-standard.js` as the domain module; keep root verifier changes to source/coverage plumbing only and add no new root verifier responsibility.
- Add `docs/process/approvals/FILE-SIZE-ENGINEERING-STANDARD-001.json` and a valid live Plan Critic pass row.
- Add a live backlog card and close it only after focused proof and full foundation ship gates pass.
- Add a closeout registry record under `file-size-engineering-standard-v1`.

## Details
The split plan is domain-based: `lib/foundation-file-size-standard.js` owns thresholds, file classification, line-count rows, Plan Critic file-size findings, System Health file-size status, ship-preflight status, and dogfood proof. `lib/plan-critic-architectural-rules.js` stays a thin caller for the existing architecture-rule gate. `lib/foundation-system-health.js` adds the file-size rollup to its existing report-only snapshot. `lib/foundation-ship-preflight.js` adds a standard/danger-budget preflight check. `lib/foundation-runtime-reliability-verifier.js` verifies the new card through its existing runtime/process reliability surface.

Gate decision tree: static gate is `node --check` for touched modules and scripts, focused gate is `npm run process:file-size-engineering-standard-check -- --json`, and full gate is `npm run process:foundation-ship` because this touches shared Foundation process files. Main-session approved active sprint scope owns the shared files; this is Foundation process work, not side/hub work.

Explicit file-size budget: data records and approval JSON stay under 3,000 lines, report artifacts and handoff artifacts stay under 3,000 lines, generated files stay under 10,000 lines, and no generated payload is added. Current watched roots above 1,500 lines are not hidden as green; they are allowed as watch surfaces until `CRITICAL-ROOTS-UNDER-3K-PHASE-1` reduces them.

## Risks
The main risk is over-blocking valid work during the transition. Repair path is to add a real split/no-new-responsibility plan for hand-written files above 1,500 lines, or an explicit generated/data/report budget for artifact growth. Another risk is treating current 4,000-line roots as failure instead of transition work; V1 surfaces them as watch, while red/danger above 10,000 blocks ship.

## Tests
Run `npm run process:file-size-engineering-standard-check -- --json`, `npm run process:plan-critic-architectural-rules-check -- --json`, `npm run process:system-health-nightly-audit-check -- --json`, `npm run process:foundation-ship-preflight -- --json --dogfood`, `npm run foundation:verify -- --failures-only`, `npm run foundation:verify`, `npm run backlog:hygiene -- --json`, and full `npm run process:foundation-ship -- --card=FILE-SIZE-ENGINEERING-STANDARD-001 --planApprovalRef=docs/process/approvals/FILE-SIZE-ENGINEERING-STANDARD-001.json --closeoutKey=file-size-engineering-standard-v1 --commitRef=HEAD`.

## Not Next
Do not split the critical roots below 3,000 lines inside this card. Do not touch Harlan, Fal, voice, Canva, hub feature work, connector auth, Agent Feedback live auto-send, DB schema, route behavior, or Steve's local mockup assets.
