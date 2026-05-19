# Verifier Surface/Trust Split Module Closeout

Date: 2026-05-16
Card: `VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001`
Closeout key: `verifier-surface-trust-split-module-v1`

## What Changed

Moved the surface/trust verifier proof domain out of `scripts/foundation-verify.mjs` into `lib/foundation-surface-trust-verifier.js`.

The root verifier now delegates the existing PASS/FAIL rows for:

- `/api/foundation-hub` core arrays and decision review shape
- dashboard served-code trust against current repo `HEAD`
- Foundation worker startup-code trust against current repo `HEAD`
- explicit verifier exception ledger validity and staleness
- done backlog card verifier coverage or approved exception coverage
- done-card and closeout claimed artifact/script/API-route existence
- backlog seed/live drift exposure
- DB constraint audit exposure
- Foundation surface mapping
- surface freshness sweep exposure

## What It Does

The module exports:

- `evaluateFoundationSurfaceTrustVerifier()`
- `buildFoundationSurfaceTrustVerifierDogfoodProof()`
- the helper functions for exception validation, done-card coverage, and artifact-claim parsing.

The root verifier line count dropped from the recorded `13,991` baseline to about `13,743` lines while preserving behavior.

## Why It Matters

Surface trust is what makes Steve's command panel and done-work proof meaningful. The old inline block mixed visible app trust, runtime code trust, proof coverage, artifact existence, seed/live drift, DB constraints, and surface mapping inside the root verifier. This split makes that proof domain inspectable and keeps the verifier monolith shrinking without changing product behavior.

## Where It Lives

- `lib/foundation-surface-trust-verifier.js`
- `scripts/process-verifier-surface-trust-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json` script `process:verifier-surface-trust-split-module-check`
- `docs/process/verifier-surface-trust-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`

## Proof

Passed before closeout:

```bash
node --check lib/foundation-surface-trust-verifier.js
node --check scripts/process-verifier-surface-trust-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-surface-trust-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

Results:

- focused proof: 13/13
- backlog hygiene: 0 findings
- `foundation:verify`: 369/369 after one transient Agent Feedback diagnostic retry

Dogfood proof rejects:

- stale verifier exception ledger
- done card without verifier coverage
- done card claiming missing file/script/API route
- stale dashboard served code
- incomplete Foundation surface map

Final ship proof:

```bash
npm run process:foundation-ship -- --card=VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-SURFACE-TRUST-SPLIT-MODULE-001.json --closeoutKey=verifier-surface-trust-split-module-v1 --commitRef=HEAD
```

## Known Limits

- This does not split all of `scripts/foundation-verify.mjs`.
- This does not change Foundation Hub route behavior or payload semantics.
- This does not change dashboard or worker runtime metadata behavior.
- This does not change backlog, Current Sprint, DB schema, source contract, connector, auth, or route behavior.
- This does not build hub features, Canva asset library work, Build Intel extraction, paid-source auth, or Drive permission mutation.

## Review Next

Continue the no-auth Foundation cleanup queue. Best next slice is the Agent Feedback verifier proof-domain split if we want to keep shrinking `scripts/foundation-verify.mjs`, or a bounded Foundation DB/runtime store split if the next verifier slice looks too high-blast-radius.
