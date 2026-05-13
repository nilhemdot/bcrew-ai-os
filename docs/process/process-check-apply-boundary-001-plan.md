# PROCESS-CHECK-APPLY-BOUNDARY-001 Plan

## What

Make `process-*-check` scripts read-only by default and require explicit apply/write posture before they can mutate backlog, sprint, source, report, or external state.

## Why

The deep audit found scripts named `check` that update backlog or sprint state. Operators and nightly jobs should be able to trust that a check is safe unless a mutating flag is explicit.

## Acceptance Criteria

- A shared process posture guard classifies command invocations as read-only or mutating.
- Mutating behavior in `process-*-check` paths requires an explicit flag such as `--apply`, `--close-card`, `--write-report`, or `--mutate-sprint`.
- A dogfood proof runs a synthetic check path that attempts a write without an apply flag and proves it is blocked.
- The proof uses an actual guard/function path and fails a substring-only implementation.
- `PROCESS-CHECK-APPLY-BOUNDARY-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- A reusable guard exists for process-check write posture.
- At least the high-risk process-check mutation paths from the audit are covered or routed through the guard.
- Focused proof covers blocked write without apply and allowed write with explicit posture where safe.
- Sprint item closes only after dogfood proof and ship gates pass.

## Details

Existing code to reuse: process scripts under `scripts/process-*.mjs`, `lib/foundation-db.js` mutation APIs, `scripts/process-code-quality-nightly-audit-check.mjs`, and current argument parsing patterns. Existing docs to reuse: the deep audit, runtime safety hardening plan, AGENTS.md dogfood rule, and current rebuild plan/state. Existing scripts to reuse: new `process:runtime-safety-hardening-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.

The first pass should create a narrow guard and cover the routes most likely to be reused by scheduled/nightly jobs. It should not attempt to rewrite every process script in one broad pass.

The dogfood proof must exercise black-box behavior through the actual guard/function path and a synthetic process-check write attempt. No substring-only proof is acceptable.

Gate decision: static syntax checks for changed JS, focused `process:runtime-safety-hardening-check` proof for the process posture guard, then full `process:foundation-ship` if the blast radius includes shared process scripts or mutation helpers. Operator value: Steve can run commands named `check` without wondering whether they secretly moved backlog or sprint truth. Speed bound: the focused dogfood proof should target under 2 minutes and avoid crawling the whole repo except for bounded high-risk script scans.

## Risks

- Too broad a migration could break historical closeout scripts. Repair path: guard the common write boundary first and leave explicit mutating scripts with clear flags.
- An over-strict guard could block legitimate ship closeout. Repair path: require explicit mutating posture for those commands, not silent defaults.
- A detector-only change would be theater. Repair path: dogfood proof must execute the guard.

## Tests

- `npm run process:runtime-safety-hardening-check -- --card=PROCESS-CHECK-APPLY-BOUNDARY-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=PROCESS-CHECK-APPLY-BOUNDARY-001 --planApprovalRef=docs/process/approvals/PROCESS-CHECK-APPLY-BOUNDARY-001.json --closeoutKey=foundation-runtime-safety-hardening-v1 --commitRef=HEAD`

## Not Next

- Do not convert all process scripts in one giant pass.
- Do not change product behavior.
- Do not schedule jobs or run external writes.
- Do not use string scanning as the only proof.
