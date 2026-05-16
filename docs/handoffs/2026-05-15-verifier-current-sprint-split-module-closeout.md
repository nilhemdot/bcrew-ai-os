# VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001 Closeout

Date: 2026-05-15
Sprint: `verifier-current-sprint-split-module-2026-05-15`
Closeout key: `verifier-current-sprint-split-module-v1`

## What Changed

Extracted the Current Sprint system/cadence verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-current-sprint-verifier.js`.

The root verifier now delegates the two canonical rows through `evaluateFoundationCurrentSprintVerifier`:

- `FOUNDATION-SPRINT-SYSTEM-001 adds Current Sprint control without a second backlog`
- `FOUNDATION-SPRINT-CADENCE-001 adds readable sprint command view without Drive mutation`

## Why It Matters

Current Sprint proof is a process-trust boundary. If it weakens, the board can drift, cards can move without doctrine, and completed-card checks can start failing every time the active blocker rolls forward.

This slice keeps behavior unchanged while moving that proof domain into a focused module with dogfood fixtures.

## Dogfood Proof

The focused proof recreates the failure class and proves the module fails closed when Current Sprint proof is weakened.

Rejected cases:

- unhealthy Current Sprint API/status,
- missing current-sprint doctrine/source markers,
- missing build-log/closeout ownership,
- missing Drive / Meeting Vault stop-line evidence.

## Proof

Passed before closeout:

```bash
node --check lib/foundation-current-sprint-verifier.js
node --check scripts/process-verifier-current-sprint-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-current-sprint-split-module-check -- --json
npm run foundation:verify -- --json-summary
```

Pre-close verifier result: `363/363`.

Required final ship proof:

```bash
npm run backlog:hygiene -- --json
npm run process:foundation-ship -- --card=VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001.json --closeoutKey=verifier-current-sprint-split-module-v1 --commitRef=HEAD
```

## Files

- `lib/foundation-current-sprint-verifier.js`
- `scripts/process-verifier-current-sprint-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/verifier-current-sprint-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `lib/foundation-build-closeout-overnight-records.js`

## Known Limits

- This does not rewrite the whole verifier.
- This does not change Current Sprint DB schema, route behavior, UI behavior, or stage behavior.
- This does not split `lib/foundation-db.js`.
- This does not wire Marketing Video Lab live routes.
- This does not create, upload, export, or mutate Canva assets.
- This does not build hub feature UI, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.

## Review Next

Continue the standard-mode overnight Foundation cleanup queue with the next coherent verifier proof-domain split: `VERIFIER-BUILD-LOG-CLOSEOUT-SPLIT-MODULE-001`, unless the ship gate exposes a higher-priority no-auth Foundation blocker.
