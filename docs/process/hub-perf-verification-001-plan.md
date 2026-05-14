# HUB-PERF-VERIFICATION-001 Plan

## What

Remeasure Foundation Hub performance after the performance hardening sprint and record the new baseline as repo truth.

V1 measures the default summary route and the full diagnostics route separately so Steve can see whether the old 70.244s / 4.63 MB problem is actually fixed.

## Why

Steve asked whether the system is getting tight or just shipping claims. A performance fix is not done because code changed; it is done when the route is measured and the number is written down.

The operator value is simple: Steve and the team should know whether `/api/foundation-hub` is fast enough to use while hub builders work in parallel. That unlocks quality and speed because hub work can distinguish source/runtime slowness from hub bugs.

## Acceptance Criteria

- Default `/api/foundation-hub` route is measured with response time and downloaded bytes.
- Full `/api/foundation-hub?view=full` route is measured separately with response time and downloaded bytes.
- Default route budget is under 5s and under 1 MB.
- Full diagnostics route must complete under a 90s diagnostic ceiling, and any result over 30s or 5 MB must remain visible as a follow-up instead of being called solved.
- A committed report records the prior baseline and the new measured baseline.
- Proof fails if measurement is missing, non-numeric, or over budget.

## Definition Of Done

- Existing Foundation Hub route behavior is reused; this card does not rewrite the route.
- Measurement helper lives outside `server.js`.
- Report lands in `docs/handoffs/2026-05-14-foundation-hub-performance-baseline.md`.
- Focused proof can run with live API when available and with committed baseline validation when `--no-api` is used.
- Current Sprint has doctrine and a durable Plan Critic pass row before implementation.
- Full Foundation ship gate passes before push.

## Details

Existing code to reuse: `/api/foundation-hub`, `lib/foundation-hub-performance.js`, package process scripts, approval integrity, Current Sprint, and full ship gates.

Existing docs to reuse: the 2026-05-13 deep audit finding, `FOUNDATION-PERFORMANCE-001` closeout, current plan/current state, and the prior performance hardening closeout.

Existing scripts to reuse: `process:foundation-performance-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

Gate decision tree: static proof alone is too weak; focused proof measures the real route when the server is available; full proof is required because this sprint writes closeout/report truth and verifier coverage. Blast radius is Foundation runtime visibility and process evidence.

Split plan: no new route behavior goes into `server.js`. If a large file is touched, it is only thin verifier or closeout registration. New performance measurement behavior lives in a small module and proof script.

## Risks

- Risk: local server is down during proof.
  - Repair path: `--no-api` validates the committed baseline and full ship gate still checks runtime separately.
- Risk: the full diagnostics route stays large and gets confused with default route health.
  - Repair path: record separate budgets and separate baselines.
- Risk: the route regresses later.
  - Repair path: keep the committed baseline and focused proof so future sprints can compare.

## Tests

```bash
npm run process:foundation-verification-cleanup-check -- --json
npm run process:foundation-performance-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=RECURRING-DEEP-AUDIT-001 --planApprovalRef=docs/process/approvals/RECURRING-DEEP-AUDIT-001.json --closeoutKey=foundation-verification-cleanup-v1 --commitRef=HEAD
```

Dogfood proof recreates the old failure category by comparing against the 70.244s / 4.63 MB baseline and proving the default route budget now blocks a slow or bloated result.

## Not Next

- Do not build hub UI features.
- Do not add new endpoint behavior.
- Do not optimize the full diagnostics payload in this card unless measurement proves it is blocking the sprint.
- Do not touch MEETING-VAULT-ACL-001 Phase B or Drive permissions.
