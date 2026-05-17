# Verifier Source Once-Over Progression Split Closeout - 2026-05-17

Card:
`VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001`

Closeout key:
`verifier-source-once-over-progression-split-v1`

## Summary

Extracted the Source Once-Over / strategy-feature progression verifier domain from `scripts/foundation-verify.mjs` into `lib/foundation-verifier-source-once-over-progression.js`.

The root verifier now delegates the checks from `STRATEGY-HUB-MEETING-READY-001` through `FOUNDATION-UI-COMPLETE-001` instead of owning that behavior inline.

## Domain Boundary

Included:

- `STRATEGY-HUB-MEETING-READY-001`
- `AVATAR-IMPORT-001`
- `AUTO-DEPLOY-ROLLBACK-001`
- `SOURCE-MATURITY-GRID-001`
- `SOURCE-EXTRACTION-COVERAGE-001`
- `SOURCE-COVERAGE-CLOSEOUT-001`
- `MARKETING-SOURCE-MAP-001`
- `BRAND-STACK-001`
- `TIER-BEHAVIORAL-COMPLETION-001`
- `VERIFICATION-RUNS-001`
- `PER-USER-CHANGELOG-001`
- `DECISION-RESTRICTED-QUEUE-001`
- `FOUNDATION-UI-COMPLETE-001`

Not included:

- Connector Routing Truth
- process governance
- runtime reliability
- process hardening
- source-contract verifier checks
- any product/hub/connector feature build

## Proof

Focused dogfood rejects:

- hidden Strategy meeting packet failure
- hidden Avatar import failure
- hidden source coverage failure
- hidden marketing/brand failure
- hidden verification/decision failure
- hidden Foundation UI Complete failure
- old inline root predicates still present

Commands for this sprint:

```bash
node --check lib/foundation-verifier-source-once-over-progression.js scripts/process-verifier-source-once-over-progression-split-check.mjs scripts/foundation-verify.mjs lib/foundation-build-closeout-tightening-records.js
npm run process:verifier-source-once-over-progression-split-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:ship-check -- --card=VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001.json --closeoutKey=verifier-source-once-over-progression-split-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001 --closeoutKey=verifier-source-once-over-progression-split-v1
npm run process:foundation-ship -- --card=VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001 --planApprovalRef=docs/process/approvals/VERIFIER-SOURCE-ONCE-OVER-PROGRESSION-SPLIT-001.json --closeoutKey=verifier-source-once-over-progression-split-v1 --commitRef=HEAD
```

## Next

Continue verifier monolith reduction from repo truth. Under 10K is already cleared, but the clean target remains under 5K. Pick the next coherent verifier domain after inspecting the remaining root; do not move code just for line count.
