# Build Opportunity Promotion Gate 001 Plan

Card: `BUILD-OPPORTUNITY-PROMOTION-GATE-001`

## Intent

Build the final approval gate between source-backed Build Intel recommendations and committed Backlog work.

Director, Scoper, and Portfolio can decide that an opportunity is worth considering. This gate decides whether the system is allowed to prepare a backlog-card proposal or existing-card attachment after Steve approval.

Steve approval is mandatory. This first slice is proposal-only and performs no automatic backlog creation.

## Existing Work To Reuse

- `lib/dev-team-intelligence-director.js` ranks source-backed candidates and keeps raw Director output proposal-only.
- `lib/dev-build-opportunity-scoper.js` turns Director recommendations into scoped candidates only after codebase research, source lineage, acceptance criteria, proof, risks, and not-next boundaries exist.
- `lib/build-portfolio-scrum-master.js` merges, parks, or returns scoped candidates before anything can become work.
- `lib/action-route-promotion-workflow.js` provides a related approval-workflow pattern for action-route items, but this card owns the Build Intel opportunity packet and proof.
- `lib/research-inbox.js` already proves proposal-only source intake semantics.

## Contract

The promotion gate accepts one Build Intel opportunity candidate and returns one of these outcomes:

- approval required
- backlog-card proposal ready
- existing-card attachment proposal ready
- needs more evidence
- duplicate attachment required
- stale evidence needs refresh
- blocked by unsafe runtime/source flags
- rejected with evidence
- duplicate logged
- stale logged

All outcomes include an evidence packet. The packet must include:

- title, summary, and recommended next step
- source anchor such as source ID, report artifact, video ID, or source URL
- raw atom or hit evidence when promotion is being attempted
- acceptance criteria
- definition of done
- proof commands
- risks
- not-next boundaries

## Boundaries

No live extraction, crawl, click run, login, form submit, download, purchase, model call, provider call, or external write happens in this gate.

No automatic backlog creation happens in this gate.

No sprint mutation happens in this gate.

No raw Director recommendation can skip Scoper and Portfolio into backlog work.

Duplicate candidates must attach to an existing card or be logged as duplicate. They cannot create another card.

Stale candidates must refresh evidence before promotion.

Reject, duplicate, and stale outcomes preserve the evidence packet and review reason so the source trail is not lost.

## Proof

Focused proof:

```bash
npm run process:build-opportunity-promotion-gate-check -- --json
```

Supporting proof:

```bash
node --check lib/build-opportunity-promotion-gate.js scripts/process-build-opportunity-promotion-gate-check.mjs
npm run process:dev-build-scoper-check -- --json
npm run process:build-portfolio-scrum-master-check -- --json
npm run process:code-quality-nightly-audit-check -- --json --no-write --skip-endpoint-fetch
npm run process:doc-artifact-bloat-guard-check -- --json
npm run process:system-health-nightly-audit-check -- --json
npm run backlog:hygiene -- --json
npm run foundation:verify -- --json-summary
```

## Not Next

- Do not implement the apply/write path from proposal to live Backlog in this slice.
- Do not close this card without Steve review of the approval path.
- Do not use this gate to approve Skool, MyICOR, paid, private, auth, form, download, or source-packet work while Steve is unavailable.
- Do not treat comments as useful parked evidence.
