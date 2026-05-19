# Verifier Process Trust Split Module Closeout

Date: 2026-05-16
Card: `VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001`
Closeout key: `verifier-process-trust-split-module-v1`

## What Changed

Moved process-trust verifier proof out of `scripts/foundation-verify.mjs` into `lib/foundation-process-trust-verifier.js`.

The root verifier now delegates the existing PASS/FAIL rows for:

- backlog hygiene and process-gate card capture
- `DEV-PROCESS-AUDIT-001` hook mapping
- `PROCESS-HOOKS-001` ship-check proof
- `PROCESS-FANOUT-001` false-done and claimed-artifact proof
- `WORKER-CODE-TRUST-001` served-code trust
- `VERIFIER-DONE-COVERAGE-001` done-card proof enforcement
- `VERIFIER-ARTIFACT-EXISTS-001` claimed-artifact enforcement
- `POST-SHIP-FAN-OUT-001` post-ship fanout gate

## What It Does

The module exports:

- `evaluateFoundationProcessTrustVerifier()`
- `buildFoundationProcessTrustVerifierDogfoodProof()`
- the card, sprint, closeout, plan, approval, and focused-proof constants for the split

The root verifier line count dropped from the recorded `12,918` baseline to about `12,734` lines while preserving behavior.

## Why It Matters

Process-trust checks decide whether build proof is real: ship checks, fanout, worker served-code evidence, done-card coverage, claimed artifact proof, and post-ship routing. Keeping those checks buried in the root verifier made the verifier harder to audit and easier to weaken accidentally.

This split keeps the behavior unchanged while giving the trust boundary a named module and focused dogfood proof.

## Where It Lives

- `lib/foundation-process-trust-verifier.js`
- `scripts/process-verifier-process-trust-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json` script `process:verifier-process-trust-split-module-check`
- `docs/process/verifier-process-trust-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Proof

Passed before closeout:

```bash
node --check lib/foundation-process-trust-verifier.js
node --check scripts/process-verifier-process-trust-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-process-trust-split-module-check -- --json
npm run foundation:verify -- --json-summary
```

Results:

- focused proof: 12/12
- Plan Critic: 10/10
- `foundation:verify`: 379/379
- root verifier line count: `12,918` -> about `12,734`

Dogfood proof rejects:

- missing ship-check evidence
- missing fanout evidence
- stale worker served-code trust
- missing done-card proof coverage
- missing claimed-artifact gate
- missing post-ship fanout detector

Final ship proof:

```bash
npm run process:foundation-ship -- --card=VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-PROCESS-TRUST-SPLIT-MODULE-001.json --closeoutKey=verifier-process-trust-split-module-v1 --commitRef=HEAD
```

## Known Limits

- This does not split all of `scripts/foundation-verify.mjs`.
- This does not change process policy, ship gate semantics, post-ship fanout behavior, worker served-code proof requirements, route behavior, auth, source, DB schema, backlog, connector, or source contract behavior.
- This does not run extraction or use paid-source auth.
- This does not build hub features, Marketing Video Lab live wiring, Canva asset library work, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Review Next

Continue the standard-mode no-auth Foundation cleanup queue with the next coherent verifier proof-domain split. If verifier slices become too broad, switch to a bounded source-of-truth latency or split-verifier reliability slice before returning to verifier monolith work.
