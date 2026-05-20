# DECISION-007 Plan

## What

Reconcile the retired old rebuild-decision artifact, live DB decisions, and live open questions into one Foundation decision/question truth path.

V1 scope:

- Read `docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md` as historical evidence, not active truth.
- Map old decisions into represented, superseded, parked, or not-a-decision outcomes.
- Strengthen provenance on the seven historical locked DB decisions with source IDs and artifact refs.
- Confirm stale carry-forward open questions are resolved.
- Preserve the current source-backed `DECISION-008` proposed decision/open question as the only live unresolved route-derived strategy issue.
- Close `DECISION-007` and advance Current Sprint to `REPLY-WATCHING-LOOP-001`.

Not next:

- Do not bulk-import stale OpenClaw/subscription/provider/runtime claims as locked truth.
- Do not lock, apply, approve, or reject the `DECISION-008` strategy issue.
- Do not send messages, mutate external systems, rotate credentials, change provider config, mutate Drive permissions, run paid/provider/browser-auth work, or broaden private extraction.
- Do not build Strategy Hub, People, Harlan, Crewbert, or source/extraction features from this card.

## Why

The Decisions page should not force Steve to remember which strategy decisions live in old docs, current DB rows, or open-question carry-forward notes. The old artifact has useful gold, but it also contains stale April runtime/provider claims and checklist state. This card makes that difference explicit and keeps only durable decision truth in the DB ledger.

## Acceptance Criteria

- The old rebuild-decision artifact is read and mapped into a reconciliation manifest.
- The seven historical locked decisions remain present and source-linked to `SRC-STRATEGY-001`.
- Those seven rows carry artifact refs back to the old decision source, this plan, and the closeout.
- Old runtime/model/provider claims are marked superseded by current runtime/model doctrine instead of imported as locked decisions.
- Historical carry-forward open questions `Q-001` through `Q-005` are resolved.
- The current route-derived strategy issue from `DECISION-008` remains proposed/open and is not accidentally closed by cleanup.
- A dogfood proof catches missing old-source evidence, weak decision provenance, unresolved stale questions, erased current route questions, and stale runtime-claim imports.

## Definition Of Done

- Focused proof is healthy.
- Backlog card is closed with `decision-007-reconciliation-v1`.
- Current Sprint advances to `REPLY-WATCHING-LOOP-001`.
- System Health is raw green.
- Repeated-failure gate is healthy.
- `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship` pass.
- main is clean and pushed.

## Details

Implementation shape:

- `lib/decision-007-reconciliation.js` owns the reconciliation manifest, snapshot evaluator, dogfood proof, and DB apply helper.
- `scripts/process-decision-007-check.mjs` validates approval, Plan Critic, live decision/open-question state, dogfood, closeout registry, and Current Sprint movement.
- The write path is explicit-only through `--close-card`; the default proof path is read-only.
- Existing decision/open-question APIs are reused through `lib/foundation-db.js`; this card does not create a second ledger.

Existing work reused:

- Existing code: `lib/foundation-decision-store.js`, `lib/foundation-db.js`, `lib/decision-004-pending-review.js`, `lib/decision-005-provenance-model.js`, `lib/source-contracts.js`, and `lib/foundation-current-sprint.js`.
- Existing docs: `docs/rebuild/plan-history/rebuild-decisions-2026-04-29-retired.md`, `docs/audits/2026-04-26-foundation-menu-and-systems-audit.md`, `docs/rebuild/current-runtime-map.md`, `docs/rebuild/current-state.md`, and `docs/source-registry.md`.
- Existing scripts: `scripts/process-decision-004-check.mjs`, `scripts/process-decision-005-check.mjs`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Current Sprint and live backlog truth: `DECISION-007` stays the active card until this focused proof closes it, then `REPLY-WATCHING-LOOP-001` remains scoping until its own plan and proof pass.

Behavior proof:

- `buildDecision007ReconciliationSnapshot()` checks real DB decision/open-question rows after apply, not only file markers.
- `applyDecision007Reconciliation()` writes through existing `updateDecision()` and `updateOpenQuestion()` paths, so this is a focused process path over real behavior.
- The dogfood proof recreates the failure classes that matter: missing old decision source, weak decision provenance, unresolved stale questions, erased current `DECISION-008` route question, and stale runtime claims imported as locked truth.
- No substring-only proof is accepted as closeout. Source snippets are only evidence that the retired artifact was read; the pass/fail invariant is the DB-backed decision/question state after reconciliation.

Operator value:

- Steve gets one trusted Decisions path instead of needing to remember which old doc, DB row, or carry-forward question is active.
- The Decisions page can show locked historical doctrine, superseded old runtime claims, and the current `DECISION-008` issue without mixing them together.
- This improves real workflow quality by preventing old-system gold from being lost while also preventing stale runtime/provider claims from becoming live doctrine again.

Reconciliation call:

- Keep durable doctrine rows `DEC-001` through `DEC-007`.
- Add provenance/source/artifact refs to those rows.
- Leave stale runtime/provider specifics to `MODEL-ROUTING-001` and `LLM-ROUTER-001`.
- Leave current source-backed `DECISION-008` unresolved for its own review path.

## Risks

- Blind importing old-system decisions can revive stale runtime/provider doctrine.
  - Repair path: fail proof if locked decisions contain old exact OpenClaw/GPT subscription claims.
- Cleanup can erase a real current strategic issue.
  - Repair path: fail proof unless the route-derived `DECISION-008` proposed decision and open question remain visible.
- Decision cleanup can become a Strategy Hub feature.
  - Repair path: card only updates ledger provenance/status and exits.
- Historical docs can become active truth by accident.
  - Repair path: old artifact is recorded as evidence and classified rows explain what is represented versus superseded.

## Tests

Gate decision tree uses static, focused, and full verification based on blast radius. Static syntax is not enough because this card mutates decision/open-question DB truth and Current Sprint. Focused proof runs first through `process:decision-007-check`; full gates run at closeout through `foundation:verify` and `process:foundation-ship`.

Commands:

- `node --check lib/decision-007-reconciliation.js scripts/process-decision-007-check.mjs`
- `npm run process:decision-007-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:ship-check -- --card=DECISION-007 --planApprovalRef=docs/process/approvals/DECISION-007.json --closeoutKey=decision-007-reconciliation-v1 --skipLiveVerify=true --skipLiveVerifyReason=process:foundation-ship-runs-final-foundation-verify`
- `npm run process:fanout-check -- --card=DECISION-007 --closeoutKey=decision-007-reconciliation-v1`
- `npm run process:foundation-ship -- --card=DECISION-007 --planApprovalRef=docs/process/approvals/DECISION-007.json --closeoutKey=decision-007-reconciliation-v1 --commitRef=HEAD`

Speed budget: focused proof should stay under 2 minutes; full gates run at closeout/ship.
