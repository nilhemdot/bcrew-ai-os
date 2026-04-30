# Approved Plan: PLAIN-ENGLISH-SWEEP-001

Plan score: 9.8/10. Green light.

## Owned Card

- `PLAIN-ENGLISH-SWEEP-001`

## Closeout

- `plain-english-sweep-v1`

## Scope

Run a copy-only plain-English sweep across Foundation operator surfaces:

- Foundation pages
- labels
- empty states
- warnings
- errors
- runtime/status language
- backlog/action/review copy
- system inventory copy
- Recent Work copy where wording is unclear

## Non-Negotiables

- Copy-only sweep.
- Minimum 60 audited copy entries.
- Required category minimums:
  - 8 Backlog / Action Review
  - 8 Runtime Health
  - 8 Recent Work / Build Log
  - 8 Data Sources
  - 8 System Inventory
  - 8 shell/nav/mobile/error/empty states
- Manual review requires pass/fail for each required route and desktop/mobile viewport.
- Do not change IDs, selectors, API shapes, route names, data contract keys, source IDs, card IDs, table names, proof commands, or source-contract strings.
- No UI redesign.
- No layout polish.
- No Recent Work redesign.
- No source expansion.
- No Strategy, Scoper, Agent Factory, corpus, research, or action-review work.

## Required Proof

- `npm run process:plain-english-sweep-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- live `/api/foundation-hub` proof
- live `/api/foundation/build-log` proof
- `npm run process:foundation-ship -- --card=PLAIN-ENGLISH-SWEEP-001 --planApprovalRef=docs/process/approvals/PLAIN-ENGLISH-SWEEP-001.json --closeoutKey=plain-english-sweep-v1 --commitRef=HEAD`
- manual artifact check

## After Ship

Stop for review. Next expected card is `UI-MENU-LAYOUT-POLISH-001`.
