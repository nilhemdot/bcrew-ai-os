# VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001 Closeout

Date: 2026-05-15
Closeout key: `verifier-source-trust-split-module-v1`
Card: `VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001`

## What Changed

Extracted the source-trust verifier assertions from `scripts/foundation-verify.mjs` into `lib/foundation-source-trust-verifier.js`.

The root verifier now delegates this proof domain through `evaluateFoundationSourceTrustVerifier(input)` and keeps the source-trust PASS/FAIL coverage for:

- source-of-truth source and connector shape
- connector working status
- grouped source systems
- Data Sources purpose and connector-boundary copy
- KPI / Supabase health contract
- Runtime Health Backlog Hygiene
- Card Reference Trust and Source Contract Trust
- source cleanup and verifier consolidation declarations
- System Inventory plugin visibility
- command-order / Rebuild Plan copy
- Phase C visibility cards
- Drive strategy folder boundary
- Owners signoff visibility through `/api/source-of-truth`

## Why It Matters

`scripts/foundation-verify.mjs` is still a critical trust surface and was over 15,000 lines. This slice removes a coherent source-trust proof domain without changing source contracts, connectors, KPI probes, source-of-truth routes, Foundation DB behavior, hub features, Canva assets, or paid-source extraction.

## Dogfood Proof

`scripts/process-verifier-source-trust-split-module-check.mjs` proves the module accepts the current healthy source-trust state and rejects:

- missing working connector health
- stale KPI / Supabase health contract
- missing card/source reference trust
- substring-only Phase C card coverage

The focused proof also verifies that the root verifier delegates to the module, the old inline source-trust predicate block is gone, and the proof script remains read-only.

## Proof Commands

```bash
node --check lib/foundation-source-trust-verifier.js
node --check scripts/process-verifier-source-trust-split-module-check.mjs
node --check scripts/foundation-verify.mjs
npm run process:verifier-source-trust-split-module-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-TRUST-SPLIT-MODULE-001.json --closeoutKey=verifier-source-trust-split-module-v1 --commitRef=HEAD
```

## Line Count

- Before: `scripts/foundation-verify.mjs` 15,236 lines
- After focused extraction: about 14,984 lines during focused proof

## Not Shipped

- No source contract behavior change
- No connector behavior change
- No KPI probe behavior change
- No source-of-truth route change
- No Foundation DB behavior change
- No Marketing Video Lab or hub feature work
- No Canva asset mutation
- No paid-source auth
- No Build Intel extraction
- No Meeting Vault Phase B
- No Drive permission mutation

## Next

Continue the standard-mode overnight Foundation cleanup queue with the next coherent verifier proof-domain split. The next planned no-auth cleanup card is `VERIFIER-CURRENT-SPRINT-SPLIT-MODULE-001`.
