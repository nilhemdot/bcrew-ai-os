# FOUNDATION-HEALTH-GREEN-LOCK-001 Closeout

Card: `FOUNDATION-HEALTH-GREEN-LOCK-001`
Closeout key: `foundation-health-green-lock-v1`

## What Changed

- Added `lib/foundation-health-green-lock.js`.
- Wired green-lock status into `buildFoundationSystemHealthSnapshot()`.
- Exposed Current Sprint metadata to the health lock so sprint-approved exceptions can be validated.
- Added focused proof in `scripts/process-foundation-health-green-lock-check.mjs`.
- Added package script, approval, plan, closeout registry, and verifier coverage.
- Refreshed Current Sprint ordering to continue Foundation-only with lessons/backlog/control/source/extract work after this card.

## Operator Rule

Green means raw green.
green means raw green.

Classification is not repair. A raw red/yellow row may only report top-level green if live sprint truth contains an explicit Steve-approved exception with owner, reason, threshold, next action, repair card, approval source, and review/expiry.

## Proof

- `node --check lib/foundation-health-green-lock.js lib/foundation-system-health.js lib/foundation-current-sprint.js scripts/process-foundation-health-green-lock-check.mjs`
- `npm run process:foundation-health-green-lock-check -- --apply --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:current-sprint-dynamic-truth-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=FOUNDATION-HEALTH-GREEN-LOCK-001 --planApprovalRef=docs/process/approvals/FOUNDATION-HEALTH-GREEN-LOCK-001.json --closeoutKey=foundation-health-green-lock-v1 --commitRef=HEAD`

## Not Next

- No Value Builder split.
- No Drive permission mutation.
- No email, Agent Feedback, request-access, public, or other external writes.
- No provider key rotation without real exposure or explicit Steve approval.
- No private broad extraction.

Next card: `FOUNDATION-LESSONS-LEARNED-LOOP-001`.
