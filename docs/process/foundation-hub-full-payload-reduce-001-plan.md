# FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001 Plan

## Goal

Reduce `/api/foundation-hub?view=full` payload size from the current ~4.77MB baseline while preserving the default fast Foundation Hub route.

## Existing Work Check

- `FOUNDATION-PERFORMANCE-001` made default `/api/foundation-hub` fast.
- `FOUNDATION-FULL-DIAGNOSTICS-PERF-001` bounded full diagnostics under 15s / 5.5MB.
- The full route is still large. This card reduces payload shape rather than hiding latency behind a larger budget.

## Implementation

1. Measure current full-route key sizes.
2. Move or summarize at least one heavy full-diagnostics section.
3. Preserve existing fields required by verifier and operator surfaces.
4. Update focused proof to enforce a tighter full payload budget.

## Dogfood Proof

Measure before and after byte size for `/api/foundation-hub?view=full` and prove the final payload stays under the new budget while default `/api/foundation-hub` remains fast.

## Definition Of Done

- Full payload budget is lower than the current 5.5MB budget.
- Focused proof records measured seconds and bytes.
- Default Foundation Hub remains fast.
- Full verifier and ship gate pass.

## Not Next

- Do not remove operator-visible truth.
- Do not break existing Foundation UI panels.
- Do not do broad frontend redesign.

## What

Build the narrow V1 card `FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001`: reduce full Foundation Hub payload size with measured before/after proof while preserving the default fast route.

## Why

The last sprint bounded full diagnostics to about 7.7 seconds and 4.77MB, but 4.77MB is still heavy. Steve needs speed and quality: a smaller payload reduces verifier drag, browser load, and operator wait time.

## Acceptance Criteria

- `FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001` records a before/after measurement for `/api/foundation-hub?view=full`.
- The full-route payload budget is lowered below 5.5MB.
- Default `/api/foundation-hub` remains fast.
- Existing required UI/verifier fields remain available.
- Reject substring proof: any substring-only proof fails unless real API measurements for seconds and bytes also pass.

## Definition Of Done

- Focused proof command records seconds and bytes for summary and full routes.
- Full route is under the new budget.
- Default route remains under its existing summary budget.
- Full ship gate passes.

## Details

Reuse existing code: `lib/foundation-hub-performance.js`, `lib/foundation-hub-full-diagnostics.js`, `scripts/process-foundation-full-diagnostics-perf-check.mjs`, server Foundation Hub route code, and current verifier budget checks. Gate decision: focused route proof plus full ship gate because server/API payload behavior affects Foundation runtime.

Also reuse existing docs in `docs/rebuild/current-state.md`, existing scripts in the full-diagnostics proof path, live backlog truth for `FOUNDATION-HUB-FULL-PAYLOAD-REDUCE-001`, and Current Sprint truth for this sprint.

## Risks

- Risk: payload reduction removes operator truth. Repair path is to keep fields and move detail to detail endpoints or summaries.
- Risk: verifier starts passing because fields disappeared. Dogfood proof must check required fields still exist.
- Risk: broad frontend redesign. Keep this to API payload shaping only.

## Tests

- Static: `node --check server.js lib/foundation-hub-full-diagnostics.js scripts/process-foundation-full-diagnostics-perf-check.mjs`.
- Focused: `npm run process:foundation-full-diagnostics-perf-check -- --json --baseUrl=http://localhost:3000`.
- Full: `npm run foundation:verify` and final `process:foundation-ship`.
