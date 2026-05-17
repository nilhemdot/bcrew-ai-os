# Verifier Guardrail Closeout Split Closeout

Date: 2026-05-17
Card: `VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001`
Closeout: `verifier-guardrail-closeout-split-v1`

## What Changed

Extracted the Sheets quota hardening, doctrine propagation, proposed-only decision auto-emit, stale-card cleanup, SOURCE-021 writer-proof pause, and SECURITY-002 auth/tier/redaction verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-guardrail-closeouts.js`.

## Proof

- `node --check lib/foundation-verifier-guardrail-closeouts.js scripts/process-verifier-guardrail-closeout-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js`
- `npm run process:verifier-guardrail-closeout-split-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-guardrail-closeout-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001 --closeoutKey=verifier-guardrail-closeout-split-v1`
- `npm run process:foundation-ship -- --card=VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-GUARDRAIL-CLOSEOUT-SPLIT-001.json --closeoutKey=verifier-guardrail-closeout-split-v1 --commitRef=HEAD`

## Dogfood

The module dogfood rejects cached failed Sheets reads, private memory leakage, live decision mutation, unpaused SOURCE-021 writer proof, and missing centralized security redaction.

## Known Limits

- This does not split the whole verifier.
- This does not move Foundation done-test, SYSTEM-010, Action Review, Build Intel, control compression, or downstream verifier-module checks.
- This does not change verifier behavior, active sprint truth, Plan Critic scoring, Sheets behavior, decision emission, SOURCE-021 status, or security access behavior.

## Next

Continue verifier monolith reduction with the next coherent domain split. Under 10K remains the immediate emergency milestone; under 5K is the clean target, and work continues after that from live backlog truth.
