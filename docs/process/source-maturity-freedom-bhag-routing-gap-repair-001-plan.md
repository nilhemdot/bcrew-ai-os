# SOURCE-MATURITY-FREEDOM-BHAG-ROUTING-GAP-REPAIR-001 Plan

## Goal

Repair the `SRC-FREEDOM-BHAG-001` source maturity routed-stage gap by creating one bounded retrieval chunk from the existing source-backed Freedom BHAG atom, then routing that signal into the internal Action Route Review layer without applying an action, creating a destination record, reading/writing Google Sheets, calling a provider, running extraction, or writing externally.

## What

Build a bounded Freedom BHAG routing repair. The card creates one active `intelligence_retrieval_chunks` row from the existing governed Freedom BHAG source fact and accepted atom, then creates one source-backed synthesized item and one approval-required pending `intelligence_action_routes` row. The route is review-only and must remain separate from trusted backlog cards, decisions, open questions, and external actions.

## Why

`SRC-FREEDOM-BHAG-001` already has a governed source fact and accepted atom from the prior Freedom BHAG atom-flow repair, but the source maturity grid blocks at `routed` because it has no retrieval chunk/route signal. Foundation needs that existing evidence to become reviewable operator work without touching the underlying source, reading/writing Google Sheets, or silently applying anything.

## Existing Work Check

- Reuse existing code, existing docs, existing scripts, Current Sprint, live backlog truth, and the existing source maturity grid instead of rebuilding source maturity, retrieval, or action-routing infrastructure.
- `SOURCE-MATURITY-FREEDOM-BHAG-ATOM-FLOW-REPAIR-001` already created the accepted `SRC-FREEDOM-BHAG-001` atom and atom hit.
- `SOURCE-MATURITY-ROUTING-GAP-REPAIR-001`, `SOURCE-MATURITY-MISSIVE-ROUTING-GAP-REPAIR-001`, and `SOURCE-MATURITY-OWNERS-LISTS-ROUTING-GAP-REPAIR-001` already proved the internal review route pattern.
- `lib/source-maturity-routing-gap-repair.js` already owns candidate selection, record building, route evaluation, and verified synthesized item/action-route behavior.
- `lib/source-maturity-routing-gap-repair-db.js` already owns the governed internal action-route insert/update path.
- `lib/foundation-db.js` already owns `upsertRetrievalChunk`.
- `lib/source-maturity-grid.js` already marks the `routed` stage green only when `intelligence_action_routes` has a source signal or the latest Action Router run lists the source.
- `lib/action-route-review-inbox.js` and `lib/action-route-promotion-workflow.js` already keep proposed routes approval-gated and separate from trusted destination records.
- Live Foundation data shows `SRC-FREEDOM-BHAG-001` has the target source fact and accepted atom but no route signal.

## Scope

- Add `lib/source-maturity-freedom-bhag-routing-gap-repair.js` as the focused Freedom BHAG wrapper, constants, retrieval chunk builder, synthetic dogfood proof, and closeout renderer.
- Add `scripts/process-source-maturity-freedom-bhag-routing-gap-repair-check.mjs` as the focused proof and live sprint progression script.
- Target only `SRC-FREEDOM-BHAG-001`, source fact `fact:39533f268562a6b6c6533952`, atom `atom:2829f75a674d99399917989b`, and retrieval chunk `chunk:source-maturity-freedom-bhag-community-goal-path`.
- Create or update one active retrieval chunk from the existing atom/fact only.
- Create or update one governed synthesized item and one pending approval-required action route using existing fact, atom, and the new bounded chunk.
- Keep the route in `approval_status=pending` with `approval_required=true`.
- Do not create or apply a destination backlog card, decision, question record, external action, connector write, Google Sheets read/write, or provider call.

## Not Next

- No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.
- No auth-required or paid run.
- No Google Sheets read/write.
- No external write.
- No action-route apply.
- No Google Drive permission mutation.
- Do not mutate Drive permissions.
- No live Agent Feedback auto-send.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.
- No broad Freedom BHAG mining and no route promotion in this card.

## Acceptance Criteria

