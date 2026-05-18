# SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001 Plan

## Goal

Repair the `SRC-MISSIVE-001` source maturity routed-stage gap by routing one existing Missive source-backed signal into the internal Action Route Review layer without applying an action, creating a destination record, calling a provider, running extraction, or writing to any external system.

## What

Build a bounded Missive routing repair. The card creates one source-backed synthesized item and one approval-required pending `intelligence_action_routes` row from existing Missive source-health, atom, and retrieval chunk evidence. The route is review-only and must remain separate from trusted backlog cards, decisions, open questions, and external actions.

## Why

`SRC-MISSIVE-001` already has current source-health proof plus tier-one Missive atom/chunk evidence, but the source maturity grid blocks at `routed` because there is no internal action-route signal. Foundation needs the existing evidence to become reviewable operator work without silently applying anything.

## Existing Work Check

- Reuse existing code, existing docs, existing scripts, Current Sprint, live backlog truth, and the existing source maturity grid instead of rebuilding source maturity or action-routing infrastructure.
- `SOURCE-MATURITY-GAP-FOLLOWUP-001` already established the child repair pattern for maturity rows whose next gap is `routed`.
- `SOURCE-MATURITY-ROUTING-GAP-REPAIR-001` already proved the Slack version of this internal review route pattern.
- `lib/source-maturity-routing-gap-repair.js` already owns the reusable candidate selection, record builder, route evaluator, and verified synthesized item/action-route behavior.
- `lib/source-maturity-grid.js` already marks the `routed` stage green only when `intelligence_action_routes` has a source signal or the latest Action Router run lists the source.
- `lib/intelligence-action-router.js`, `lib/action-route-review-inbox.js`, and `lib/action-route-promotion-workflow.js` already keep proposed routes approval-gated and separate from trusted destination records.
- Live Foundation data shows `SRC-MISSIVE-001` has an active source-health fact, the existing `Atlassian organization now has Goals and Projects enabled` atom, its active retrieval chunk, and routeSignals=0.

## Scope

- Patch the shared routing repair helper so a new source repair can pass card-specific metadata instead of hardcoding the prior Slack card.
- Add `lib/source-maturity-missive-routing-gap-repair.js` as the focused Missive wrapper, constants, synthetic dogfood proof, and closeout renderer.
- Add `scripts/process-source-maturity-missive-routing-gap-repair-check.mjs` as the focused proof and live sprint progression script.
- Target only `SRC-MISSIVE-001` and the bounded Atlassian Goals/Projects Missive atom/chunk in V1.
- Create or update one governed synthesized item and one pending approval-required action route using existing:
  - active `intelligence_synthesis_facts` source-health fact,
  - active `intelligence_atoms` Missive evidence atom,
  - active `intelligence_retrieval_chunks` evidence chunk.
- Keep the route in `approval_status=pending` with `approval_required=true`.
- Do not create or apply a destination backlog card, decision, question record, external action, connector write, or provider call.

## Not Next

- No live extraction, transcript fetch, screenshot capture, crawl, or model/provider call.
- No auth-required or paid run.
- No external write.
- No action-route apply.
- No Google Drive permission mutation.
- Do not mutate Drive permissions.
- No live Agent Feedback auto-send.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.
- No broad Missive mining, no inbox sweep, and no route promotion in this card.

## Acceptance Criteria

