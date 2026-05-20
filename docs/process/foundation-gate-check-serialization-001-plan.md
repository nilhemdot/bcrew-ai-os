# FOUNDATION-GATE-CHECK-SERIALIZATION-001 Plan

## What

Add the smallest shared serialization guard for DB-heavy Foundation proof checks before Brain Fleet and extractor readiness work continues.

The card classifies heavy checks, wraps the DB-heavy entrypoints with a local atomic lock, documents that these checks run sequentially, and dogfoods concurrent proof attempts so they do not produce misleading raw health failures. The guard also permits owner-token reentry for child proof checks spawned by the current heavy-check owner, so delegated verifier health scripts do not self-deadlock.

## Why

A concurrent proof bundle produced a Postgres deadlock while the same System Health proof passed sequentially. Foundation must be 100% trustworthy before Brain Fleet, route probes, extractor proof, or Strategy work. The right fix is to serialize known DB-heavy proof checks, not to hide failures by classification.

## Acceptance Criteria

- `foundation:verify`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, and `backlog:hygiene` are classified as heavy Foundation DB proof checks.
- Each heavy check enters through the shared serialization wrapper before it opens or uses Foundation DB state.
- Concurrent heavy proof attempts serialize locally and do not overlap.
- Child proof checks spawned by the active heavy-check owner may re-enter with the inherited owner token; unrelated heavy checks still wait.
- A synthetic permanent DB/verifier failure still fails closed and preserves the failure message.
- The System Health proof still exits red/yellow when raw health is red/yellow.
- `process:foundation-ship` remains sequential for heavy gates and still runs a final `foundation:verify`.
- Current Sprint/live plan truth names `FOUNDATION-GATE-CHECK-SERIALIZATION-001` as the active blocker until the card closes, then advances to `BRAIN-FLEET-FOUNDATION-001`.

## Definition Of Done

- Focused serialization proof passes with close-card mode, including concurrent serialization, owner-token reentry, and fail-closed permanent-error dogfood.
- Deep/System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship` all pass raw green after the card closes.
- Backlog row is done, Recent Work closeout exists, verifier coverage includes the card, and the Current Sprint active blocker advances to `BRAIN-FLEET-FOUNDATION-001`.
- Main is clean and pushed before Brain Fleet work begins.

## Details

Reuse the existing Foundation gate reliability and process wrapper patterns:

- Existing code: `lib/foundation-gate-reliability.js`, Foundation DB readiness checks, the Current Sprint overlay store, and the canonical `process:foundation-ship` wrapper.
- Existing docs: `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/process/foundation-ship-gate.md`, and the May 20 handoff.
- Existing scripts: `foundation:verify`, `process:system-health-nightly-audit-check`, `process:build-lane-repeated-failure-action-gate-check`, `backlog:hygiene`, and `process:foundation-ship`.
- Existing live backlog and Current Sprint truth stay authoritative; this card updates them only through the focused close-card proof.
- Add `lib/foundation-gate-check-serialization.js` for heavy-check classification, local lock acquisition, wrapper execution, dogfood proof, and card metadata.
- Wrap only the DB-heavy proof entrypoints needed for this run.
- Keep the existing transient retry classifier responsible for retry diagnosis; serialization reduces avoidable contention but does not convert real DB failures into green.
- Add `scripts/process-foundation-gate-check-serialization-check.mjs` as the focused process proof and close-card mutator.
- Update `docs/process/foundation-ship-gate.md`, `docs/rebuild/current-plan.md`, and `docs/rebuild/current-state.md` with the sequential heavy-check behavior and real run order.
- Gate decision tree: because the blast radius touches the canonical verifier, DB-backed health gates, package scripts, Current Sprint, and closeout truth, use the full gate after the focused proof: System Health, repeated-failure gate, backlog hygiene, `foundation:verify`, and `process:foundation-ship`.

## Risks

- Over-broad serialization could mask slow gates. Mitigation: the lock is scoped only to named heavy proof commands and the ship wrapper stays explicit about timing.
- Lock leakage could block future checks. Mitigation: the local lock records owner PID and has stale-lock cleanup.
- The fix could accidentally weaken failure behavior. Mitigation: dogfood throws a permanent synthetic verifier failure through the wrapper and requires fail-closed output.
- The fix could self-deadlock `foundation:verify` when it spawns `backlog:hygiene` for delegated health proof. Mitigation: owner-token reentry is allowed only when the current process or child process inherits the active lock owner's token; unrelated processes still serialize.
- Sprint truth could drift back to Brain Fleet too early. Mitigation: focused proof validates live Current Sprint before and after close-card behavior.
- Repair path: if the focused proof, raw health, repeated-failure gate, backlog hygiene, verifier, or ship gate fails, stop the run, keep `FOUNDATION-GATE-CHECK-SERIALIZATION-001` active, and repair the failing invariant before Brain Fleet starts. A stale lock can be removed only through the stale-owner cleanup path or a documented follow-up.
- Operator value: Steve gets a trustworthy raw-green control plane for the real workflow today, so Brain Fleet and extractor readiness can run without stopping on avoidable proof contention or accidentally hiding real Foundation health failures.
- Speed bound: the guard is a thin local lock around four heavy checks, not another heavy verifier layer; uncontended checks acquire the lock quickly, and the focused dogfood stays proportional while the full proof runs only at card close.

## Tests

- `npm run process:foundation-gate-check-serialization-check -- --close-card --json`
- `npm run process:system-health-nightly-audit-check -- --json`
- `npm run process:build-lane-repeated-failure-action-gate-check -- --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=FOUNDATION-GATE-CHECK-SERIALIZATION-001 --planApprovalRef=docs/process/approvals/FOUNDATION-GATE-CHECK-SERIALIZATION-001.json --closeoutKey=foundation-gate-check-serialization-v1 --commitRef=HEAD`
