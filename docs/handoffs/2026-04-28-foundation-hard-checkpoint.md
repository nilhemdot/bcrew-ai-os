# Foundation Hard Checkpoint

Status: evidence
Promoted to: `docs/system-strategy.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`, `docs/specs/2026-04-28-strategic-intelligence-loop.md`, live backlog

Date: 2026-04-28

## Purpose

Make sure the Apr 27-28 builder/reviewer conversations and rapid build work did not stay trapped in chat memory.
Nothing from Apr 27-28 should remain only in chat memory.

Steve's instruction was clear: nothing important from the last two days should be lost; durable direction must be backlogged, enriched, moved to the right lane, and made visible for tomorrow.

## Sources Reviewed

- Apr 27-28 commit chain on `main`
- live Foundation backlog from `/api/foundation-hub`
- active docs: `docs/system-strategy.md`, `docs/rebuild/current-plan.md`, `docs/rebuild/current-state.md`
- memory notes for Apr 27-28
- pasted Claude Code review/planning feedback in the main builder chat
- Strategy Hub route-review smoke state after `784fbf2`
- parallel read-only subagent audits for repo state, Strategic Intelligence/Scoper direction, Foundation tomorrow order, and missing doctrine/cards

## What Actually Shipped

Major commit chain:

- `4f6624f` through `204e307`: Strategy Hub was gated; old-system salvage and atom spine landed.
- `52d82d5` through `fbf3fd3`: lexical, semantic, and hybrid retrieval landed.
- `76561e4` through `563d383`: source-backed facts and governed synthesis landed.
- `d1cad22` through `9cd470b`: synthesis queue contract, Action Router, apply proof, and route integrity landed.
- `9530c76` and `f3a09ef`: Action Router control-plane truth and retrieval eval baseline landed.
- `79cd364`, `a4ecfb6`, `a633e86`: first Strategy Hub source-to-gap and review surfaces landed.
- `57c50c0`, `1d222ba`, `a4e0845`, `946202d`, `555438b`: Strategy leakage was contained and synthesis was repaired from atom spam into clustered output.
- `bf840d8`: Strategy command UI v1 and Foundation Recent Builds v1 landed.
- `da0342b`, `d4989ab`: Q2/conditional forecast truth was committed; synthesis/router repair closed and first Strategy route was generated.
- `40af9d0`, `4528a74`: Strategic Intelligence, Scoper, Strategy Quarter, model routing, and review cards were pinned.
- `784fbf2`: Strategy route review proof plumbing became human-readable and action controls were wired.

## Hard Finding

The system advanced, but the next build should not be more Strategy UI.

The Strategy work produced useful proof plumbing and exposed the real next intelligence layer, but Steve did not accept the UI as meeting-ready. The Foundation also still cannot explain a heavy build day well enough through Recent Builds.

Current call:

- pause Strategy UI polish
- do not build Scoper implementation yet
- do not start Agent Factory or Health Auditor agents
- return to Foundation visibility, freshness, runtime/extraction health, and build-closeout clarity

## Durable Doctrine Promoted

The checkpoint promoted these rules into active docs/backlog:

- memory is not backlog
- repo/live backlog/docs/verifier are operating truth
- handoffs are evidence unless promoted
- verifier green is not enough when product quality is the issue
- human-readable samples are part of closeout for synthesis, route review, Scoper, and Strategic Intelligence output
- UI is not accepted just because backend plumbing is correct
- Strategy Hub is a future business cockpit; Foundation remains the control plane
- Strategic Intelligence is continuous, not a quarterly document shelf
- the gap-resolving Scoper is the 10x depth layer, but it must be built after the strategic issue spec/schema is approved
- subscriptions are for humans/operator capacity when allowed and logged; system runtime belongs behind governed adapters/API routes
- Scoper is the first narrow agent-shaped build, not permission to build a broad agent factory
- every major build day needs a checkpoint: what changed, what belongs in backlog, what belongs in docs, what verifier guards it, what Steve should test next

## Backlog State After Checkpoint

Updated / confirmed:

- `FOUNDATION-SWEEP-001` moved to executing / P0.
- `FOUNDATION-CHANGELOG-002` created as scoped / P0.
- `SYSTEM-STRATEGY-REVIEW-001` closed for v1 after durable doctrine was promoted.
- `STRATEGY-HUB-MEETING-READY-001` moved out of active execution; proof plumbing shipped, UI not accepted.
- `STRATEGIC-INTEL-001` remains scoped / P0 as a spec gate.
- `INTEL-SCOPER-001` remains scoped / P0 and depends on `STRATEGIC-INTEL-001`.
- `STRATEGY-QUARTER-001` remains scoped / P1 as a context/input layer, not the value layer.
- `MODEL-ROUTING-001` remains scoped / P1 and targets `docs/rebuild/current-runtime-map.md`.
- Agent Factory remains deferred under the existing gate.

New design reference:

- `docs/specs/2026-04-28-strategic-intelligence-loop.md`

## Operational Risk Found

The hard checkpoint found a stale extraction run:

- target: `slack-current-day`
- status: `running`
- started: `2026-04-27T14:59:04.291Z`
- run id: `crawl-slack-current-day-20260427145904292-3f93bebd`

This belongs to Foundation runtime/extraction hardening, not Strategy. Carry it into `FOUNDATION-SWEEP-001`, `EXTRACT-CONTROL-001`, `RUNTIME-WORKER-001`, or `SYSTEM-010` before expanding autonomous loops.

## Tomorrow Plan

1. Reconcile checkpoint commit and live backlog.
2. Build `FOUNDATION-SWEEP-001`.
   - Map Foundation pages to backing APIs/docs/backlog/source owners.
   - Add verifier checks for stale plan/state/build surfaces.
   - Include stale source-crawl target detection.
3. Build `FOUNDATION-CHANGELOG-002`.
   - Recent Builds must show card, proof, status, system area, why it matters, and what Steve should test next.
4. Return to runtime/extraction/source-health work.
5. Only after Foundation visibility is clean, resume:
   - `STRATEGIC-INTEL-001` spec approval
   - `INTEL-SCOPER-001`
   - Strategy Hub meeting-ready redesign

## Explicitly Not Next

- Strategy UI polish
- Scoper implementation
- Agent Factory
- Health Auditor agent
- cleanup agent
- department Director agents
- blind six-month historical sweep

## If More Chat Evidence Appears

If Steve has Claude/Codex chats from Apr 27-28 that were not pasted into the main builder chat, reopen `SYSTEM-STRATEGY-REVIEW-001` or create a follow-up checkpoint card and repeat this promotion process.
