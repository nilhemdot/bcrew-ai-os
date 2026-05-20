# DECISION-005 Plan - Decision Provenance And Participant Model

## What

Build the decision provenance and participant model that sits underneath the existing decision ledger. `DECISION-004` blocks weak lock-in; this card makes the evidence model explicit so a locked decision can say whether it came from direct meeting/thread evidence, an Action Router route, or a historical backfill.

The V1 scope is tight:

- Add provenance type/status fields to decisions.
- Add meeting/session/thread/source/route/artifact refs.
- Add participant-role metadata.
- Backfill historical locked seed decisions as honest weak backfills.
- Keep future direct decisions distinguishable from backfilled or route-derived decisions.

## Why

Decision logs rot when every record looks equally certain. A decision captured from a live meeting transcript is not the same as a backfilled seed row from an old rebuild note. A route-derived proposed decision is not the same as a Steve-confirmed locked agreement.

Steve needs the system to preserve that difference so later strategy, SOP, policy, and accountability surfaces can trust the decision ledger without overclaiming certainty.

Operator value: when a decision is reviewed later, the system can answer who participated, what source or route produced it, whether the evidence was direct or backfilled, and what still needs stronger proof.

## Acceptance Criteria

- Decisions carry `provenanceType`, `provenanceStatus`, `provenanceNotes`, `sourceIds`, `routeRefs`, `artifactRefs`, `meetingRef`, `sessionRef`, `threadRef`, and `participantRoles`.
- Locked seed decisions are backfilled as `backfilled / weak_backfill`, not `direct / strong`.
- Direct decisions require at least one meeting/session/thread/artifact ref plus source signal and participants.
- Route-derived decisions require route refs and source signal.
- Backfilled decisions cannot be marked `strong`.
- Lock-in validation rejects missing or dishonest provenance.
- Proposed decisions remain human-reviewable; no decisions are auto-applied.
- Current Sprint advances to `FOUNDATION-SURFACE-UPDATES-001` only after focused proof and full gates.

## Definition Of Done

- `lib/decision-005-provenance-model.js` provides provenance normalizers, lock validation, snapshot, dogfood proof, evaluator, and closeout renderer.
- `lib/foundation-db-schema-seed-store.js` creates/migrates the provenance columns and backfills seed decisions honestly.
- `lib/foundation-decision-store.js` maps, writes, and validates provenance fields.
- Decision write/apply routes accept provenance fields without creating external side effects.
- `scripts/process-decision-005-check.mjs` validates approval, Plan Critic, live provenance snapshot, dogfood behavior, package script, closeout registry, backlog, and Current Sprint.
- Backlog marks `DECISION-005` done and keeps `FOUNDATION-SURFACE-UPDATES-001` live as the next active card.

## Details

## Reuse Existing Work

Existing work reused:

- `DECISION-004` pending review and lock-in guard.
- `MEMORY-005` temporal truth semantics.
- `ACTION-ROUTER-001` route-backed decision proposals.
- Existing `decisions` table, Foundation decision store, shared-communications candidate apply path, and Foundation Decisions UI.
- Existing source/route/artifact identifiers from shared communications and Strategic Intel.
- Existing code: `lib/foundation-decision-store.js`, `lib/foundation-db-schema-seed-store.js`, `lib/foundation-write-routes.js`, `lib/foundation-shared-comms-store.js`, and `lib/strategy-shared-comms-routes.js`.
- Existing docs: `docs/process/decision-004-plan.md`, `docs/process/approvals/DECISION-004.json`, and `docs/handoffs/2026-05-20-decision-004-pending-decision-review-closeout.md`.
- Existing scripts: `scripts/process-decision-004-check.mjs`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, `foundation:verify`, and `process:foundation-ship`.
- Live backlog and Current Sprint truth: `DECISION-005` is the active card and `FOUNDATION-SURFACE-UPDATES-001` is the next sprint item.

Exact gap:

- The ledger had owner/confirmer/participants/context/evidence notes, but it did not distinguish direct evidence from route-derived proposals or historical backfills.

Implementation path:

- Add a DECISION-005 module with provenance normalizers, readiness validation, dogfood proof, evaluator, and closeout renderer.
- Add decision provenance columns and indexes to the schema initializer.
- Extend decision create/update and shared-communications candidate-to-decision writes with optional provenance fields.
- Add focused close-card proof that backfills existing locked seed decisions as weak backfills and proves no locked decision has missing/dishonest provenance.

Root invariant and root cause:

- Root cause: early provenance fields collapsed evidence certainty into plain text notes.
- Root invariant: a locked decision must carry an honest provenance posture. Backfilled historical evidence can remain locked only if it is labeled as backfilled/weak, not direct/strong.
- The proof uses actual function behavior, live DB rows, and dogfood fixtures. It does not accept substring-only proof for provenance correctness.

Not next:

- Do not auto-lock, auto-apply, auto-reject, or send decisions.
- Do not build `DECISION-006` policy/SOP artifacts.
- Do not create a second decision database or rebuild Action Router.
- Do not run private/browser-auth/paid/provider extraction to find missing historical links.
- Do not mutate external systems, Drive permissions, credentials, provider config, or source systems.

Gate decision tree:

- Static gate: `node --check` covers the module, process script, decision store, and schema store syntax.
- Focused gate: `process:decision-005-check` covers approval, Plan Critic, schema/store/route wiring, live DB snapshot, dogfood behavior, package script, registry, backlog, and Current Sprint.
- Full gate: this touches schema and decision write behavior, so `foundation:verify` and `process:foundation-ship` are required before push.
- Blast radius: decision writes gain optional fields; lock validation only tightens `status=locked` behavior.
- Speed bound: focused proof should stay under 2 minutes; full ship runs once at card close.

## Risks

- The system could overstate old seed decisions as direct evidence. The backfill must mark them `backfilled / weak_backfill`.
- The route-derived path could look too final. Route-derived records must remain proposed/review-controlled until human confirmation.
- A too-strict validator could block legitimate historical locked rows. Historical locks may remain valid only when they are explicitly labeled weak backfills.
- Current Sprint could get ahead of repo truth. Close-card proof must update backlog/sprint only after focused checks pass.

Repair path:

- If focused proof fails, do not close the card; repair the failing behavior and rerun the focused gate.
- If a lock attempt is legitimately blocked, add direct source refs or mark the row as an honest backfill with notes.
- If schema migration fails, stop writes, repair the schema initializer, and rerun `process:decision-005-check`.
- If any operation becomes approval-bound, park that specific action and continue the next safe sprint card.

## Tests

- `node --check lib/decision-005-provenance-model.js scripts/process-decision-005-check.mjs lib/foundation-decision-store.js lib/foundation-db-schema-seed-store.js`
- `npm run process:decision-005-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify -- --json-summary`
- `npm run process:foundation-ship -- --card=DECISION-005 --planApprovalRef=docs/process/approvals/DECISION-005.json --closeoutKey=decision-005-provenance-participant-model-v1 --commitRef=HEAD`
