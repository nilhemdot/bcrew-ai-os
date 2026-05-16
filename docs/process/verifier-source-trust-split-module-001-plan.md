# VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001 Plan

Card: `VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001`
Sprint: `verifier-source-trust-split-module-2026-05-15`
Closeout key: `verifier-source-trust-split-module-v1`

## What

Extract the source-trust verifier checks from `scripts/foundation-verify.mjs` into `lib/foundation-source-trust-verifier.js`.

This slice covers the source-of-truth API shape, connector working status, grouped source systems, Data Sources copy, KPI/Supabase health contract, Backlog Hygiene, Card Reference Trust, Source Contract Trust, source cleanup declarations, System Inventory plugin visibility, command-order copy, Phase C card coverage, Drive strategy folder boundary, and Owners sign-off visibility.

## Why

`scripts/foundation-verify.mjs` is still over 15,000 lines. That file is the trust gate for every Foundation sprint, so leaving broad source-trust checks inline keeps the main verifier hard to read and easy to weaken.

This card keeps behavior unchanged while moving one coherent proof domain into a focused module with dogfood fixtures. The operator result is a smaller, more inspectable verifier without weakening source health, source contract, KPI, or reference-trust coverage.

## Acceptance Criteria

- `lib/foundation-source-trust-verifier.js` owns the source-trust verifier definitions and evaluation logic.
- `scripts/foundation-verify.mjs` imports and delegates this proof domain through `evaluateFoundationSourceTrustVerifier`.
- Canonical `foundation:verify` still emits the same source-trust PASS/FAIL rows.
- Focused dogfood proof accepts the healthy current source-trust state and rejects:
  - missing working connector health,
  - stale KPI/Supabase health contract,
  - missing card/source reference trust,
  - substring-only Phase C card coverage.
- The focused proof script is read-only and has no DB mutation, file-write, or `--apply` path.
- `scripts/foundation-verify.mjs` line count decreases from the `15,236` baseline.
- Live backlog, Current Sprint, Plan Critic run, approval, closeout, Recent Builds, and verifier coverage all name `VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001` and `verifier-source-trust-split-module-v1`.

## Definition Of Done

- `VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001` closes under `verifier-source-trust-split-module-v1`.
- `docs/process/verifier-source-trust-split-module-001-plan.md` and `docs/process/approvals/VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001.json` exist and validate.
- `plan_critic_runs` has a durable pass row at `9.8+`.
- `scripts/process-verifier-source-trust-split-module-check.mjs` passes and proves healthy/broken source-trust fixtures.
- `foundation:verify` and `process:foundation-ship` pass before push.

## Details

Existing code to reuse:

- inline source-trust checks in `scripts/foundation-verify.mjs`,
- `lib/source-contracts.js`,
- `lib/kpi-health.js`,
- `lib/card-reference-trust.js`,
- `lib/source-reference-trust.js`,
- prior verifier module patterns in `lib/foundation-source-contract-verifier.js` and `lib/foundation-db-split-verifier.js`.

Gate decision tree: this is Foundation verifier work touching the canonical gate, package scripts, closeout records, Current Sprint truth, and rebuild docs. Static syntax checks and focused proof run first. Full `process:foundation-ship` is required before push.

Large-file split plan: this card touches `scripts/foundation-verify.mjs`, already over the 5,000-line architecture-risk threshold, only to remove a coherent inline source-trust domain and replace it with a thin delegation call. If work expands into unrelated verifier checks, stop and open a new card.

## Risks

- Risk: source-trust semantics change while moving code.
  - Response: focused proof evaluates current live source truth and bad synthetic fixtures, then full `foundation:verify` must pass.
- Risk: proof becomes substring theater.
  - Response: dogfood fixtures must fail when connector, KPI, reference-trust, or Phase C coverage is broken. Substring-only proof is rejected.
- Risk: this becomes a broad verifier rewrite.
  - Response: only source-trust checks move. No DB behavior, route behavior, hub feature work, Canva asset work, paid-source auth, or Build Intel extraction moves in this card.

## Tests

```bash
node --check lib/foundation-source-trust-verifier.js scripts/process-verifier-source-trust-split-module-check.mjs scripts/foundation-verify.mjs
npm run process:verifier-source-trust-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001.json --closeoutKey=verifier-source-trust-split-module-v1 --commitRef=HEAD
```

Dogfood proof recreates the failure class by feeding the module bad source-trust fixtures that should fail but can become easy to miss when the verifier is a 15K-line file. Substring-only proof is rejected because the focused proof must demonstrate real pass/fail behavior from the extracted module.

## Not Next

- Do not rewrite the whole verifier.
- Do not change source contract behavior, connector behavior, KPI probe behavior, or source-of-truth routes.
- Do not split `lib/foundation-db.js` in this card.
- Do not wire Marketing Video Lab, Canva asset library, hub feature work, paid-source auth, Build Intel extraction, autonomous dev, Meeting Vault Phase B, or Drive permission mutation.
