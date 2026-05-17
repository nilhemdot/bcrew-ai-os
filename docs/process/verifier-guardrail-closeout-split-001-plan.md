# VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001 Plan

## Card

`VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001`

## Scope

Extract the Foundation guardrail closeout verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-guardrail-closeouts.js`.

This slice owns Sheets quota hardening, doctrine propagation, proposed-only decision auto-emit, known stale-card cleanup, SOURCE-021 exact writer-proof pause, and SECURITY-002 auth/tier/redaction proof.

## Why

`scripts/foundation-verify.mjs` is still above the 10K red-zone threshold. This is a real guardrail domain: it protects quota safety, private-memory boundaries, proposed-only decision capture, exact writer-proof semantics, and centralized security redaction.

## Non-Scope

- No active sprint overlay replacement.
- No behavior or Plan Critic scoring changes.
- No source extraction, connector, Strategy, Sales, Harlan, Fal, Canva, voice, or hub feature work.
- No substring-only proof.

## Implementation

1. Add a focused guardrail closeout verifier module and dogfood proof.
2. Make the root verifier call `evaluateFoundationVerifierGuardrailCloseouts` and keep the root as orchestration.
3. Add a read-only focused proof script and package command.
4. Register closeout, handoff, approval, and live backlog card truth.

## Dogfood Proof

Dogfood proof recreates the failure class:

- failed Sheets reads cached as healthy,
- private memory copied into doctrine output,
- decision auto-emit mutating live truth instead of proposing,
- SOURCE-021 unpaused without exact writer proof,
- missing centralized security redaction.

Each unhealthy fixture must fail closed while the healthy fixture passes.

## Acceptance

- `scripts/foundation-verify.mjs` delegates this guardrail closeout domain to `lib/foundation-verifier-guardrail-closeouts.js`.
- The old inline `doctrinePropagationStatus` block is gone from the root verifier.
- Focused proof proves module delegation, dogfood, line-count reduction, read-only posture, package script, plan, approval, handoff, and closeout.
- Full Foundation ship gate passes before push.
