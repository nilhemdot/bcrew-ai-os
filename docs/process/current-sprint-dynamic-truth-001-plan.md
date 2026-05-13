# CURRENT-SPRINT-DYNAMIC-TRUTH-001 Plan

## What

Make the active Current Sprint command view derive from live DB/backlog sprint records instead of hardcoded active-sprint seed constants. Code may keep bootstrap defaults and validators, but active command truth must come from the live sprint overlay.

## Why

Current plan/state/dashboard drift showed that hardcoded sprint strings can remain stale after live sprint records change. The operator value is that Steve can trust the dashboard and live sprint DB without waiting for a developer to update a constant.

## Acceptance Criteria

- `CURRENT-SPRINT-DYNAMIC-TRUTH-001` gets a Plan Critic pass score at or above 9.8; revise blocks Sprint Ready.
- Active sprint goal, executive summary, exit criteria, not-next boundaries, current blocker, and next action come from `foundation_sprints.metadata` and `foundation_sprint_items`.
- Hardcoded seed/default builders are limited to bootstrap, fallback, validation, and synthetic tests.
- The proof command `npm run process:current-sprint-dynamic-truth-check -- --json` mutates a synthetic live sprint record and proves the Current Sprint API route reflects the mutation without editing hardcoded constants.
- The proof command rejects stale-hardcoded command truth when live DB says something different.
- Existing Current Sprint API and Foundation Hub payload shape remain backward compatible.

## Definition Of Done

- Current Sprint dynamic truth proof passes through an actual function/API path, not substring markers.
- Live dashboard state remains the source for active sprint truth.
- Backlog seed defaults no longer compete with live sprint records after a real sprint is active.
- Closeout records exact where-it-lives and not-next boundaries.

## Details

Reuse existing code in `lib/foundation-current-sprint.js`, `lib/foundation-db.js`, `server.js`, and Current Sprint UI payload wiring. Reuse existing docs in `docs/process/foundation-sprint-system-001-plan.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md`. Reuse existing scripts around Foundation sprint checks, live backlog truth, and Current Sprint overlay behavior; add only the smallest focused proof script needed for this card.

The behavior proof calls the actual function path and API route, performs a DB/API round-trip, and rejects weak marker-only or substring-only proof. Gate decision tree: static, focused, or full is chosen by blast radius; this card changes Current Sprint command substrate, so use a focused process proof first and full `process:foundation-ship` / `foundation:verify` for the shipping gate.

This is useful operator behavior for Steve: faster and higher-quality sprint review because the dashboard reflects real workflow state without Steve comparing chat, docs, and DB by hand. The V1 is thin and proportional, with one focused process proof expected to run in under 2 minutes before the full ship gate.

## Risks

- Risk: breaking Current Sprint rendering. Repair path is to keep payload keys backward-compatible and verify `/api/foundation/current-sprint`.
- Risk: replacing all constants too broadly. This V1 only changes active command truth; bootstrap defaults can remain.
- Risk: masking seed/live drift. The proof must include a stale-hardcoded rejection case.
- Repair path: fail closed, keep the card in Scoping or Returned, revise the implementation, and reopen the card if live API truth regresses.

## Tests

- `npm run process:current-sprint-dynamic-truth-check -- --json`
- `/api/foundation/current-sprint` live readback
- `npm run backlog:hygiene -- --json`
- `npm run process:foundation-ship -- --card=CURRENT-SPRINT-DYNAMIC-TRUTH-001 --planApprovalRef=docs/process/approvals/CURRENT-SPRINT-DYNAMIC-TRUTH-001.json --closeoutKey=current-sprint-dynamic-truth-v1 --commitRef=HEAD`

## Not Next

Do not build Reply/Watching Loop, Strategy Hub expansion, source ingestion, connector repair, MEETING-VAULT-ACL-001 Phase B, Drive permissions mutation, request-access emails, broad sprint analytics, or UI redesign.
