# INTEL-SCOPER-001 Closeout

Closeout key: `intel-scoper-v1`

## What Shipped

- Added the v1 Strategic Intelligence Scoper behavior owner in `lib/intel-scoper.js`.
- Added the focused proof and close-card path in `scripts/process-intel-scoper-check.mjs`.
- Added the durable `intelligence_scoper_outputs` proposal-only ledger.
- Created a five-row human Scoper sample from live strategic issues, DECISION-008 outputs, routes, source refs, atoms, chunks, decisions, and open questions.
- Wrote `scoped` events back to `intelligence_strategic_issue_events`.
- Preserved the hard boundary that Scoper outputs do not auto-create backlog cards, apply decisions, open sprints, call providers, run extraction, or write externally.

## Proof

- `node --check lib/intel-scoper.js scripts/process-intel-scoper-check.mjs`
- `npm run process:intel-scoper-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=INTEL-SCOPER-001 --planApprovalRef=docs/process/approvals/INTEL-SCOPER-001.json --closeoutKey=intel-scoper-v1 --commitRef=HEAD`

## Output Contract

`intelligence_scoper_outputs` stores:

- issue ID
- source IDs
- fact refs
- atom refs
- chunk refs
- synthesized item refs
- route refs
- decision refs
- open question refs
- status classification
- owner
- confidence
- gap statements
- smallest next steps
- blocked auto-actions
- proposal-only payload

## Guardrails

- No backlog card is auto-created.
- No decision is locked or applied.
- No external system is written.
- No source extraction, browser automation, provider call, paid/auth work, credential mutation, send, or Drive permission mutation happens in this card.
- Weak source evidence degrades to `stale_or_test` instead of pretending the item is build-ready.

## Next

Continue `DATA-003`.

`DATA-003` should use live source-backed values and can now read Scoper outputs as evidence-bound issue/gap truth instead of relying on markdown snapshots or chat memory.
