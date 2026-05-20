# FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001 Plan

## What

Close the active P1 audit finding for the Foundation client Current State renderer.

Closeout key: `foundation-client-current-state-extract-v1`.

This is a tight V1 repair. The current code already has the renderer extracted into `public/foundation-current-state-renderers.js`; the remaining issue is that the nightly audit detector still raises the stale `foundation-client-current-state-monolith` finding against `public/foundation.js`.

Not next:

- Do not redesign Foundation Overview.
- Do not rewrite the Current State renderer.
- Do not start another frontend split unless proof shows the renderer is still root-owned.
- Do not change Foundation API contracts, source data, Drive permissions, credentials, providers, or private extraction.
- Do not start Value Builder or lower-priority feature work before this P1 finding is closed.

## Why

Steve asked for audit findings to become real fixes, not report noise. The audit currently says `public/foundation.js` owns `renderCurrentState`, but repo truth says that function lives in the dedicated Current State module. A stale audit finding is still harmful: it keeps the sprint pointed at already-fixed debt and makes Steve babysit the system.

## Definition Of Done

- The focused proof shows `public/foundation.js` does not define `renderCurrentState` or the Current State renderer helpers.
- The focused proof shows `public/foundation-current-state-renderers.js` owns the renderer functions, remains under the module line budget, and loads in the required script order.
- The nightly code-quality audit no longer proposes `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001` when the extraction invariant is true.
- The old failure mode is dogfooded: root-owned `renderCurrentState`, missing module, or wrong script order fails closed.
- `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001` closes and Current Sprint advances to `BUILD-LOG-API-CACHE-AND-SLIM-001`.

## Acceptance Criteria

- `npm run process:foundation-client-current-state-extract-check -- --close-card --json` reports healthy.
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch` reports healthy and does not propose `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001`.
- Line counts are bounded:
  - `public/foundation.js <= 3000`
  - `public/foundation-current-state-renderers.js <= 1500`
- System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, fanout, and ship gate pass.

## Details

Root invariant: the Current State renderer finding is fixed only when root ownership is gone and the audit detector stops raising stale work from historical assumptions. The check should prove this through the actual browser files, the actual nightly audit function path, and Current Sprint/backlog behavior. Reject substring-only proof: a comment saying the split exists is not enough.

The V1 code path:

- Add `lib/foundation-client-current-state-extract.js` with the reusable extraction evaluator and dogfood fixtures.
- Update `lib/code-quality-nightly-audit.js` so the monolith detector suppresses `foundation-client-current-state-monolith` only when the evaluator proves extraction is healthy.
- Add `scripts/process-foundation-client-current-state-extract-check.mjs` as the card proof and closeout writer.
- Keep the route behavior unchanged; this card changes audit intelligence and sprint truth, not the browser UI.

## Reuse Existing Work

Existing code:

- `public/foundation-current-state-renderers.js`
- `public/foundation.js`
- `public/foundation.html`
- `lib/foundation-frontend-current-state-renderers-split.js`
- `lib/code-quality-nightly-audit.js`
- `lib/current-sprint-active-card-gate.js`
- `lib/process-write-guard.js`

Existing docs:

- `docs/process/frontend-current-state-renderers-split-001-plan.md`
- `docs/process/deep-audit-findings-closure-gate-001-plan.md`
- `docs/audits/2026-05-19-foundation-deep-merge-audit.md`

Existing scripts:

- `process:frontend-current-state-renderers-split-check`
- `process:code-quality-nightly-audit-check`
- `process:system-health-nightly-audit-check`
- `process:build-lane-repeated-failure-action-gate-check`

Existing policy:

- Audit findings become live backlog truth or shipped proof.
- Green means raw green; classification is not repair.
- Current Sprint is the executable command surface.
- Blockers block unsafe actions, not the whole sprint.

## Operator Value

Steve gets a useful operator behavior: the active sprint moves past a stale P1 only after the system proves the extracted renderer state and prevents the nightly audit from re-opening the same stale card. This unlocks faster overnight work with better quality because the next builder sees the real blocker, not a false monolith finding.

## Speed Bound

The focused gate must stay fast and proportional, under 2 minutes locally. It reads browser files, one package file, live backlog/Current Sprint rows, and runs the code-quality audit with endpoint fetches skipped. It does not run browser auth, provider calls, external fetches, or a full deep audit.

## Risks

- Risk: the card hides a real renderer monolith.
  - Mitigation: suppress the audit finding only when the evaluator proves root functions moved, module functions exist, script order is valid, and line budgets hold.
- Risk: the card becomes a frontend rewrite.
  - Mitigation: no UI behavior changes; if the evaluator fails, reopen/scope the smallest real renderer split instead of editing broadly.
- Risk: scoped audit work is treated as fixed without proof.
  - Mitigation: closeout requires code-quality audit no longer proposing this card and Current Sprint advancing only after focused proof.
- Risk: proof fails later.
  - Repair path: reopen `FOUNDATION-CLIENT-CURRENT-STATE-EXTRACT-001` or create the next renderer split with the exact failed invariant.

## Tests

- Static: `node --check lib/foundation-client-current-state-extract.js scripts/process-foundation-client-current-state-extract-check.mjs`.
- Focused: `npm run process:foundation-client-current-state-extract-check -- --close-card --json`.
- Audit dogfood: `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`.
- Full: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, `process:ship-check`, `process:fanout-check`, and `process:foundation-ship`.

## Gate Decision Tree

Blast radius is full because this card changes audit routing behavior and Current Sprint truth, even though the browser UI does not change.

Use static syntax first, then focused behavior proof, then full Foundation gates:

- static: module/script syntax
- focused: extracted renderer evaluator, stale-audit detector suppression, dogfood failures, and live sprint closeout
- full: `foundation:verify` and `process:foundation-ship`

## Gate Decision

Full Foundation gate. This card closes a P1 deep-audit finding and changes the nightly audit detector.
