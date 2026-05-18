# SOURCE-MATURITY-FREEDOM-SHEET-ROUTING-GAP-REPAIR-001 Plan

## Goal

Repair the `SRC-FREEDOM-TEAM-001` and `SRC-FREEDOM-COMMUNITY-REV-001` source maturity routed-stage gaps by creating bounded retrieval chunks from existing Freedom Sheet atoms, then routing those signals into the internal Action Route Review layer without applying actions, creating destination records, reading/writing Google Sheets, calling a provider, running extraction, or writing externally.

## What

Build a bounded Freedom Sheet routing repair. The card creates one active `intelligence_retrieval_chunks` row per target from the existing governed source fact and accepted atom, then creates one source-backed synthesized item and one approval-required pending `intelligence_action_routes` row per target. The routes are review-only and must remain separate from trusted backlog cards, decisions, open questions, and external actions.

## Why

`SRC-FREEDOM-TEAM-001` and `SRC-FREEDOM-COMMUNITY-REV-001` already have governed source facts and accepted atoms from the prior Freedom Sheet evidence and atom-flow repairs, but the source maturity grid now blocks at `routed` because neither source has retrieval chunk/action-route signals. Foundation needs those existing signals to become reviewable operator work without touching the underlying sheet, running extraction, or silently applying anything.

## Existing Work Check

- Reuse existing code, existing docs, existing scripts, Current Sprint, live backlog truth, and the existing source maturity grid instead of rebuilding source maturity, retrieval, or action-routing infrastructure.
- `SOURCE-MATURITY-FREEDOM-SHEET-EVIDENCE-GAP-REPAIR-001` already created governed source facts for both signed-off Freedom Sheet targets.
- `SOURCE-MATURITY-FREEDOM-SHEET-ATOM-FLOW-REPAIR-001` already created accepted atoms and supporting atom hits for both targets.
- `SOURCE-MATURITY-ROUTING-GAP-REPAIR-001`, `SOURCE-MATURITY-FUB-ROUTING-GAP-REPAIR-001`, and related routing repairs already proved the internal review route pattern.
- `lib/source-maturity-routing-gap-repair.js` already owns candidate selection, record building, route evaluation, and verified synthesized item/action-route behavior.
- `lib/source-maturity-routing-gap-repair-db.js` already owns the governed internal action-route insert/update path.
- `lib/foundation-db.js` already owns `upsertRetrievalChunk`.
- `lib/source-maturity-grid.js` already marks the `routed` stage green only when `intelligence_action_routes` has a source signal or the latest Action Router run lists the source.
- `lib/action-route-review-inbox.js` and `lib/action-route-promotion-workflow.js` already keep proposed routes approval-gated and separate from trusted destination records.

## Scope

- Add `lib/source-maturity-freedom-sheet-routing-gap-repair.js` as the focused Freedom Sheet wrapper, constants, retrieval chunk builder, synthetic dogfood proof, multi-target evaluation, and closeout renderer.
- Add `scripts/process-source-maturity-freedom-sheet-routing-gap-repair-check.mjs` as the focused proof and live sprint progression script.
- Target only:
  - `SRC-FREEDOM-TEAM-001`, fact `fact:a76eb15fe718d1eb8dda2a93`, atom `atom:9efb209f15d6d2d1c544d9af`, chunk `chunk:source-maturity-freedom-team-current-reality-review`.
  - `SRC-FREEDOM-COMMUNITY-REV-001`, fact `fact:280b56f9991a417bc91ef4be`, atom `atom:3049bc25ab9ce4fec6fcb273`, chunk `chunk:source-maturity-freedom-community-revenue-current-reality-review`.
