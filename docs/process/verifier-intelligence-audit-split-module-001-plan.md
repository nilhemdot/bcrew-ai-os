# VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001 Plan

Card: `VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001`
Sprint: `verifier-intelligence-audit-split-module-2026-05-15`
Closeout key: `verifier-intelligence-audit-split-module-v1`

## What

Extract the intelligence and audit verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-intelligence-audit-verifier.js`.

This slice covers existing proof for Implementation Intelligence, Build Intel Extraction Implementation, GStack public build intel, Code Quality Nightly Audit, and Nightly Deep Audit Upgrade. It does not run extraction, add sources, change audit cadence, or mutate backlog.

## Why

The root verifier is still a high-risk file. The intelligence/audit checks are large and mix several proposal-only and report-only boundaries that Steve cares about: no autonomous dev, no auto backlog creation, no paid-source auth, and no auto-fixes from audit loops.

Moving this proof domain into a focused module makes those boundaries easier to inspect and dogfood without changing behavior.

## Acceptance Criteria

- `lib/foundation-intelligence-audit-verifier.js` owns the existing intelligence/audit verifier conditions.
- `scripts/foundation-verify.mjs` delegates those rows through `evaluateFoundationIntelligenceAuditVerifier`.
- Focused dogfood proof accepts healthy synthetic state and rejects:
  - Implementation Intelligence writing backlog,
  - Build Intel using paid auth,
  - GStack importing code,
  - Code Quality Nightly Audit auto-fixing,
  - Nightly Deep Audit writing backlog.
- The focused proof script is read-only and has no DB mutation, file-write, or `--apply` path.
- `scripts/foundation-verify.mjs` line count decreases from the `14,889` baseline.
- Live backlog, Current Sprint, Plan Critic run, approval, closeout, Recent Builds, and verifier coverage all name `VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001` and `verifier-intelligence-audit-split-module-v1`.

## Definition Of Done

- `VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001` closes under `verifier-intelligence-audit-split-module-v1`.
- `docs/process/verifier-intelligence-audit-split-module-001-plan.md` and `docs/process/approvals/VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `scripts/process-verifier-intelligence-audit-split-module-check.mjs` passes and proves healthy/broken intelligence/audit fixtures.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse:

- inline intelligence/audit checks in `scripts/foundation-verify.mjs`,
- `lib/implementation-intelligence.js`,
- `lib/build-intel-extraction-implementation.js`,
- `lib/gstack-build-intel.js`,
- `lib/code-quality-nightly-audit.js`,
- `lib/nightly-deep-audit-upgrade.js`,
- prior focused verifier module patterns in `lib/foundation-current-sprint-verifier.js` and `lib/foundation-source-trust-verifier.js`.

Gate decision tree: this is Foundation verifier work touching the canonical gate, package scripts, closeout records, Current Sprint truth, and rebuild docs. Static syntax checks and focused proof run first. Full `process:foundation-ship` is required before push.

Large-file split plan: this card touches `scripts/foundation-verify.mjs`, already over the 5,000-line architecture-risk threshold, only to remove inline intelligence/audit verifier rows and replace them with thin delegation. If work expands into route budgets, hub contracts, DB split checks, or source-trust checks, stop and open a new card.

## Risks

- Risk: the proposal-only and report-only guardrails get weaker while moving code.
  - Response: dogfood rejects backlog writes, paid auth, code import, auto-fix, and audit writeback failures.
- Risk: this turns into Build Intel feature work.
  - Response: this card only moves verifier checks. No extraction, auth, atoms, screenshots, proposals, or new source monitoring.
- Risk: closeout history gets confused because the old root verifier had these checks inline.
  - Response: Recent Builds and closeout records explicitly name this module split and mention the covered historical cards as context only.

## Tests

```bash
node --check lib/foundation-intelligence-audit-verifier.js
node --check scripts/process-verifier-intelligence-audit-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-intelligence-audit-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-INTELLIGENCE-AUDIT-SPLIT-MODULE-001.json --closeoutKey=verifier-intelligence-audit-split-module-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by feeding the module bad intelligence/audit fixtures that should fail but can become easy to miss when the verifier is a large monolith. Substring-only proof is not enough.

## Not Next

- Do not rewrite the whole verifier.
- Do not change Implementation Intelligence, Build Intel, GStack, Code Quality Nightly Audit, or Nightly Deep Audit behavior.
- Do not run new extraction, create atoms, capture screenshots, or connect paid-source auth.
- Do not split `lib/foundation-db.js` in this card.
- Do not wire Marketing Video Lab, Canva asset library, hub feature work, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
