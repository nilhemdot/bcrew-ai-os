# VERIFIER-MODULE-ASSURANCE-SPLIT-001 Plan

## Card

`VERIFIER-MODULE-ASSURANCE-SPLIT-001`

## Scope

Extract the verifier-module assurance checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-module-assurance.js`.

This slice owns the root verifier checks that prove focused verifier modules still run, dogfood their failure classes, and carry durable closeout proof for intelligence/audit, operator budget, hub safety, route-split, source-contract, source-trust, current-sprint, and intelligence-audit split modules.

## Why

`scripts/foundation-verify.mjs` remains above the 10K red-zone threshold and far above the 5K clean target. This is a real verifier domain: it is the check-of-checks layer for the modules already split out of the root verifier. Keeping those module-assurance checks inline makes the root verifier stay responsible for proving its own extractions instead of becoming orchestration-only.

## Non-Scope

- No active sprint overlay replacement.
- No behavior, route, source, budget, hub, or Plan Critic scoring changes.
- No source extraction, connector auth, paid-source work, Strategy, Sales, Harlan, Fal, Canva, voice, or hub feature work.
- No arbitrary tail extraction or substring-only proof.

## Implementation

1. Add a focused verifier-module assurance module and dogfood proof.
2. Make the root verifier call `evaluateFoundationVerifierModuleAssurance` and keep the root as orchestration.
3. Add a read-only focused proof script and package command.
4. Register closeout, handoff, approval, and live backlog card truth.

## Dogfood Proof

Dogfood proof recreates the failure class:

- a focused verifier returns partial failures but root still claims green,
- operator budget dogfood is missing,
- hub safety dogfood is missing route/matrix proof,
- route/source/current-sprint module closeout proof is missing,
- a split-module plan relies on substring-only proof.

Each unhealthy fixture must fail closed while the healthy fixture passes.

## Acceptance

- `scripts/foundation-verify.mjs` delegates this verifier-module assurance domain to `lib/foundation-verifier-module-assurance.js`.
- The old inline `operatorBudgetVerifier` module-assurance block is gone from the root verifier.
- Focused proof proves module delegation, dogfood, line-count reduction, read-only posture, package script, plan, approval, handoff, and closeout.
- Full Foundation ship gate passes before push.