- Create or update one active retrieval chunk for each target from the existing atom/fact only.
- Create or update one governed synthesized item and one pending approval-required action route per target using existing fact, atom, and the new bounded chunk.
- Keep each route in `approval_status=pending` with `approval_required=true`.
- Repair the full diagnostics payload budget red exposed during ship proof by preserving backlog proof fields and compacting heavy Action Route internals behind existing dedicated detail/review routes. Preserve all backlog history through `/api/foundation/backlog/:cardId` and `/api/foundation/backlog/done-archive`, and preserve route review through `/api/foundation/action-route-review-inbox`; do not delete, hide, or rewrite backlog/action-route semantics.
- Do not create or apply destination backlog cards, decisions, question records, external actions, connector writes, Google Sheets reads/writes, Drive permission changes, extraction jobs, or provider calls.

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
- No broad Freedom Sheet mining and no route promotion in this card.

## Acceptance Criteria

- The live backlog card exists and moves through Current Sprint with complete scaffold metadata before `building_now`.
- The focused proof identifies both target sources as real routed-stage source maturity gaps before mutation.
- The focused proof fails if either active source fact, accepted atom, or bounded evidence chunk is missing.
- The focused proof writes exactly two stable retrieval chunks, two stable synthesized items, and two stable pending routes for the target sources when run with explicit apply/close-card flags.
- Each route has `approval_status=pending`, `approval_required=true`, no destination record, and `metadata.noExternalWrite=true`.
- Each route metadata names `SOURCE-MATURITY-FREEDOM-SHEET-ROUTING-GAP-REPAIR-001` and `source-maturity-freedom-sheet-routing-gap-repair-v1`.
- Each retrieval chunk metadata has `noLiveExtraction=true`, `noExternalWrite=true`, and `noGoogleSheetsReadWrite=true`.
- The source maturity grid shows at least one route signal for each target after repair and no longer reports `nextGap=routed` for either source.
- The full diagnostics route remains under its separate diagnostic payload budget after the new retrieval/action-route rows exist, without stripping historical proof fields that `foundation:verify` depends on or embedding oversized Action Route metadata/proposed payloads.
- The proof demonstrates real function-path behavior and must reject substring-only claims.
- `backlog:hygiene`, focused proof, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/source-maturity-freedom-sheet-routing-gap-repair.js` contains the Freedom Sheet routing repair contract, retrieval chunk builder, synthetic dogfood proof, multi-target evaluation, and closeout renderer.
- `scripts/process-source-maturity-freedom-sheet-routing-gap-repair-check.mjs` performs live Current Sprint progression, Plan Critic recording, focused proof, optional apply, and closeout writing.
- `lib/hub-read-routes.js` keeps the full diagnostics route inside budget by using dedicated backlog detail/archive routes for full backlog inspection, preserving historical proof metadata, and compacting Action Route internals behind the Action Route Review Inbox route.
- `package.json` registers `process:source-maturity-freedom-sheet-routing-gap-repair-check`.
- The closeout registry names `source-maturity-freedom-sheet-routing-gap-repair-v1`.
- The done-card verifier coverage list includes `SOURCE-MATURITY-FREEDOM-SHEET-ROUTING-GAP-REPAIR-001`.
- Full `process:foundation-ship` passes on committed `HEAD`, then the branch is pushed.

## Details

- Read the target facts from `intelligence_synthesis_facts`.
- Read only the two target atoms from `intelligence_atoms`.
- Create only the two bounded retrieval chunks in `intelligence_retrieval_chunks`.
- Build `source-maturity-freedom-sheet-routing-gap-repair-v1` synthesized items with verified `synthesisVerification` metadata.
- Build `needs_owner_decision` routes to `open_questions` with verified route metadata, but do not insert open-question rows.
- Insert/update repair rows only when the focused proof is run with explicit apply/close-card flags.
- Re-read the source maturity grid after insertion to prove routeSignals changed through the same live source maturity function path that Foundation uses.
- Keep full diagnostics route backlog proof fields intact, compact heavy Action Route internals, and route full backlog/action-route inspection to dedicated routes.

## Behavior Proof

Focused proof calls the actual function path:

- `buildFreedomSheetRoutingRetrievalChunk`
- `upsertRetrievalChunk`
- `selectSourceMaturityRoutingRepairCandidate`
- `buildFreedomSheetRoutingRepairRecords`
- `applySourceMaturityRoutingRepairRecords`
- `evaluateFreedomSheetRoutingGapRepairs`
- the live source maturity grid after the routes exist

Dogfood cases:

- Sources with routed-stage gaps and no routes fail as unrepaired.
- Missing active source fact fails closed.
- Missing accepted atom fails closed.
- Missing active tier-one evidence chunk fails closed.
- Bounded retrieval chunks must be built from existing atom/fact evidence.
- Verified synthesized item metadata is required before route creation.
- Verified action-route metadata is required before route creation.
- Routes must remain `pending` and `approval_required=true`.
- Destination records must remain empty.
- Both target sources must have routeSignals >= 1 after repair.
- Both target sources must no longer have `nextGap=routed` after repair.
- The script text must reject substring-only proof by checking real module calls and live DB rows, not just markdown claims.

## Gate Decision Tree

1. Static syntax check first with `node --check`.
2. Focused proof in scoping and sprint-ready stages to validate plan, approval, backlog/current sprint metadata, and dogfood without route mutation.
3. Focused proof in building-now stage with `--apply` to create bounded retrieval chunks and internal pending routes from existing evidence.
4. Focused close-card proof to write the closeout and prove the repaired source maturity rows.
5. Backlog hygiene.
6. Full diagnostics payload budget check through `foundation:verify`.
7. Full `process:foundation-ship` before push.

## Blast Radius

This touches internal Foundation source readiness, retrieval, and action-route proposal rows only:

- `intelligence_retrieval_chunks`
- `intelligence_synthesis_runs`
- `intelligence_synthesized_items`
- `intelligence_action_router_runs`
- `intelligence_action_routes`
- live backlog/current sprint metadata
- source maturity verification surfaces
- full diagnostics backlog proof preservation and Action Route payload compaction

It does not touch external systems, connectors, OAuth, provider spend, Harlan/Fal/voice/Canva/OpenHuman features, Drive permissions, Google Sheets, or broad UI layout.

## Risks

- If a route is applied during this card, Foundation would silently turn proposed intelligence into an operational record. Repair path: fail closed unless every route is pending, approval-required, and has no destination record.
- If a route lacks fact, atom, or chunk refs, the source maturity row could become false green. Repair path: fail the focused proof and do not write the route.
- If the proof reads/writes Google Sheets or starts extraction, this becomes unapproved connector/source work. Repair path: target existing DB fact/atom evidence only and require `noGoogleSheetsReadWrite=true`.
- If the proof only checks markdown strings, the same wiring mistakes from earlier sprints can return. Repair path: call the real chunk builder, selector, record builder, live DB insert path, and source maturity grid.
- If full diagnostics re-expands heavy internals, small source repairs can keep tripping route budgets. If full diagnostics strips backlog proof fields, historical verifier checks false-red. Repair path: preserve backlog proof fields, compact Action Route internals, and route full backlog/action-route detail to the dedicated endpoints.

## Tests

- `node --check lib/source-maturity-routing-gap-repair.js lib/source-maturity-routing-gap-repair-db.js lib/source-maturity-freedom-sheet-routing-gap-repair.js lib/hub-read-routes.js scripts/process-source-maturity-freedom-sheet-routing-gap-repair-check.mjs`
- `npm run process:source-maturity-freedom-sheet-routing-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-freedom-sheet-routing-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-freedom-sheet-routing-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-freedom-sheet-routing-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-FREEDOM-SHEET-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-FREEDOM-SHEET-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-freedom-sheet-routing-gap-repair-v1 --commitRef=HEAD`

## Operator Value

Steve gets the signed-off Freedom Sheet source truth moved into the same reviewable Action Route path as other mature sources without opening Google Sheets, running live extraction, creating trusted destination records, or writing externally.

## Speed Bound

The focused proof should stay under 2 minutes because it targets two sources, two facts, two atoms, two generated chunks, two routes, and one source maturity grid reload. Full verification remains proportional and runs only at ship time through `process:foundation-ship`.
