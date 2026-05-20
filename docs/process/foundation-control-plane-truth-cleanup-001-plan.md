# FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001 Plan

## What

Repair Foundation control-plane truth before Brain Fleet, extractor, Strategy, or People work continues. This card closes the mismatch where live Current Sprint truth pointed at `STRATEGY-003` while Steve's actual command order is Foundation/control-plane cleanup, Brain Fleet, Extractor proof, Extraction scale, then Strategy Hub.

## Why

Foundation cannot be considered green if the health surface is raw green but the command plane sends builders to the wrong card. The operator value is one coherent live truth: May 20 deep-audit findings are routed, Current Sprint API owns the active blocker, the plan reconcile check agrees with the live API, and Strategy stays parked until the higher-priority Foundation and extraction proof work are ready.

## Acceptance Criteria

- `FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001` gets a Plan Critic pass score at or above 9.8.
- May 20 deep-audit P1/P2 findings are closed, routed, or explicitly accepted with owner, next action, and closeout proof where a route is done.
- `process:current-sprint-active-card-gate-check` no longer requires stale overnight sprint IDs or old order counts as current truth.
- `process:foundation-plan-reconcile-check` treats the May 12 control-plane sprint as historical closeout truth, while active Current Sprint docs match live API truth.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` name Steve's order and route active blocker truth to `/api/foundation/current-sprint`.
- The live Current Sprint overlay names `FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001` as this card during repair and `BRAIN-FLEET-FOUNDATION-001` as the next scoped blocker after close.
- `STRATEGY-003` remains parked; it is not started by this card.

## Definition Of Done

- `process:deep-audit-findings-closure-gate-check` is healthy.
- `process:current-sprint-active-card-gate-check` is healthy.
- `process:foundation-plan-reconcile-check` is healthy.
- `process:system-health-nightly-audit-check` is healthy with raw 0 risk / 0 watch.
- `process:build-lane-repeated-failure-action-gate-check` is healthy.
- `backlog:hygiene` is healthy.
- `foundation:verify` is green.
- `process:foundation-ship` is green.
- Main is clean and pushed.

## Details

Reuse existing code in the Current Sprint overlay, active-card gate, foundation-plan reconcile proof, deep-audit closure gate, Plan Critic, process write guard, System Health check, repeated-failure gate, backlog hygiene, verifier, and ship gate. Reuse existing docs in `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, May 20 deep-audit handoffs, and the orchestrator checkpoint. Reuse existing scripts for the two red process checks, System Health, repeated-failure action gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship`. Reuse live backlog and Current Sprint database truth instead of rebuilding a new planning surface.

This is not a new sprint engine, a second backlog, Brain Fleet implementation, extractor runtime, Strategy Hub work, People work, or broad docs cleanup. It changes only the control-plane truth needed to make the current command order raw green and auditable.

The focused proof must call the real function path and API/process behavior: Current Sprint overlay mutation through the guarded DB helper, active-card validation through `validateCurrentSprintActiveCardGateSnapshot`, May 20 audit routing through `routeDeepAuditFinding`, and `/api/foundation/current-sprint` comparison in the reconcile check. It must dogfood the exact failure mode: stale checks expecting an old sprint/order while the live operator order has moved on. It must reject substring-only proof; source markers alone cannot make this card green.

Gate decision tree: static syntax is required for changed modules and scripts; focused gates are required for the cleanup proof and the two repaired process checks; full gates are required because the blast radius includes live Current Sprint truth, rebuild docs, closeout coverage, verifier coverage, `foundation:verify`, and `process:foundation-ship`.

Operator value: Steve gets one useful workflow signal again. The system health plane, Current Sprint command plane, rebuild docs, and live backlog all agree on what closes now and what waits, which improves speed and quality before any Brain Fleet or extraction work starts.

Speed bound: the focused cleanup proof should stay under 2 minutes by reading metadata, live backlog/current sprint rows, the May 20 audit JSON, and repo docs only. The heavier full gates run at closeout, not inside every small edit loop.

## Risks

- Risk: patching symptoms instead of the root invariant. Mitigation: prove the invariant that live Current Sprint active blocker, active docs, backlog row, closeout registry, and May 20 audit routing agree through DB/API/function behavior.
- Risk: stale historical sprint assumptions are hidden instead of preserved. Mitigation: keep the May 12 control-plane sprint documented as historical closeout truth while removing it from live active-sprint requirements.
- Risk: cleanup drifts into Brain Fleet, extractor, Strategy, People, provider, or source work. Mitigation: this card has explicit not-next boundaries and parks follow-on cards in scoping.
- Repair path: if any focused or full proof fails, fail closed, keep `FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001` open, repair or reopen the owning card/check, and do not advance to Brain Fleet or Strategy until raw green is restored.

## Tests

- `node --check lib/foundation-control-plane-truth-cleanup.js scripts/process-foundation-control-plane-truth-cleanup-check.mjs scripts/process-current-sprint-active-card-gate-check.mjs scripts/process-foundation-plan-reconcile-check.mjs`
- `npm run process:foundation-control-plane-truth-cleanup-check -- --close-card --json`
- `npm run process:deep-audit-findings-closure-gate-check -- --json`
- `npm run process:current-sprint-active-card-gate-check -- --json`
- `npm run process:foundation-plan-reconcile-check -- --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001 --planApprovalRef=docs/process/approvals/FOUNDATION-CONTROL-PLANE-TRUTH-CLEANUP-001.json --closeoutKey=foundation-control-plane-truth-cleanup-v1 --commitRef=HEAD`

## Not Next

Do not start `STRATEGY-003`, Strategy Hub, Brain Fleet implementation, extractor proof, extraction scale, People work, live extraction, provider/model calls, credential mutation, Drive permission mutation, external writes, emails, or public posts from this card.
