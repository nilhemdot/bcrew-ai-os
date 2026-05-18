# SOURCE-MATURITY-ROUTING-GAP-REPAIR-001 Plan

## Goal

Repair the smallest safe source maturity routed-stage gap by routing existing source-backed intelligence into the internal Action Route Review layer without applying an action, creating a destination record, calling a provider, running extraction, or writing to any external system.

## What

Build a bounded source maturity routing repair for `SRC-SLACK-001`. The card creates one source-backed synthesized item and one approval-required pending `intelligence_action_routes` row from existing Slack source-health, atom, and retrieval chunk evidence. The route is review-only and must surface in Foundation's existing Action Route Review lane without becoming a trusted backlog card, decision, or open-question record.

## Why

`SRC-SLACK-001` already has current extracted, atomized, and synthesized evidence, but the source maturity grid still blocks at `routed` because there is no internal action-route signal. That slows the Foundation machine: evidence exists, but it cannot become reviewable operator work. This card proves the safe handoff pattern from source-backed signal to internal review without applying anything externally.

## Existing Work Check

- Existing code, existing docs, existing scripts, Current Sprint, and live backlog truth are reused.
- `SOURCE-MATURITY-GAP-FOLLOWUP-001` already scoped `SOURCE-MATURITY-ROUTING-GAP-REPAIR-001` as the routing child queue for source maturity rows whose next gap is `routed`.
- `lib/source-maturity-grid.js` already marks the `routed` stage green only when `intelligence_action_routes` has a source signal or the latest Action Router run lists the source.
- `lib/intelligence-action-router.js` already owns approval-required `intelligence_action_routes`; routes remain proposals until an explicit approved apply path runs.
- `lib/action-route-review-inbox.js` and `lib/action-route-promotion-workflow.js` already keep route review separate from trusted backlog cards and expose review/promotion states.
- Live Foundation data shows `SRC-SLACK-001` has current extracted/atomized/synthesized evidence but no action route signal: active source-health fact, current tier-one atom, active retrieval chunk, and routeSignals=0.

## Scope

- Add `lib/source-maturity-routing-gap-repair.js` as the focused behavior module.
- Add `scripts/process-source-maturity-routing-gap-repair-check.mjs` as the focused proof and live sprint progression script.
- Mark the targeted synthesis repair run as `metadata.qualityExempt=true` and keep global synthesis-engine quality snapshots from treating targeted source-repair runs as the latest global synthesis proof.
- Target only `SRC-SLACK-001` in V1 because it has the narrowest existing source-backed evidence set needed to prove the pattern.
- Create or update one governed synthesized item and one pending approval-required action route using existing:
  - active `intelligence_synthesis_facts` source-health fact,
  - active `intelligence_atoms` evidence atom,
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
- Do not work MEETING-VAULT-ACL-001 Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.
- No atom fabrication and no broad source maturity cleanup in this card.

## Acceptance Criteria

- The live backlog card exists and moves through Current Sprint with complete scaffold metadata before `building_now`.
- The focused proof identifies `SRC-SLACK-001` as a real routed-stage source maturity gap before mutation.
- The focused proof fails if active source-health fact, active atom, or active retrieval chunk evidence is missing.
- The focused proof writes exactly one stable synthesized item and one stable pending route for the target source.
- The route has `approval_status=pending`, `approval_required=true`, no destination record, and `metadata.noExternalWrite=true`.
- The source maturity grid shows at least one route signal for `SRC-SLACK-001` after repair and no longer reports `nextGap=routed` for that source.
- The proof demonstrates real function-path behavior and must reject substring-only claims.
- `backlog:hygiene`, focused proof, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/source-maturity-routing-gap-repair.js` contains the reusable candidate selection, record builder, evaluator, synthetic dogfood proof, and closeout renderer.
- `scripts/process-source-maturity-routing-gap-repair-check.mjs` performs the live Current Sprint progression, Plan Critic recording, focused proof, optional apply, and closeout writing.
- `package.json` registers `process:source-maturity-routing-gap-repair-check`.
- The closeout registry names `source-maturity-routing-gap-repair-v1`.
- The done-card verifier coverage list includes `SOURCE-MATURITY-ROUTING-GAP-REPAIR-001`.
- The route remains internal proposal-only. Any apply or destination mutation remains a separate approved action-route promotion workflow.
- Full `process:foundation-ship` passes on committed `HEAD`, then the branch is pushed.

## Details

- Read live Slack facts from `intelligence_synthesis_facts`.
- Read live Slack atoms from `intelligence_atoms`.
- Read live Slack retrieval chunks from `intelligence_retrieval_chunks`.
- Build a `source-maturity-routing-gap-repair-v1` synthesized item with verified `synthesisVerification` metadata.
- Build a `needs_owner_decision` route to `open_questions` with verified route metadata, but do not insert an open-question row.
- Insert/update the repair rows only when the focused proof is run with explicit apply/close-card flags.
- Re-read the source maturity grid after insertion to prove routeSignals changed through the same live source maturity function path that Foundation uses.
- Re-read the synthesis-engine snapshot through `lib/intelligence-synthesis.js` so a targeted repair run does not hijack global `latestProofQuality`.

## Behavior Proof

Focused proof calls the actual function path:

- `selectSourceMaturityRoutingRepairCandidate`
- `buildSourceMaturityRoutingRepairRecords`
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
- If the proof only checks markdown strings, the same wiring mistakes from earlier sprints can return. Repair path: call the real selector, record builder, live DB insert path, and source maturity grid.
- If a route already exists with a non-pending status, do not reset it to pending. Preserve the review state and route the follow-up through Action Route Promotion Workflow.
- If a targeted repair run becomes the global synthesis quality run, `foundation:verify` must stay red. Repair path: mark the run quality-exempt and keep the global synthesis quality query focused on non-exempt synthesis proof runs.

## Tests

- `node --check lib/source-maturity-routing-gap-repair.js scripts/process-source-maturity-routing-gap-repair-check.mjs`
- `npm run process:source-maturity-routing-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-routing-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-routing-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-routing-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-routing-gap-repair-v1 --commitRef=HEAD`

## Operator Value

Steve gets a real source maturity repair instead of another report: a source that already has facts, atoms, and evidence chunks is moved into the internal review/action lane. This makes Foundation faster because evidence can become reviewable work without silently becoming trusted backlog, decisions, or external writes.

## Speed Bound

The focused proof should stay under 2 minutes because it targets one source, one route, and one source maturity grid reload. Full verification remains proportional and runs only at ship time through `process:foundation-ship`.
