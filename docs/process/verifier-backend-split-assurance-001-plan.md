# VERIFIER-BACKEND-SPLIT-ASSURANCE-001 Plan

## Card

`VERIFIER-BACKEND-SPLIT-ASSURANCE-001`

## Scope

Extract backend structural split assurance checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-backend-split-assurance.js`.

This slice owns the verifier checks that prove server-route split modules and Foundation-DB split modules still run, dogfood their old failure classes, carry closeout proof, and keep the old inline split predicates out of the root verifier.

## Why

`scripts/foundation-verify.mjs` remains above the 10K red-zone threshold and far above the 5K clean target. This is a real verifier domain: it protects backend structural decompositions already completed for server routes and Foundation DB stores. Keeping those assurance blocks inline makes the root verifier keep owning split-module internals instead of orchestration.

## Non-Scope

- No active sprint overlay replacement.
- No behavior, route, DB schema, store, source, or Plan Critic scoring changes.
- No source extraction, connector auth, paid-source work, Strategy, Sales, Harlan, Fal, Canva, voice, or hub feature work.
- No arbitrary tail extraction or substring-only proof.

## Implementation

1. Add a focused backend split-assurance verifier module and dogfood proof.
2. Make the root verifier call `evaluateFoundationVerifierBackendSplitAssurance` and keep the root as orchestration.
3. Add a read-only focused proof script and package command.
4. Register closeout, handoff, approval, and live backlog card truth.

## Dogfood Proof

Dogfood proof recreates the failure class:

- server-route split checks return partial failures but root still claims green,
- Foundation-DB split checks return partial failures but root still claims green,
- split-module dogfood proof is missing,
- old inline backend split predicates are still present,
- split closeout proof is missing.

Each unhealthy fixture must fail closed while the healthy fixture passes.

## Acceptance

- `scripts/foundation-verify.mjs` delegates backend structural split assurance to `lib/foundation-verifier-backend-split-assurance.js`.
- The old inline `serverRouteSplitVerifierInput` backend split block is gone from the root verifier.
- Focused proof proves module delegation, dogfood, line-count reduction, read-only posture, package script, plan, approval, handoff, and closeout.
- Full Foundation ship gate passes before push.
