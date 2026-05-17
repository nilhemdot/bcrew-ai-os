# VERIFIER-CONTROL-LOOP-SPLIT-001 Plan

## Card

`VERIFIER-CONTROL-LOOP-SPLIT-001`

## Scope

Extract the Foundation control-loop verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-control-loop.js`.

This slice owns the Foundation readiness exit-test closeout, SYSTEM-010 runtime/process-control closeout, known-cleaned backlog hygiene cards, Action Review apply/review proof, Build Intel intake guardrails, and Foundation control-compression primitives.

## Why

`scripts/foundation-verify.mjs` remains above the 10K red-zone threshold and far above the 5K clean target. This is a real verifier domain: it proves the Foundation operating loop can say whether Foundation is ready, close runtime blockers honestly, keep backlog hygiene from re-flagging cleaned cards, route action-review work through a visible proposal/apply loop, keep Build Intel intake proposal-only, and preserve control-compression as read-only/proposal-only instrumentation.

## Non-Scope

- No active sprint overlay replacement.
- No behavior, readiness, route, or Plan Critic scoring changes.
- No source extraction, connector auth, paid-source work, Strategy, Sales, Harlan, Fal, Canva, voice, or hub feature work.
- No arbitrary tail extraction or substring-only proof.

## Implementation

1. Add a focused control-loop verifier module and dogfood proof.
2. Make the root verifier call `evaluateFoundationVerifierControlLoop` and keep the root as orchestration.
3. Add a read-only focused proof script and package command.
4. Register closeout, handoff, approval, and live backlog card truth.

## Dogfood Proof

Dogfood proof recreates the failure class:

- readiness exit test claims ready while blockers remain,
- SYSTEM-010 runtime leg is missing from readiness proof,
- Action Review mutates without destination proof,
- Build Intel intake auto-mutates backlog or allows screenshot storage without policy,
- control compression writes backlog/sprint state or suppresses critical verifier failures.

Each unhealthy fixture must fail closed while the healthy fixture passes.

## Acceptance

- `scripts/foundation-verify.mjs` delegates this control-loop domain to `lib/foundation-verifier-control-loop.js`.
- The old inline `foundationDoneFailedKeys` control-loop block is gone from the root verifier.
- Focused proof proves module delegation, dogfood, line-count reduction, read-only posture, package script, plan, approval, handoff, and closeout.
- Full Foundation ship gate passes before push.
