# Verifier Process-Hardening Split Module Closeout

Date: 2026-05-16
Card: `VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001`
Closeout key: `verifier-process-hardening-split-module-v1`

## What Changed

Moved the process-hardening verifier proof domain out of `scripts/foundation-verify.mjs` into `lib/foundation-process-hardening-verifier.js`.

The root verifier now delegates the existing PASS/FAIL rows for:

- read-only verifier fail-closed behavior
- process-check apply/write posture
- scheduled mutation guardrails
- Foundation DB init/seed separation
- Current Sprint mutation guards
- DB seed governance
- KPI cache posture
- Current Sprint store split proof
- backlog lost-update protection

## What It Does

The module exports:

- `evaluateFoundationProcessHardeningVerifierChecks()`
- `buildFoundationProcessHardeningVerifierDogfoodProof()`
- the card, sprint, closeout, plan, approval, and focused-proof constants for the split.

The root verifier line count dropped from the recorded `13,743` baseline to about `13,490` lines while preserving behavior.

## Why It Matters

Process hardening is the proof that Foundation gates are honest. Steve should not have to trust green checks if verifiers can repair state, scheduled checks can mutate unattended, seed code can overwrite live truth, or backlog writes can silently lose updates. This split keeps that proof domain inspectable while the verifier monolith keeps shrinking.

## Where It Lives

- `lib/foundation-process-hardening-verifier.js`
- `scripts/process-verifier-process-hardening-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json` script `process:verifier-process-hardening-split-module-check`
- `docs/process/verifier-process-hardening-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Proof

Passed before closeout:

```bash
node --check lib/foundation-process-hardening-verifier.js
node --check scripts/process-verifier-process-hardening-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-process-hardening-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

Results:

- focused proof: 12/12
- Plan Critic: 10/10
- backlog hygiene: 0 findings across 515 cards
- `foundation:verify`: 370/370
- root verifier line count: `13,743` -> about `13,490`

Dogfood proof rejects:

- repair-then-pass verifier behavior
- scheduled mutating process checks
- seed/bootstrap writeback by default
- silent backlog lost updates

Final ship proof:

```bash
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-HARDENING-SPLIT-MODULE-001.json --closeoutKey=verifier-process-hardening-split-module-v1 --commitRef=HEAD
```

## Known Limits

- This does not split all of `scripts/foundation-verify.mjs`.
- This does not change process guard behavior.
- This does not change route, auth, source, DB schema, backlog, Current Sprint, or connector behavior.
- This does not run extraction or use paid-source auth.
- This does not build hub features, Marketing Video Lab live wiring, Canva asset library work, Build Intel extraction, or Drive permission mutation.

## Review Next

Continue the standard-mode no-auth Foundation cleanup queue with the next coherent verifier proof-domain split only if it stays tight. If the next verifier slice is too broad, switch back to bounded Foundation DB store splits.
