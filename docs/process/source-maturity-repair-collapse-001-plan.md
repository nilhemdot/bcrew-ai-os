# SOURCE-MATURITY-REPAIR-COLLAPSE-001 Plan

## What

Build a narrow, fast V1 source-maturity repair collapse engine for `SOURCE-MATURITY-REPAIR-COLLAPSE-001`. V1 creates one manifest/proof path for the existing repair families, classifies every current source-maturity repair/check file by family, and dogfoods one legacy fixture from each family through a shared evaluator.

This is not a deletion wave. The old repair wrappers stay in place until a follow-up migration can repoint gates first and prove no named check path breaks.

## Why

Steve needs the audit cleanup to reduce clone growth without creating another fragile cleanup. The useful operator value is speed with quality: future source-maturity repair work should start from one engine and data manifest instead of adding another 500-line process script plus one-off library file.

The audit root cause is not merely "too many files"; it is repeated repair shape without a shared ownership point. This card creates that ownership point and keeps the old source/browser proof lane, Dev Hub System Truth, and no-delete guardrails intact.

## Acceptance Criteria

- The manifest classifies the current source-maturity repair/check surface into `contract_gap`, `trust_gap`, `monitoring_gap`, `evidence_gap`, `atom_flow`, `routing_gap`, and `gap_followup` families.
- The focused proof calls actual function paths, not substring-only checks, and rejects substring-only proof as insufficient.
- The proof runs one old synthetic fixture from every family and fails closed if a family fixture stops proving both the old failure mode and repaired pass mode.
- The checker proves no source row mutation, extraction run, browser session, atom/vector write, Drive permission mutation, external write, or file deletion occurs in this collapse proof.
- The live backlog and Current Sprint record the V1 scope as a manifest/control collapse, not a claim that every old wrapper has already been deleted.
- `FOUNDATION-HUB-FOLDER-ISOLATION-001` remains parked for Steve checkpoint.

## Definition Of Done

- `lib/source-maturity-repair-collapse.js` owns the family manifest, classification rules, shared evaluator, proof contracts, not-next boundaries, and V1 closeout metadata for `SOURCE-MATURITY-REPAIR-COLLAPSE-001`.
- `scripts/process-source-maturity-repair-collapse-check.mjs` is the one reusable checker for this cleanup lane and records the Plan Critic pass/current-sprint state behind explicit write flags.
- The package exposes `process:source-maturity-repair-collapse-check`.
- The focused proof passes, `backlog:hygiene` passes, `foundation:verify` passes, and the full `process:foundation-ship` gate is used for closeout because this touches `lib/source-*`, package scripts, Current Sprint, and closeout metadata.
- V1 closeout states the known limit plainly: old repair files are still present; wrapper migration/archive is follow-up work only after gate repoint proof.

## Details

Existing code reused:

- `lib/source-maturity-grid.js`
- `lib/source-maturity-gap-followup.js`
- `lib/source-maturity-contract-gap-repair.js`
- `lib/source-maturity-github-build-intel-trust-gap-repair.js`
- `lib/source-maturity-strategy-monitoring-gap-repair.js`
- `lib/source-maturity-evidence-gap-repair.js`
- `lib/source-maturity-strategy-atom-flow-repair.js`
- `lib/source-maturity-strategy-routing-gap-repair.js`
- `lib/source-maturity-routing-gap-repair.js`
- `lib/process-plan-critic.js`
- `lib/process-write-guard.js`
- live backlog and Current Sprint DB helpers

Existing docs reused:

- `docs/process/foundation-tuneup-roadmap-001-plan.md`
- existing source-maturity repair plans under `docs/process/source-maturity-*-repair-001-plan.md`
- current state/current plan docs as context only, not live task truth

Existing scripts reused:

- all existing `scripts/process-source-maturity-*-repair-check.mjs` fixtures remain callable
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

The implementation builds a data manifest from repo file paths and source text, then runs shared behavior contracts for each repair family. The shared proof rejects substring-only markers by requiring actual legacy proof objects with expected failure/pass evidence. The focused checker stays proportional and should run under 30 seconds so builders use it by default instead of bypassing it.

## Risks

Risk: V1 might be mistaken for full deletion of old repair files. Repair path: fail closed in the checker and closeout wording unless known limits explicitly say old wrappers remain and migration/archive is follow-up.

Risk: touching source-maturity infrastructure can break source readiness gates. Repair path: run static checks, focused collapse proof, startup/tuneup proofs, backlog hygiene, `foundation:verify`, and full `process:foundation-ship`; reopen the card if any live source/browser proof lane or Dev Hub System Truth posture regresses.

Risk: a future builder adds another per-card source-maturity clone. Repair path: the manifest check fails until the new work is represented as data or an intentional family contract.

## Tests

- `node --check lib/source-maturity-repair-collapse.js`
- `node --check scripts/process-source-maturity-repair-collapse-check.mjs`
- `npm run process:source-maturity-repair-collapse-check -- --json`
- `npm run process:source-maturity-repair-collapse-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-repair-collapse-check -- --close-card --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-REPAIR-COLLAPSE-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-REPAIR-COLLAPSE-001.json --closeoutKey=source-maturity-repair-collapse-v1 --commitRef=HEAD`

## Not Next

Do not delete, archive, or move verifier/approval/plan/check files in this card. Do not delete `scripts/codex-status.mjs`. Do not start `FOUNDATION-HUB-FOLDER-ISOLATION-001`. Do not mutate Drive permissions, source rows, browser/session state, atoms/vectors, extraction targets, or external systems. Do not touch the real source/browser proof lane or the honest `/api/foundation/dev-team-hub` System Truth posture except to prove they remain protected.
