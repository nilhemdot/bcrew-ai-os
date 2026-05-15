# PROCESS-CHECK-READONLY-MODE-001 Plan

## What

Sweep legacy `process-*-check.mjs` scripts and enforce the next boundary after `PROCESS-CHECK-APPLY-BOUNDARY-001`: process checks are read-only by default, live truth mutations require explicit posture, and legacy closeout-only mutators are classified instead of silently trusted.

V1 adds a deterministic scanner for process-check mutation posture, extends the existing process write guard so backlog create/update calls are blocked from process-check scripts without `--apply`, `--close-card`, or `--mutate-sprint`, and adds focused proof plus verifier coverage. It does not rewrite every historical closeout script.

## Why

The nightly audit still flags process/check paths with write side effects. Some are already guarded, some are historical closeout scripts, and some are report writers. Without a sweep, Steve cannot tell whether a command named `check` is safe to run during nightly audits or parallel hub work.

The operator value is simple: current and future check scripts become safe by default, historical mutating scripts are visible as legacy/historical instead of active operational tools, and any new unguarded process-check mutator fails the focused proof.

## Acceptance Criteria

- A reusable process-check read-only scanner classifies process-check scripts as `read_only`, `guarded_live_mutation`, `report_only`, or `historical_closeout_only`.
- `createBacklogItem()` and `updateBacklogItem()` reject calls from `process-*-check.mjs` scripts unless the invocation has explicit write posture.
- Raw sprint/Plan Critic SQL mutations in legacy process-check scripts are either guard-routed or explicitly classified as historical closeout-only.
- The focused proof calls the actual function path in `buildProcessCheckReadonlyModeProof()`, rejects a synthetic unguarded live mutator, and accepts a guarded mutator.
- The focused proof uses black-box behavior fixtures, not marker checks.
- The focused proof proves the real repo has zero unclassified unguarded live process-check mutators.
- Substring-only proof is rejected; string matching cannot be the only evidence.
- The proof script is read-only and does not mutate backlog, sprint, source, job, report, or external state.

## Definition Of Done

- Live backlog card is in `done` and Current Sprint shows it in `Done This Sprint`.
- Durable Plan Critic pass row exists at 9.8+ before build.
- Focused proof passes through `npm run process:process-check-readonly-mode-check -- --json`.
- `foundation:verify` includes this boundary and passes.
- Full `process:foundation-ship` passes before push.
- Closeout and Recent Builds identify `process-check-readonly-mode-v1`.

## Details

Existing code to reuse: `lib/process-write-guard.js`, `lib/foundation-backlog-store.js`, `lib/foundation-current-sprint-store.js`, `lib/code-quality-nightly-audit.js`, scheduled mutation posture in `lib/foundation-jobs.js`, and existing process-check proof scripts.

Implementation shape:

- Add `lib/process-check-readonly-mode.js` with the scanner, explicit legacy classification map, synthetic dogfood fixtures, and proof summary.
- Extend `lib/process-write-guard.js` with current-process helpers so shared mutation APIs can fail closed for process-check scripts without flags.
- Add guard calls to `createBacklogItem()` and `updateBacklogItem()`.
- Add `scripts/process-check-readonly-mode-check.mjs` as the read-only focused proof.
- Add verifier coverage that calls the actual scanner and dogfood proof.

Verifier/check posture: the focused proof is read-only by default. It may read script sources and build synthetic fixtures, but it must not call live mutators, write files, update sprint/backlog state, or run external source writes.

Gate decision tree: focused proof is required because static scanning alone could be theater. Full Foundation ship is required because this touches shared mutation posture and verifier/process surfaces. The focused proof stays fast and proportional: target under 2 minutes, no full repo dependency install, no external API calls, and no live mutation.

## Risks

- Risk: over-strict guard blocks legitimate human-approved closeout scripts.
  - Repair path: use explicit `--apply`, `--close-card`, or `--mutate-sprint`; do not restore silent defaults.
- Risk: scanner becomes a reminder instead of a gate.
  - Repair path: verifier calls the scanner and fails if a new unclassified live mutator appears.
- Risk: historical closeout scripts are mistaken for active tools.
  - Repair path: classify them as historical closeout-only and keep them unscheduled.

## Tests

```bash
node --check lib/process-write-guard.js lib/foundation-backlog-store.js lib/process-check-readonly-mode.js scripts/process-check-readonly-mode-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-overnight-records.js
npm run process:process-check-readonly-mode-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=PROCESS-CHECK-READONLY-MODE-001 --planApprovalRef=docs/process/approvals/PROCESS-CHECK-READONLY-MODE-001.json --closeoutKey=process-check-readonly-mode-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure mode with a synthetic `process-danger-check.mjs` that writes live sprint/backlog truth with no explicit posture. The actual function path must fail that fixture, pass a guarded fixture, and prove the live repo has no unclassified unguarded live process-check mutators. No substring-only proof or source-substring marker proof is accepted.

## Not Next

- Do not rewrite every historical process script.
- Do not run old closeout scripts.
- Do not mutate source systems or external providers.
- Do not build hub features, Marketing Video Lab routes, Build Intel extraction, paid-source auth, or Meeting Vault Phase B.
- Do not weaken the existing scheduled mutation guard.
