# Foundation 1100 Review Sprint Approved Plan

Approval score: 9.8/10.

Closeout key: `foundation-1100-review-v1`

Owned cards:

- `BACKLOG-HYGIENE-PASS-002`
- `ACTION-REVIEW-CLEANUP-001`
- `RESEARCH-CURATION-002`
- `PHASE-G-READINESS-001`

## Goal

Clean backlog hygiene, Action Review, research/future-build dispositions, and Phase G order before any new build lane starts.

## Non-Negotiables

- Create the four sprint wrapper cards with full context before cleanup work.
- If the four sprint wrapper cards are missing, create them with full context before cleanup work and include their creation in current plan/state/verifier proof.
- Snapshot baseline counts before wrapper-card creation changes the live backlog count.
- `RESEARCH-CURATION-002 is disposition-only`. Do not deep-research, implement, source-expand, or corpus-expand the 102 cards. Use existing card metadata and current repo/API context only. If deeper work is needed, disposition the card as keep-research or promote-to-scoped-with-investigation-acceptance.
- `ACTION-REVIEW-CLEANUP-001 may apply only safe Foundation/system housekeeping routes` with clear destination proof and no external/business side effect.
- Finance, sales, people, customer, invoice, access-grant, or owner-action routes must be classified/recommended only, not applied, unless Steve explicitly approves that specific route.
- Do not start Phase G UI work.
- Do not start Strategy, Scoper, Agent Factory, or corpus expansion.
- Run `process:foundation-ship` once per card unless multi-card invocation is explicitly upgraded and verified.
- Shared closeout key is allowed only if proof ownership stays exact.

## Build Order

1. Preflight: confirm repo head, served dashboard/worker commits, `foundation:verify`, Backlog Hygiene, Action Review, and live Foundation Hub counts.
2. Freeze `docs/process/foundation-1100-review-sprint.json` baseline from live state before wrapper-card creation.
3. Create missing wrapper cards with full context and capture the card-creation proof in current plan/state/verifier proof.
4. Clean or explicitly accept the 20 Backlog Hygiene findings.
5. Curate the 18 pending Action Review routes. Do not apply business/external side-effect routes without Steve route-specific approval.
6. Disposition the 102 research/future-build cards using existing metadata only.
7. Record final Phase G order and long-parked gate decisions.
8. Add verifier/API proof, run proof commands, ship once per card, verify served commits, push, and stop for review.

## Acceptance

- `BACKLOG-HYGIENE-PASS-002`: Backlog Hygiene has 0 critical findings. Original 20 findings are resolved or explicitly accepted with reason. Scoped cards no longer sound active. P0 scoped cards have next action, acceptance/proof expectations, and closeout expectations.
- `ACTION-REVIEW-CLEANUP-001`: Exact 18 pending route IDs are snapshotted and curated. No business/external action route is applied. Curated routes carry proof metadata and destination proof is required for any safe system apply.
- `RESEARCH-CURATION-002`: Exact 102 research/future-build cards are snapshotted and each has a disposition. No card is deleted. No deep research, implementation, or source/corpus expansion occurs.
- `PHASE-G-READINESS-001`: Final Phase G order is recorded. Long-parked gate decisions are recorded. Phase G remains unstarted.

## Proof

Required proof commands and surfaces:

- `npm run process:foundation-review-sprint-check`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `/api/foundation-hub`
- `/api/foundation/action-review`
- `/api/foundation/build-log`
- dashboard/worker served commit proof
- manual artifact check

## Final Phase G Order

1. `PLAIN-ENGLISH-SWEEP-001`
2. `UI-MENU-LAYOUT-POLISH-001`
3. `RECENT-BUILDS-BILLION-DOLLAR-UI-001`
4. `CHANGE-LOG-COMPREHENSIVE-001`
5. `DAILY-EXEC-SUMMARY-001`
6. `SOURCE-LIFECYCLE-EXPANSION-001`

## Next Step After Ship

Stop for review. Then submit a separate 9.8-ready plan for `PLAIN-ENGLISH-SWEEP-001` unless cleanup changes the Phase G order.
