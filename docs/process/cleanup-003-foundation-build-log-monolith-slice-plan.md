# CLEANUP-003 Foundation Build Log Monolith Slice Plan

## What

Split the static Foundation build closeout registry out of `lib/foundation-build-log.js` into a data-only module, leaving `lib/foundation-build-log.js` as the behavior module.

V1 targets the safest oversized-file slice: `lib/foundation-build-log.js` is over 5K lines because closeout records and logic live together. The behavior is already well-bounded, so the cleanup can be proven by preserving exported APIs and validation output.

## Why

Steve asked for the rebuild to get tighter, not just faster. Oversized files are a senior-engineering smell because they make audits slower, hide ownership boundaries, and make future cards easier to patch in the wrong place.

This sprint is deliberately not a broad refactor. It takes one low-risk split from the monolith report and proves the system can reduce file-size risk without breaking Foundation build-log behavior.

## Acceptance Criteria

- `lib/foundation-build-log.js` no longer owns the static closeout record array.
- Static records live in a data-only module with no behavior.
- Existing public exports from `lib/foundation-build-log.js` still work, including `FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION`, `getFoundationBuildCloseouts()`, `getFoundationBuildCloseoutValidation()`, `enrichFoundationBuildLogCommit()`, and `buildSyntheticBuildLogOwnershipProof()`.
- `lib/foundation-build-log.js` falls below the 5K-line danger budget.
- Focused proof checks current line counts, closeout validation, recent closeout keys, ownership proof, and package script registration.
- Dogfood proof simulates the unsplit oversized failure and proves it fails the split evaluator while the split shape passes.
- `foundation:verify` covers this card by ID and checks the same behavior path.

## Definition Of Done

- Current Sprint shows `CLEANUP-003` moving Scoping -> Sprint Ready -> Building Now -> Done This Sprint.
- Plan Critic pass row exists at score `>= 9.8` before implementation.
- Focused proof passes with the dogfood failure included.
- `backlog:hygiene`, `foundation:verify`, and the full Foundation ship gate pass.
- Closeout records this as `foundation-build-log-monolith-slice-v1`.

## Details

Existing work to reuse:

- Existing code: `lib/foundation-build-log.js` closeout normalization, validation, enrichment, grouping, and ownership proof.
- Existing docs: `docs/process/foundation-monolith-risk-audit-001-plan.md`, `docs/handoffs/2026-05-13-code-quality-nightly-audit-report.md`, and the code-quality nightly audit monolith findings.
- Existing scripts: the Foundation proof script pattern used by `scripts/process-foundation-performance-check.mjs`, `scripts/process-plan-critic-architectural-rules-check.mjs`, and `scripts/foundation-verify.mjs`.
- Live backlog / Current Sprint truth: `CLEANUP-003` is the live card and `foundation-build-log-monolith-slice-2026-05-13` is the active sprint opened in Scoping before implementation.
- `PLAN-CRITIC-ARCHITECTURAL-RULES-001`, which requires a split plan when touching oversized files.

Planned changed files:

- `lib/foundation-build-closeout-records.js` - data-only closeout registry.
- `lib/foundation-build-log.js` - behavior module importing the registry.
- `lib/foundation-build-log-monolith-slice.js` - budget and dogfood proof helpers.
- `scripts/process-foundation-build-log-monolith-slice-check.mjs` - focused proof.
- `scripts/foundation-verify.mjs` - narrow verifier coverage for this card.
- `package.json` - script registration.
- `docs/process/approvals/CLEANUP-003.json` - Plan Critic approval.
- `docs/handoffs/2026-05-13-foundation-build-log-monolith-slice-sprint-handoff.md` - sprint handoff.

Gate decision tree:

- Static proof alone is too weak because exported behavior must remain stable.
- Focused proof is required to import and call the actual Foundation build-log functions.
- Full ship gate is required because this touches a shared Foundation module, verifier coverage, package scripts, current sprint state, and Recent Builds closeout truth.

## Dogfood Proof

The proof must include a synthetic unsplit case that recreates the audit failure: a build-log behavior module over the 5K-line budget with records embedded in the same file. That synthetic case must fail.

The proof must also evaluate the real split layout and pass only when:

- behavior module line count is under the 5K-line budget;
- data module exists and owns records;
- closeout validation passes;
- recent closeout keys are still returned through the actual function path `getFoundationBuildCloseouts()`;
- ownership proof still passes.
- no substring-only proof is accepted; substring-only checks are rejected as insufficient for this card.

This gives Steve useful operator behavior: Recent Builds stays trustworthy and fast to audit in a real workflow, while the code shape gets tighter instead of hiding more Foundation truth inside one file. The focused proof must stay fast and proportional, targeting under 2 minutes by default, so future builders use it instead of bypassing it.

## Risks

- Risk: moving data changes import/export behavior.
  - Repair path: preserve exports from `lib/foundation-build-log.js` and prove callers still import from the same behavior module.
- Risk: this becomes a broad monolith cleanup.
  - Repair path: stop at the build-log split. Queue `foundation-db.js`, `public/foundation.js`, `server.js`, and verifier splits separately.
- Risk: verifier edits add more weight to a large file.
  - Repair path: add only a narrow coverage block and keep new proof logic in a small module/script.

## Tests

```bash
npm run process:foundation-build-log-monolith-slice-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify
npm run process:foundation-ship -- --card=CLEANUP-003 --planApprovalRef=docs/process/approvals/CLEANUP-003.json --closeoutKey=foundation-build-log-monolith-slice-v1 --commitRef=HEAD
```

## Not Next

- Do not split `foundation-db.js`, `public/foundation.js`, `server.js`, or all of `scripts/foundation-verify.mjs` in this sprint.
- Do not build product hub work, Build Intel extraction, Skool, myICOR, YouTube, Loom, GStack, or marketing content.
- Do not add autonomous dev.
- Do not auto-open another sprint.
