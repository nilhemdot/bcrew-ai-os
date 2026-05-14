# FOUNDATION-VERIFY-TIMING-001 Plan

## Goal

Make `foundation:verify` timing visible so slow sections are obvious before Steve waits through a full gate.

## Existing Work Check

- `scripts/process-foundation-ship.mjs` already prints coarse gate timing.
- `scripts/foundation-verify.mjs` currently prints pass/fail checks but not where verifier time is spent.
- This card adds profiling visibility without changing verifier pass/fail semantics.

## Implementation

1. Add lightweight timing capture around key API fetches and health-script sections in `scripts/foundation-verify.mjs`.
2. Add a profile mode or companion script that prints top slow sections and total runtime.
3. Keep normal verifier output compatible with existing gates.
4. Record enough detail for closeouts to identify the slowest verifier areas.

## Dogfood Proof

Run the profile command and prove it reports total runtime plus named slow sections, including the full Foundation Hub fetch or health scripts when they are slow.

## Definition Of Done

- A focused profile command exists.
- The verifier can expose timing without changing success/failure behavior.
- Top slow sections are visible in machine-readable or operator-readable output.
- Full Foundation ship gate still passes.

## Not Next

- Do not rewrite the whole verifier.
- Do not skip verifier checks for speed.
- Do not make green less strict.

## What

Build the narrow V1 card `FOUNDATION-VERIFY-TIMING-001`: a fast profile mode and proof command for verifier timing. This is timing visibility, not a verifier rewrite.

## Why

Steve needs the operator value of knowing where the wait is. Future sprints need objective data before they claim "verification is slow" or "we fixed speed." This improves quality and speed by making the slow sections visible.

## Acceptance Criteria

- `FOUNDATION-VERIFY-TIMING-001` adds a profile output path for `foundation:verify`.
- The timing output records total runtime and named slow sections.
- The profile command does not skip verifier checks.
- The profile proof rejects an output with no section timings.
- The command remains bounded and usable by default; it must not add another heavy verifier pass to normal shipping.

## Definition Of Done

- Focused proof command passes: `npm run process:foundation-verify-profile-check -- --json`.
- Normal `npm run foundation:verify` still passes or fails on the same health checks.
- Full ship gate remains required for this sprint closeout.

## Details

Reuse existing code: `scripts/foundation-verify.mjs`, `scripts/process-foundation-ship.mjs` timing summary, and existing health script calls. Reuse existing scripts instead of building a second verifier. Gate decision: focused proof for profile output, full gate for final sprint ship because verifier code is full-risk Foundation substrate.

Also reuse existing docs in `docs/rebuild/current-state.md`, live backlog truth for `FOUNDATION-VERIFY-TIMING-001`, and Current Sprint truth for this sprint. This is proportional timing visibility, not another heavy gate; the focused profile proof should complete under 3 minutes on a normal local run.

## Risks

- Risk: timing code changes verifier behavior. Repair path is to disable profile output and keep pass/fail semantics unchanged.
- Risk: profile output is too noisy. Keep only top slow sections and total runtime.
- Risk: profile output hides failures. It must fail closed if verifier fails.

## Tests

- Static: `node --check scripts/foundation-verify.mjs scripts/process-foundation-verify-profile-check.mjs`.
- Focused: `npm run process:foundation-verify-profile-check -- --json`.
- Full: `npm run foundation:verify` and final `process:foundation-ship`.
