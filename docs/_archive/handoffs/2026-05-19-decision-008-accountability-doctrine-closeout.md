# DECISION-008 Closeout

Closeout key: `decision-008-accountability-doctrine-v1`

## What Shipped

- Added a focused accountability-doctrine proof for `DECISION-008`.
- Promoted one route-linked `intelligence_strategic_issues` row into:
  - an owner-bound `open_questions` row
  - a `decisions` row with `status = proposed`
  - an `intelligence_strategic_issue_events` `resolution_feedback` event
- Preserved the source chain:
  - issue ID
  - route ID
  - source IDs
  - fact refs
  - atom refs
  - chunk refs
  - synthesized item refs
- Kept the issue `resolution_status = route_pending` so proposed accountability cannot masquerade as final doctrine.
- Pinned `INTEL-SCOPER-001` to read from issue/route/source/feedback truth before it scopes follow-up cards.

## Boundaries

- No locked decisions.
- No applied doctrine.
- No Scoper implementation.
- No Strategy Hub UI.
- No source extraction.
- No old agent runtime.
- No browser automation.
- No provider/model calls.
- No external writes, sends, credential changes, provider config changes, or Drive permission mutation.

## Proof

Focused proof:

```bash
node --check lib/decision-008-accountability-doctrine.js scripts/process-decision-008-check.mjs
npm run process:decision-008-check -- --close-card --json
```

Full gates:

```bash
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=DECISION-008 --planApprovalRef=docs/process/approvals/DECISION-008.json --closeoutKey=decision-008-accountability-doctrine-v1 --commitRef=HEAD
```

Ship gate proof:

```bash
npm run process:ship-check -- --card=DECISION-008 --planApprovalRef=docs/process/approvals/DECISION-008.json --closeoutKey=decision-008-accountability-doctrine-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify
npm run process:fanout-check -- --card=DECISION-008 --closeoutKey=decision-008-accountability-doctrine-v1
```

## Next

Continue `INTEL-SCOPER-001`.

The Scoper must start from `intelligence_strategic_issues`, `intelligence_strategic_issue_events`, `intelligence_action_routes`, open questions, proposed decisions, and source-backed evidence refs. It should not create disconnected backlog work from loose prose.
