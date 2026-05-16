# SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001 Plan

## What

Replace exact source-count assumptions in Source Lifecycle proof paths with dynamic source-contract-derived invariants.

## Why

Exact counts turn legitimate source-contract additions into false failures. The real invariant is not "there are exactly N sources forever"; it is "required source groups resolve, each governed source has a lifecycle row, and missing required coverage fails clearly."

## Acceptance Criteria

- Identify Source Lifecycle checks and proof code that rely on exact source-count baselines.
- Replace exact count assertions with dynamic checks derived from current source contracts, grouped systems, and required coverage categories.
- Preserve intentional historical baseline labels where the count is evidence, not a live invariant.
- Add dogfood proof: adding a synthetic optional source does not fail lifecycle proof, but removing required source coverage still fails.
- Keep the work report-only/read-only for source data: no source extraction, connector auth changes, or source contract mutation.
- Keep existing Source Lifecycle API/UI shape compatible.

## Definition Of Done

- Source Lifecycle dynamic-count helper or verifier logic owns the required/optional coverage invariant.
- Focused proof script proves optional source additions pass and missing required coverage fails.
- `scripts/foundation-verify.mjs` has ID-named coverage for `SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001`.
- Closeout records what exact counts were replaced and which baselines remain historical labels.

## Existing Work Reused

- `lib/source-lifecycle.js` and related source lifecycle snapshots already own source lifecycle rows.
- `lib/source-contracts.js` is the source contract registry for current source truth.
- The nightly deep audit card already scoped this from hardcoded-source-count baseline findings.

## Risks And Repair

Risk: weakening counts hides real missing sources. Repair: assert required source categories/groups and row coverage, not no-count.

Risk: broad source lifecycle rewrite. Repair: focused proof only; no API/UI redesign.

Risk: accidental source mutation. Repair: no writes to source contracts, DB source records, connector auth, or extraction state.

## Proof Commands

- `npm run process:source-lifecycle-dynamic-counts-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001 --planApprovalRef=docs/process/approvals/SOURCE-LIFECYCLE-DYNAMIC-COUNTS-001.json --closeoutKey=source-lifecycle-dynamic-counts-v1 --commitRef=HEAD`

## Not Next

- Do not add new sources.
- Do not change connector auth.
- Do not run source extraction.
- Do not change Source Lifecycle UI design.
- Do not build hub features.
- Do not work Marketing Video Lab, Canva asset library features, paid-source auth, Build Intel extraction, Meeting Vault Phase B, or Drive permission mutation.