- The live backlog card exists and moves through Current Sprint with complete scaffold metadata before `building_now`.
- The focused proof identifies `SRC-MISSIVE-001` as a real routed-stage source maturity gap before mutation.
- The focused proof fails if active source-health fact, active bounded Missive atom, or active bounded retrieval chunk evidence is missing.
- The focused proof writes exactly one stable synthesized item and one stable pending route for the target source.
- The route has `approval_status=pending`, `approval_required=true`, no destination record, and `metadata.noExternalWrite=true`.
- The route metadata names `SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001` and `source-maturity-missive-routing-gap-repair-v1`, not the prior Slack card.
- The source maturity grid shows at least one route signal for `SRC-MISSIVE-001` after repair and no longer reports `nextGap=routed` for that source.
- The proof demonstrates real function-path behavior and must reject substring-only claims.
- `backlog:hygiene`, focused proof, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/source-maturity-routing-gap-repair.js` accepts card-specific metadata while preserving the Slack repair defaults.
- `lib/source-maturity-missive-routing-gap-repair.js` contains the Missive repair contract, synthetic dogfood proof, and closeout renderer.
- `scripts/process-source-maturity-missive-routing-gap-repair-check.mjs` performs the live Current Sprint progression, Plan Critic recording, focused proof, optional apply, and closeout writing.
- `package.json` registers `process:source-maturity-missive-routing-gap-repair-check`.
- The closeout registry names `source-maturity-missive-routing-gap-repair-v1`.
- The done-card verifier coverage list includes `SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001`.
- Full `process:foundation-ship` passes on committed `HEAD`, then the branch is pushed.

## Details

- Read live Missive facts from `intelligence_synthesis_facts`.
- Read only the bounded Missive atom `atom:shared-candidate:669f63ab79db7dc0bd59626b`.
- Read only the bounded retrieval chunk `chunk:shared-candidate:669f63ab79db7dc0bd59626b`.
- Build a `source-maturity-missive-routing-gap-repair-v1` synthesized item with verified `synthesisVerification` metadata.
- Build a `needs_owner_decision` route to `open_questions` with verified route metadata, but do not insert an open-question row.
- Insert/update the repair rows only when the focused proof is run with explicit apply/close-card flags.
- Re-read the source maturity grid after insertion to prove routeSignals changed through the same live source maturity function path that Foundation uses.

## Behavior Proof

Focused proof calls the actual function path:

- `selectSourceMaturityRoutingRepairCandidate`
- `buildMissiveRoutingRepairRecords`
- `evaluateSourceMaturityRoutingGapRepair`
- the live DB insert path for `intelligence_synthesis_runs`, `intelligence_synthesized_items`, `intelligence_action_router_runs`, and `intelligence_action_routes`
- the live source maturity grid after the route exists

Dogfood cases:

- A source with a routed-stage gap and no route fails as unrepaired.
- Missing active tier-one evidence chunk fails closed.
- Missing active source-health fact fails closed.
- Missing active atom fails closed.
- Verified synthesized item metadata is required before route creation.
- Verified action-route metadata is required before route creation.
- The route must remain `pending` and `approval_required=true`.
- Destination record must remain empty.
- The target source must have routeSignals >= 1 after repair.
- The target source must no longer have `nextGap=routed` after repair.
- The script text must reject substring-only proof by checking real module calls and live DB rows, not just markdown claims.

## Gate Decision Tree

1. Static syntax check first with `node --check`.
2. Focused proof in scoping and sprint-ready stages to validate plan, approval, backlog/current sprint metadata, and dogfood without route mutation.
3. Focused proof in building-now stage with `--apply` to create the internal pending route from existing evidence.
4. Focused close-card proof to write the closeout and prove the repaired source maturity row.
5. Backlog hygiene.
6. Full `process:foundation-ship` before push.

## Blast Radius

This touches internal Foundation source readiness and action-route proposal rows only:

- `intelligence_synthesis_runs`
- `intelligence_synthesized_items`
- `intelligence_action_router_runs`
- `intelligence_action_routes`
- live backlog/current sprint metadata
- source maturity verification surfaces

It does not touch external systems, connectors, OAuth, provider spend, Harlan/Fal/voice/Canva/OpenHuman features, Drive permissions, or broad UI layout.

## Risks

- If the route is applied during this card, Foundation would silently turn proposed intelligence into an operational record. Repair path: fail closed unless the route is pending, approval-required, and has no destination record.
- If the route lacks fact, atom, or chunk refs, the source maturity row could become false green. Repair path: fail the focused proof and do not write the route.
- If the route uses a broad Missive sweep, this becomes unapproved extraction/review work. Repair path: target one existing atom/chunk only.
- If the proof only checks markdown strings, the same wiring mistakes from earlier sprints can return. Repair path: call the real selector, record builder, live DB insert path, and source maturity grid.

## Tests

- `node --check lib/source-maturity-routing-gap-repair.js lib/source-maturity-missive-routing-gap-repair.js scripts/process-source-maturity-missive-routing-gap-repair-check.mjs`
- `npm run process:source-maturity-missive-routing-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-missive-routing-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-missive-routing-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-missive-routing-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-missive-routing-gap-repair-v1 --commitRef=HEAD`

## Operator Value

Steve gets another real source maturity row moving through the safe review lane. Missive evidence becomes reviewable work without pretending route apply, external writeback, or broad inbox mining has been approved.

## Speed Bound

The focused proof should stay under 2 minutes because it targets one source, one fact, one atom, one chunk, one route, and one source maturity grid reload. Full verification remains proportional and runs only at ship time through `process:foundation-ship`.
