# VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001 Closeout

Date: 2026-05-16
Sprint: `verifier-intelligence-spine-split-module-2026-05-16`
Closeout key: `verifier-intelligence-spine-split-module-v1`

## What Changed

Extracted intelligence-spine verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-intelligence-spine-verifier.js`.

The root verifier now delegates this proof domain through `evaluateFoundationIntelligenceSpineVerifier`, covering:

- INTEL-JOBS governed job ledger proof
- REPORT-MINING old-system report-shape salvage gate
- INTEL-ATOM governed report artifacts, atoms, hits, and Scoper-query proof
- lexical, semantic, and hybrid retrieval proof
- retrieval eval baseline proof
- SYNTHESIS-FACTS source-backed fact ledger proof
- SYNTHESIS-ENGINE clustered synthesis quality proof
- ACTION-ROUTER approval-gated route proof

## Why It Matters

This proof domain guards the intelligence substrate that later hubs and build-intel tools will consume. Keeping it inline inside the root verifier made retrieval, synthesis, and Action Router proof harder to inspect and easier to weaken accidentally.

This slice keeps behavior unchanged while moving that proof domain into a focused module with dogfood fixtures.

## Dogfood Proof

The focused proof recreates the failure class and proves the module fails closed when intelligence-spine checks are weakened.

Rejected cases:

- job-ledger provenance disappears,
- retrieval tier guard disappears,
- Action Router approval gate disappears,
- synthesis evidence proof disappears.

## Proof

Proof run:

```bash
node --check lib/foundation-intelligence-spine-verifier.js # pass
node --check scripts/process-verifier-intelligence-spine-split-module-check.mjs # pass
node --check scripts/foundation-verify.mjs # pass
npm run process:verifier-intelligence-spine-split-module-check -- --json # 23/23 pass
npm run backlog:hygiene -- --json # healthy, 512 cards, 0 findings
npm run foundation:verify -- --json-summary # 366/366 pass
npm run process:foundation-ship -- --card=VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001.json --closeoutKey=verifier-intelligence-spine-split-module-v1 --commitRef=HEAD
```

Note: the first full verifier run exposed a stale running dashboard process that had not loaded the new closeout registry record. Restarting the local dashboard process made `/api/foundation/current-sprint` return healthy and `foundation:verify` passed 366/366.

## Files

- `lib/foundation-intelligence-spine-verifier.js`
- `scripts/process-verifier-intelligence-spine-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/verifier-intelligence-spine-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-INTELLIGENCE-SPINE-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/_archive/handoffs/2026-05-19-hot-doc-cleanup/2026-05-16-verifier-intelligence-spine-split-module-closeout.md`
- `lib/foundation-build-closeout-overnight-records.js`

## Known Limits

- This does not rewrite the whole verifier.
- This does not change intelligence store behavior, route behavior, auth behavior, source contracts, DB schema, or backlog mutation behavior.
- This does not run extraction, create atoms, run embeddings, refresh synthesis, apply Action Router routes, or use paid-source auth.
- This does not split `lib/foundation-db.js`.
- This does not wire Marketing Video Lab live routes.
- This does not create, upload, export, or mutate Canva assets.
- This does not build hub feature UI, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

## Review Next

Continue the standard-mode overnight Foundation cleanup queue with the next coherent verifier proof-domain split or bounded Foundation DB store split, unless the ship gate exposes a higher-priority no-auth Foundation blocker.
