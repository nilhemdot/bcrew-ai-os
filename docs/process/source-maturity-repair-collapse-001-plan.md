# SOURCE-MATURITY-REPAIR-COLLAPSE-001 Plan

## What

Build a narrow source-maturity repair collapse for `SOURCE-MATURITY-REPAIR-COLLAPSE-001`. The card keeps one manifest/proof path for the existing repair families, dogfoods one legacy fixture from each family through a shared evaluator, and archives legacy wrapper/check clones behind a generic runner so named npm scripts still work.

## Why

Steve needs the audit cleanup to reduce clone growth without creating another fragile cleanup. The useful operator value is speed with quality: future source-maturity repair work should start from one engine and data manifest instead of adding another 500-line process script plus one-off library file.

The audit root cause is not merely "too many files"; it is repeated repair shape without a shared ownership point. This card creates that ownership point, moves the duplicate active files out of the active tree, and keeps the old source/browser proof lane and Dev Hub System Truth intact.

## Acceptance Criteria

- The manifest classifies the current source-maturity repair/check surface into `contract_gap`, `trust_gap`, `monitoring_gap`, `evidence_gap`, `atom_flow`, `routing_gap`, and `gap_followup` families.
- The focused proof calls actual function paths, not substring-only checks, and rejects substring-only proof as insufficient.
- The proof runs one old synthetic fixture from every family and fails closed if a family fixture stops proving both the old failure mode and repaired pass mode.
- Legacy wrapper/check files are relocated under `docs/_archive/source-maturity-repairs`, package scripts route to `scripts/process-source-maturity-repair-archive-check.mjs`, and the active repair file count drops under 40.
- The checker proves no source row mutation, extraction run, browser session, atom/vector write, Drive permission mutation, external write, or destructive deletion occurs in this collapse proof.
- The live backlog and Current Sprint record the reduction scope and do not treat a catalog-only pass as done.
- `FOUNDATION-HUB-FOLDER-ISOLATION-001` remains parked for Steve checkpoint.

## Definition Of Done

- `lib/source-maturity-repair-collapse.js` owns the family manifest, classification rules, shared evaluator, proof contracts, not-next boundaries, and V1 closeout metadata for `SOURCE-MATURITY-REPAIR-COLLAPSE-001`.
- `scripts/process-source-maturity-repair-collapse-check.mjs` is the reusable checker for this cleanup lane and records the Plan Critic pass/current-sprint state behind explicit write flags.
- `scripts/process-source-maturity-repair-archive-check.mjs` preserves legacy npm script names while proving the archived target exists and the active surface went down.
- The package exposes `process:source-maturity-repair-collapse-check`, and legacy source-maturity repair package scripts route to the generic archive runner.
- The focused proof passes, `backlog:hygiene` passes, `foundation:verify` passes, and the full `process:foundation-ship` gate is used for closeout because this touches `lib/source-*`, package scripts, Current Sprint, and closeout metadata.
- Closeout states the before/after active repair file counts plainly.

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

Existing scripts preserved:

- all existing `process:source-maturity-*-repair-check` npm script names remain callable through the archive runner
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`

The implementation builds a data manifest from repo file paths and source text, archives duplicate files to `docs/_archive/source-maturity-repairs`, then runs shared behavior contracts for each repair family. The shared proof rejects substring-only markers by requiring actual legacy proof objects with expected failure/pass evidence. The focused checker stays proportional and should run under 30 seconds so builders use it by default instead of bypassing it.

## Risks

Risk: archived file claims in old closeouts look missing. Repair path: add the source-maturity manifest to the archive path map so surface trust follows moved artifacts without keeping duplicate active files.

Risk: touching source-maturity infrastructure can break source readiness gates. Repair path: run static checks, focused collapse proof, startup/tuneup proofs, backlog hygiene, `foundation:verify`, and full `process:foundation-ship`; reopen the card if any live source/browser proof lane or Dev Hub System Truth posture regresses.

Risk: a future builder adds another per-card source-maturity clone. Repair path: the manifest check fails until the new work is represented as data or an intentional family contract.

## Tests

- `node --check lib/source-maturity-repair-collapse.js`
- `node --check scripts/process-source-maturity-repair-collapse-check.mjs`
- `node --check scripts/process-source-maturity-repair-archive-check.mjs`
- `npm run process:source-maturity-repair-collapse-check -- --json`
- sample legacy wrapper: `npm run process:source-maturity-finance-routing-gap-repair-check -- --json`
- `npm run process:source-maturity-repair-collapse-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-repair-collapse-check -- --close-card --json`
- `npm run process:foundation-tuneup-roadmap-check -- --json`
- `npm run process:builder-memory-system-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-REPAIR-COLLAPSE-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-REPAIR-COLLAPSE-001.json --closeoutKey=source-maturity-repair-collapse-v1 --commitRef=HEAD`

## Not Next

Do not touch verifier cleanup in this card. Do not delete `scripts/codex-status.mjs`. Do not start `FOUNDATION-HUB-FOLDER-ISOLATION-001`. Do not mutate Drive permissions, source rows, browser/session state, atoms/vectors, extraction targets, or external systems. Do not touch the real source/browser proof lane or the honest `/api/foundation/dev-team-hub` System Truth posture except to prove they remain protected.
