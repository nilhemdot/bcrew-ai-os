# Connector Routing Truth Sprint Plan

## Scope

Run the 2026-05-12 truth sprint before any Reply/Watching Loop or product-layer expansion.

The sprint order is:

1. Diagnose and restore artifact-to-atom promotion.
2. Reconcile live `foundation_sprints` state with committed sprint closeout truth.
3. Fix proportional gate tiering so backlog-card-only `lib/foundation-db.js` captures can use the focused gate while substrate edits stay full-gate.
4. Persist Plan Critic run scores and rejection reasons.
5. Populate the source connector matrix with old-system connector coverage, missing connector rows, and atom-flow columns.
6. Populate the source hub routing matrix with many-to-many destination states.
7. Decide the next sprint from matrix truth instead of starting Reply/Watching Loop by default.

## Existing Work Reused

- Source Lifecycle and Foundation Hub APIs.
- Current Sprint overlay tables and validators.
- Existing extraction target control and shared-comms candidate promotion paths.
- Existing Plan Critic evaluator and proportional gate classifier.
- Source Once-Over maturity, extraction, marketing, brand, tier, changelog, and decision surfaces.
- Recent Work closeout and canonical `foundation:verify` gate.

## Acceptance

- Recent artifacts/candidates produce fresh `intelligence_atoms`.
- Source Once-Over is closed in live sprint DB and the Connector/Routing Truth sprint is active.
- Backlog-card-only Foundation DB seed captures are focused-gate eligible; schema/function/substrate edits remain full-gate.
- Plan Critic pass/revise runs persist in a queryable ledger.
- Connector matrix exposes contract, connector, extraction target, artifacts, candidates, promoted atoms, synthesis, routing, and blocker reason.
- Hub routing matrix exposes `route`, `candidate`, `blocked`, `n/a`, and `unknown` across the first hub set.
- Recent Work owns the closeout and every done sprint card has verifier coverage.

## Not Next

- Do not start Reply Parser or Watching Items.
- Do not connect new external systems inside the matrix cards.
- Do not claim a source is connected when artifacts, candidates, atoms, synthesis, and routing are not visible together.
- Do not mutate Drive permissions, send request-access emails, or run `MEETING-VAULT-ACL-001` Phase B.
- Do not build Strategy expansion, Marketing production, Telegram bots, Directors, or agents.

## Proof

- `npm run intelligence:synthesis-refresh`
- `npm run process:atom-promotion-diagnose-check -- --json`
- `npm run process:sprint-db-reconcile-check -- --json`
- `npm run process:verify-gate-tiering-check -- --json=true`
- `npm run process:plan-critic-log-check -- --json`
- `npm run process:plan-critic-check -- --json=true`
- `npm run process:source-connector-matrix-check -- --json`
- `npm run process:source-hub-routing-matrix-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`

## Repair Path

If atom flow regresses, stop product work and rerun the atom-promotion diagnose proof before expanding source work.

If a matrix reports missing or blocked sources, pull the smallest source-gap follow-up. Do not treat the matrix itself as connector implementation.

If the full verifier fails on stale process assumptions, repair the verifier to distinguish closed historical sprints from the active sprint instead of weakening source or security checks.
