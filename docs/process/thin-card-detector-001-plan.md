# THIN-CARD-DETECTOR-001 Plan

## What

Add deterministic thin-card detection for Foundation backlog cards before sprint planning.

## Why

Priority and rank do not prove a card is build-ready. A P0 card can still be missing acceptance criteria, proof commands, owner, dependencies, source refs, or not-next boundaries. The sprint advisor and Internal Scoper need an honest readiness signal.

## Acceptance Criteria

- Detector scores live/synthetic cards for build readiness using structured required fields.
- Detector returns missing-field reasons, recommended next step, confidence, and whether Internal Scoper should enrich the card.
- Detector handles done cards, scoped cards, research cards, and synthetic weak cards.
- Detector does not mutate backlog rows or lane state.
- `THIN-CARD-DETECTOR-001` has a Plan Critic pass row with score at least 9.8 before build.

## Definition Of Done

- Thin-card detector functions are reusable by Internal Scoper, research disposition queue, and sprint advisor.
- Focused proof shows a thin synthetic card is flagged and a complete synthetic card is not.
- Live snapshot includes counts by lane and priority.

## Existing Work To Reuse

Reuse `backlog_items`, `getFoundationSnapshot`, backlog hygiene patterns, Plan Critic field expectations, Foundation control backlog monitor logic, and current sprint stage gates.

## Details

Existing code to reuse: live backlog readers, `buildBacklogMonitorSnapshot`, Current Sprint helpers, Plan Critic field expectations, and the focused `process:implementation-intelligence-check` script. Existing docs to reuse: this plan, the sprint plan, current plan/state, and research purge handoff. Existing backlog truth to reuse: live scoped, research, done, ranked, and parked cards.

V1 is bounded to read-only scoring. It checks for title, summary, why-it-matters, next action, source/provenance, owner, lane, priority, acceptance criteria markers, proof command markers, related-card/dependency signals, and not-next boundaries. The black-box behavior proof must call the actual detector function path over a synthetic weak plan/card, a synthetic complete card, and live backlog rows; then it must compare before/after live backlog row counts and lane counts. No substring-only proof is acceptable.

## Root Invariant

The detector reports build readiness. It does not decide what Steve should build next and it does not modify the backlog.

## Risks

- A strict detector could over-flag old cards. Mitigation: use confidence and recommended next step instead of failing cards automatically.
- A loose detector could hide thin cards. Mitigation: synthetic weak-card proof must fail closed.

## Gate Decision

Gate decision tree: static gate is not enough because this is planning behavior, focused gate proves scoring behavior, and full gate runs with the sprint because the blast radius touches Foundation planning infrastructure and verifier coverage. The focused gate must run in under 2 minutes and inspect function return values, not doc markers; `process:foundation-ship` remains required before push.

## Repair Path

If cards are incorrectly classified, update the deterministic rule set and rerun focused proof; do not mark cards done based on detector output alone.

## Operator Value

Operator value: Steve gets a useful real workflow that shows which cards are ready to build and which need scoping before a sprint starts. This unlocks planning speed and quality because meetings stop being spent decoding thin backlog items.

## Tests

- `npm run process:implementation-intelligence-check -- --card=THIN-CARD-DETECTOR-001 --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Not Next

- Do not auto-return, auto-close, or auto-promote cards.
- Do not replace Plan Critic.
- Do not build UI sorting changes in this card.
- Do not run paid-source auth, YouTube extraction, or Research Inbox promotion writes.
