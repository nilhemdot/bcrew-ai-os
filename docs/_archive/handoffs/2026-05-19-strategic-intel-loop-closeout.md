# STRATEGIC-INTEL-001 Closeout

Closeout key: `strategic-intel-loop-v1`

## What Shipped

- Added the Strategic Intelligence issue ledger schema:
  - `intelligence_strategic_issues`
  - `intelligence_strategic_issue_events`
- Added a bounded proof path that seeds strategic issues from current strategy-eligible `intelligence_synthesized_items`.
- Added deterministic v1 scoring for urgency, impact, confidence, and staleness.
- Added source/fact/atom/chunk/synthesized-item provenance requirements for every issue.
- Added weekly operating targets:
  - `>= 5` strategic issues surfaced/week
  - `>= 3` scoped/week
  - `>= 2` resolved-to-applied/week
  - median manual investigation <= 30 minutes/issue
- Pinned `DECISION-008` to write resolution feedback back into the issue ledger.
- Kept `INTEL-SCOPER-001` dependent on the strategic issue ledger/schema instead of letting it run from loose synthesis output.
- Updated the follow-up backlog assurance verifier so the historical Strategic Intelligence guard accepts the shipped `strategic-intel-loop-v1` ledger closeout instead of requiring `STRATEGIC-INTEL-001` to remain forever scoped.

## Boundaries

- No source extraction.
- No old agent runtime.
- No browser automation.
- No provider/model calls.
- No Strategy UI polish.
- No Scoper implementation.
- No external writes, sends, credential changes, provider config changes, or Drive permission mutation.
- No fake resolved/applied outcomes; the target is encoded and measured separately from actual status.

## Proof

Focused proof:

```bash
npm run process:strategic-intel-check -- --close-card --json
npm run process:verifier-followup-backlog-assurance-split-check -- --json
```

Full gates:

```bash
npm run process:system-health-nightly-audit-check -- --json
npm run process:build-lane-repeated-failure-action-gate-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
npm run process:foundation-ship -- --card=STRATEGIC-INTEL-001 --planApprovalRef=docs/process/approvals/STRATEGIC-INTEL-001.json --closeoutKey=strategic-intel-loop-v1 --commitRef=HEAD
```

## Next

Continue `DECISION-008`.

That card should use `intelligence_strategic_issues`, `intelligence_strategic_issue_events`, `intelligence_action_routes`, and source-backed evidence refs to promote selected issues into owner-bound decisions, questions, backlog proposals, snooze/reject outcomes, or accountable doctrine.
