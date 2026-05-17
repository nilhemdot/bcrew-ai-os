# VERIFIER-PROCESS-GOVERNANCE-SPLIT-001 Plan

## Scope

Extract the process-governance verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-process-governance.js`.

This slice owns the completed-sprint and current-sprint governance checks for:

- `SPRINT-PROCESS-REPAIR-001`
- `VERIFIER-SPRINT-INDEPENDENCE-001`
- `VERIFIER-MODULAR-SPLIT-001`
- `PROCESS-ROOT-VS-PATCH-001`
- `CURRENT-SPRINT-DYNAMIC-TRUTH-001`
- `SPRINT-STAGE-GATE-001`
- `FOUNDATION-PLAN-RECONCILE-001`
- `CONNECTOR-CREDENTIAL-001`
- `LLM-AUTH-AUDIT-001`
- `SOURCE-EXTRACTION-GAP-FOLLOWUP-001`
- `ATOM-FLOW-AUTO-DEMOTION-001`
- `EXTRACT-RUN-HARDENING-EXECUTION-001`
- `RESEARCH-LANE-PURGE-001`

## Boundary

The root verifier remains orchestration only for this domain: it prepares live inputs, calls `evaluateFoundationVerifierProcessGovernance(...)`, and pushes returned checks.

No active sprint overlay is reopened or replaced.

## Acceptance

- The new module owns the process-governance evaluator and dogfood proof.
- The root verifier delegates through `evaluateFoundationVerifierProcessGovernance(...)`.
- The old inline `SPRINT-PROCESS-REPAIR-001` process-governance block is removed from the root verifier.
- Dogfood proof recreates the failure class and rejects missing closeout proof, skipped-stage shortcuts, missing stage-gate enforcement, symptom-patch acceptance, source-gap extraction mutation, and research-lane mutation.
- Substring-only proof is rejected.
- The focused proof script is read-only.
- `scripts/foundation-verify.mjs` line count decreases from the pre-split baseline and remains queued for further splits toward under 5K.

## Non-Scope

- No connector auth work.
- No source extraction job execution.
- No paid/provider calls.
- No hub, Canva, Fal, ElevenLabs, voice, Harlan terminal, or product feature work.
- No active sprint overlay edits.