- The live backlog card exists and moves through Current Sprint with complete scaffold metadata before `building_now`.
- The focused proof identifies `SRC-FREEDOM-BHAG-001` as a real routed-stage source maturity gap before mutation.
- The focused proof fails if the active source fact or accepted atom is missing.
- The focused proof fails if the bounded retrieval chunk cannot be built from the existing atom/fact.
- The focused proof writes exactly one stable retrieval chunk, one stable synthesized item, and one stable pending route for the target source when run with explicit apply/close-card flags.
- The route has `approval_status=pending`, `approval_required=true`, no destination record, and `metadata.noExternalWrite=true`.
- The route metadata names `SOURCE-MATURITY-FREEDOM-BHAG-ROUTING-GAP-REPAIR-001` and `source-maturity-freedom-bhag-routing-gap-repair-v1`.
- The retrieval chunk metadata has `noLiveExtraction=true`, `noExternalWrite=true`, and `noGoogleSheetsReadWrite=true`.
- The source maturity grid shows at least one route signal for `SRC-FREEDOM-BHAG-001` after repair and no longer reports `nextGap=routed` for that source.
- The proof demonstrates real function-path behavior and must reject substring-only claims.
- `backlog:hygiene`, focused proof, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/source-maturity-freedom-bhag-routing-gap-repair.js` contains the Freedom BHAG repair contract, retrieval chunk builder, synthetic dogfood proof, and closeout renderer.
- `scripts/process-source-maturity-freedom-bhag-routing-gap-repair-check.mjs` performs live Current Sprint progression, Plan Critic recording, focused proof, optional apply, and closeout writing.
- `package.json` registers `process:source-maturity-freedom-bhag-routing-gap-repair-check`.
- The closeout registry names `source-maturity-freedom-bhag-routing-gap-repair-v1`.
- The done-card verifier coverage list includes `SOURCE-MATURITY-FREEDOM-BHAG-ROUTING-GAP-REPAIR-001`.
- Full `process:foundation-ship` passes on committed `HEAD`, then the branch is pushed.

## Details

- Read the target fact from `intelligence_synthesis_facts`.
- Read only atom `atom:2829f75a674d99399917989b` from `intelligence_atoms`.
- Create only retrieval chunk `chunk:source-maturity-freedom-bhag-community-goal-path` in `intelligence_retrieval_chunks`.
- Build a `source-maturity-freedom-bhag-routing-gap-repair-v1` synthesized item with verified `synthesisVerification` metadata.
- Build a `needs_owner_decision` route to `open_questions` with verified route metadata, but do not insert an open-question row.
- Insert/update repair rows only when the focused proof is run with explicit apply/close-card flags.
- Re-read the source maturity grid after insertion to prove routeSignals changed through the same live source maturity function path that Foundation uses.

## Behavior Proof

Focused proof calls the actual function path:

- `buildFreedomBhagRetrievalChunk`
- `upsertRetrievalChunk`
- `selectSourceMaturityRoutingRepairCandidate`
- `buildFreedomBhagRoutingRepairRecords`
- `applySourceMaturityRoutingRepairRecords`
- `evaluateSourceMaturityRoutingGapRepair`
- the live source maturity grid after the route exists

Dogfood cases:

- A source with a routed-stage gap and no route fails as unrepaired.
- Missing active source fact fails closed.
- Missing accepted atom fails closed.
- Missing active tier-one evidence chunk fails closed.
- The bounded retrieval chunk must be built from the existing atom/fact.
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
3. Focused proof in building-now stage with `--apply` to create the bounded retrieval chunk and internal pending route from existing evidence.
4. Focused close-card proof to write the closeout and prove the repaired source maturity row.
5. Backlog hygiene.
6. Full `process:foundation-ship` before push.

## Blast Radius

This touches internal Foundation source readiness, retrieval, and action-route proposal rows only:

- `intelligence_retrieval_chunks`
- `intelligence_synthesis_runs`
- `intelligence_synthesized_items`
- `intelligence_action_router_runs`
- `intelligence_action_routes`
- live backlog/current sprint metadata
- source maturity verification surfaces

It does not touch external systems, connectors, OAuth, provider spend, Harlan/Fal/voice/Canva/OpenHuman features, Drive permissions, Google Sheets, or broad UI layout.

## Risks

- If the route is applied during this card, Foundation would silently turn proposed intelligence into an operational record. Repair path: fail closed unless the route is pending, approval-required, and has no destination record.
- If the route lacks fact, atom, or chunk refs, the source maturity row could become false green. Repair path: fail the focused proof and do not write the route.
- If the proof reads/writes Google Sheets, this becomes unapproved connector/source work. Repair path: target existing DB fact/atom evidence only and require `noGoogleSheetsReadWrite=true`.
- If the proof only checks markdown strings, the same wiring mistakes from earlier sprints can return. Repair path: call the real chunk builder, selector, record builder, live DB insert path, and source maturity grid.

## Tests

- `node --check lib/source-maturity-routing-gap-repair.js lib/source-maturity-routing-gap-repair-db.js lib/source-maturity-freedom-bhag-routing-gap-repair.js scripts/process-source-maturity-freedom-bhag-routing-gap-repair-check.mjs`
- `npm run process:source-maturity-freedom-bhag-routing-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-freedom-bhag-routing-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-freedom-bhag-routing-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-freedom-bhag-routing-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-FREEDOM-BHAG-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-FREEDOM-BHAG-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-freedom-bhag-routing-gap-repair-v1 --commitRef=HEAD`

## Operator Value

Steve gets the governed Freedom BHAG source moved into the same reviewable Action Route path as Slack, Missive, and Owners Lists without a live Sheets read/write, route apply, or external side effect.

## Speed Bound

The focused proof should stay under 2 minutes because it targets one source, one fact, one atom, one generated chunk, one route, and one source maturity grid reload. Full verification remains proportional and runs only at ship time through `process:foundation-ship`.
