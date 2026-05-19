# Foundation Ship Gate Tightening Closeout - 2026-05-15

Sprint: `foundation-ship-gate-verifier-tightening-2026-05-15`

Closeout key: `foundation-ship-gate-tightening-v1`

## What Shipped

- `VERIFY-FAILURE-REPORTER-001`: additive `foundation:verify -- --failures-only` and `--json-summary` modes through `lib/foundation-verify-reporter.js`.
- `CLOSEOUT-OWNERSHIP-GUARD-001`: closeout validation now rejects any card ID that appears in both `backlogIds` and `mentionedBacklogIds`.
- `VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001`: route-budget verifier behavior moved into `lib/foundation-route-budget-verifier.js`.

## Focused Proof

- `npm run process:foundation-ship-gate-tightening-check -- --card=VERIFY-FAILURE-REPORTER-001 --json`
- `npm run process:foundation-ship-gate-tightening-check -- --card=CLOSEOUT-OWNERSHIP-GUARD-001 --json`
- `npm run process:foundation-ship-gate-tightening-check -- --card=VERIFIER-ROUTE-BUDGET-MODULE-SPLIT-001 --json`

Dogfood recreated the exact failure modes:

- noisy verifier output hides the one failing check
- closeout owns and mentions the same card
- old route-budget failures at `2,489ms` and `872,726` bytes

## Not Shipped

- No hub feature work.
- No Marketing Video Lab work.
- No route-budget changes.
- No broad verifier rewrite.
- No verifier/check live-state mutation.

## Next

Stop at sprint review. Good next Foundation candidates are a thin default `backlogItems` contract for Foundation Hub, another verifier module split, or server route ownership extraction if the next audit/profile points there.
