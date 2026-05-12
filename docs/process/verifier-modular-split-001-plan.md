# VERIFIER-MODULAR-SPLIT-001 Plan

## What
Scope the module boundary for splitting `scripts/foundation-verify.mjs` into smaller per-sprint or per-card proof modules.

## Why
Steve needs proof gates that are strong enough to trust and fast enough to use. The useful operator behavior is focused proofs that run in seconds while full verify aggregates modules without becoming a 30-minute monolith.

## Acceptance Criteria
- The card identifies module boundaries for current sprint, historical closeouts, source lifecycle, security/tier, runtime, backlog/process, and connector/routing proof.
- The plan names a target of under 30 seconds for individual sprint/card proofs and under five minutes for full aggregate.
- The first implementation slice is explicitly not mixed into `VERIFIER-SPRINT-INDEPENDENCE-001`.
- Any verifier split must preserve fail-closed behavior and concrete artifact checks.

## Definition Of Done
- A scoped module-boundary plan is recorded in sprint doctrine.
- Plan Critic has a pass row for the plan.
- No broad refactor starts until the sprint pulls this card after verifier independence.

## Details
This is a tight V1 scoping card: name the module boundary only, with no implementation until pulled. Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth: `scripts/foundation-verify.mjs`, process proof scripts, package script conventions, and the current source/security/runtime verifier sections.

Behavior proof for the future implementation will call actual module function paths and compare focused module runtime with the full aggregate runtime through a real process/API round-trip. Substring-only proof is rejected; module boundaries must be proven by runnable commands, not markers.

Gate decision: static proof is enough for this scoping card, focused proof is required for the first module implementation, and full proof is required before changing canonical `foundation:verify` aggregation. The blast radius stays explicit so the sprint does not hide a broad rewrite inside repair work.

Operator value for Steve and the team: this unlocks speed and quality by making individual proofs fast, proportional, and under 30 seconds where possible while preserving the full gate.

## Risks
Risk is broad rewrite churn. The repair path is to keep this scoped and pull only the smallest first module when `VERIFIER-SPRINT-INDEPENDENCE-001` is closed.

## Tests
- `npm run process:repair-verifier-sprint-check -- --open --json`
- Future implementation proof must include focused module commands and `npm run foundation:verify`.

## Not Next
Do not refactor the verifier during the process-record repair, do not weaken full verify, do not mutate Drive permissions, do not run `MEETING-VAULT-ACL-001` Phase B, and do not make module split a blocker for clearing the dashboard doctrine warning.
