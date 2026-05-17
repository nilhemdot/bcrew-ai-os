# VERIFIER-READINESS-FOLLOWUP-SPLIT-001 Plan

## Card

`VERIFIER-READINESS-FOLLOWUP-SPLIT-001`

## Scope

Extract the READY review, follow-up capture, Systems grouping, Sales GLS closeout coverage, and shipped-system registration checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-readiness-followup.js`.

## Why

`scripts/foundation-verify.mjs` is still above the 10K red-zone threshold. This slice is a real verifier domain: it proves Foundation READY status and the follow-up/shipped-system closeouts that keep Foundation from silently losing operational ownership.

## Non-Scope

- No active sprint overlay replacement.
- No behavior or Plan Critic scoring changes.
- No Sales GLS feature work, system registration feature work, connector work, Strategy work, Harlan, Fal, Canva, voice, or hub expansion.
- No substring-only proof.

## Implementation

1. Add a focused readiness/follow-up verifier module and dogfood proof.
2. Make the root verifier call `evaluateFoundationVerifierReadinessFollowup` and keep the root as orchestration.
3. Add a read-only focused proof script and package command.
4. Register closeout, handoff, approval, and live backlog card truth.

## Dogfood Proof

Dogfood proof recreates the failure class:

- hidden READY review failure,
- follow-up closeout owning feature scope,
- follow-up cards drifting out of scoped/done state,
- combined Sales/Recruiting service bucket,
- missing shipped-system registration,
- private agent feedback link leakage.

Each unhealthy fixture must fail closed while the healthy fixture passes.

## Acceptance

- `scripts/foundation-verify.mjs` delegates this verifier domain to `lib/foundation-verifier-readiness-followup.js`.
- The old inline `foundationFollowupCardsHaveAllowedState` marker is gone from the root verifier.
- Focused proof proves module delegation, dogfood, line-count reduction, read-only posture, package script, plan, approval, handoff, and closeout.
- Full Foundation ship gate passes before push.
