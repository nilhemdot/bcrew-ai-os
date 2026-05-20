# ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001 Closeout

Date: 2026-05-19
Card: `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001`
Closeout key: `admin-deal-policy-source-contract-v1`

## What Shipped

- Added one source-contract module for Admin deal policy dates, labels, daily limit, maturity gate, source IDs, and write boundary.
- Updated the Admin deal runner to import policy values from that contract instead of declaring local date constants.
- Updated the scheduled Admin backlog job to build args, summary, and inputs from the contract.
- Updated Ops UI copy to use the job/source-contract summary instead of hardcoded policy date text.
- Updated the nightly code-quality audit so it stops proposing `ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001` only when runner/job/UI source-contract proof passes.
- Updated the May 19 deep-audit route for `admin-deal-policy-date-duplication` from scoped to done with this closeout key.
- Closed the card and advanced Current Sprint to `APPROVAL-THRESHOLD-REGISTRY-001`.

## Proof

- `node --check lib/admin-deal-policy-source-contract.js scripts/process-admin-deal-policy-source-contract-check.mjs`
- `npm run process:admin-deal-policy-source-contract-check -- --close-card --json`
- `npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001 --planApprovalRef=docs/process/approvals/ADMIN-DEAL-POLICY-SOURCE-CONTRACT-001.json --closeoutKey=admin-deal-policy-source-contract-v1 --commitRef=HEAD`

## Key Result

The Admin deal review policy is now source-owned in code. Runner defaults, scheduled job metadata, and Ops UI text all consume one contract. Future changes to the Admin backlog cutoff, post-policy date, daily limit, or maturity gate no longer require editing three separate surfaces.

The old failure mode is now dogfooded:

- runner-local policy date constants fail
- hardcoded scheduled job `--backlog-since` fails
- hardcoded Ops UI policy dates fail
- missing source-contract metadata fails

## Not Shipped

- No live Admin deal review run.
- No Google Sheets, FUB, or ClickUp calls.
- No source-field writeback expansion.
- No Q2 policy meaning change.
- No source/value expansion.

## Next

Continue `APPROVAL-THRESHOLD-REGISTRY-001`.
