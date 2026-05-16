# VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001 Closeout

Date: 2026-05-16
Sprint: `verifier-core-governance-split-module-2026-05-16`
Closeout key: `verifier-core-governance-split-module-v1`

## What Changed

Extracted core governance/security verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-core-governance-verifier.js`.

The root verifier now delegates this proof domain through `evaluateFoundationCoreGovernanceVerifier`, covering:

- Foundation architecture doctrine and checkpoint promotion
- People / Agents navigation and docs clarity
- Owners source-note signoff visibility
- docs authority index separation
- direct model/transcription host blocking outside approved adapters
- backlog seed/live drift and done-closeout guardrails
- DB constraint/source-reference audit health
- admin-gated Foundation/Ops/doc read APIs
- app auth role gates
- local admin bypass locality checks
- PDF export token forwarding
- generic FUB proxy mutation blocking

## Why It Matters

This security/governance proof domain was buried inside the root verifier monolith. Keeping it inline made critical auth, source-truth, and done-card guardrails harder to inspect and easier to weaken accidentally.

This slice keeps behavior unchanged while moving that proof domain into a focused module with dogfood fixtures.

## Dogfood Proof

The focused proof recreates the failure class and proves the module fails closed when governance/security checks are weakened.

Rejected cases:

- direct model host call appears outside approved adapters,
- broad Foundation/source route loses admin-gated proof,
- local admin bypass starts trusting spoofable Host header,
- generic FUB proxy mutation guard disappears,
- DB constraint audit exposes an invalid source reference,
- backlog done-closeout guard terms disappear.

## Proof

Passed before closeout:

```bash
node --check lib/foundation-core-governance-verifier.js
node --check scripts/process-verifier-core-governance-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-core-governance-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

Focused proof result: `26/26`.
Pre-close verifier result: `365/365`.
Backlog hygiene: healthy across `511` cards.

Required final ship proof:

```bash
npm run process:foundation-ship -- --card=VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001.json --closeoutKey=verifier-core-governance-split-module-v1 --commitRef=HEAD
```

## Files

- `lib/foundation-core-governance-verifier.js`
- `scripts/process-verifier-core-governance-split-module-check.mjs`
- `scripts/foundation-verify.mjs`
- `package.json`
- `docs/process/verifier-core-governance-split-module-001-plan.md`
- `docs/process/approvals/VERIFIER-CORE-GOVERNANCE-SPLIT-MODULE-001.json`
- `docs/rebuild/current-plan.md`
- `docs/rebuild/current-state.md`
- `docs/handoffs/2026-05-16-verifier-core-governance-split-module-closeout.md`
- `lib/foundation-build-closeout-overnight-records.js`

## Known Limits

- This does not rewrite the whole verifier.
- This does not change route behavior, auth behavior, source contracts, DB schema, or backlog mutation behavior.
- This does not split `lib/foundation-db.js`.
- This does not wire Marketing Video Lab live routes.
- This does not create, upload, export, or mutate Canva assets.
- This does not build hub feature UI, paid-source auth, Build Intel extraction, Drive permission mutation, Drive permissions request-access emails, or Meeting Vault Phase B.

## Review Next

Continue the standard-mode overnight Foundation cleanup queue with the next coherent verifier proof-domain split or bounded Foundation DB store split, unless the ship gate exposes a higher-priority no-auth Foundation blocker.
