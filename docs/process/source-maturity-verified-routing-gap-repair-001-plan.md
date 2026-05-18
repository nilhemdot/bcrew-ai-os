# SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001 Plan

## Goal

Repair the routed-stage source maturity gap for six verified/readable sources by creating bounded retrieval chunks from existing accepted atoms, then routing those signals into approval-required internal Action Route Review items. This must not read or write the source systems, run extraction, call a provider, apply a route, create destination records, or write externally.

## What

Build a bounded verified source routing repair. The card creates one active `intelligence_retrieval_chunks` row per target from an existing governed source fact and accepted atom, then creates one source-backed synthesized item and one pending `intelligence_action_routes` row per target. The routes are review-only and must stay separate from trusted backlog cards, decisions, open questions, and external actions.

## Why

`SRC-CLICKUP-001`, `SRC-GDOCS-001`, `SRC-GSHEETS-001`, `SRC-DATAFORSEO-001`, `SRC-GHL-001`, and `SRC-META-001` already have governed source facts and accepted atoms from the prior verified source evidence and atom-flow repairs. The source maturity grid now blocks at `routed` because those sources have no retrieval chunk/action-route signals. Foundation needs those existing signals to become reviewable operator work without touching the underlying source systems or pretending route apply is approved.

## Existing Work Check

- Reuse existing code, existing docs, existing scripts, Current Sprint, and live backlog truth.
- Reuse existing source maturity, retrieval, and action-route infrastructure instead of rebuilding it.
- `SOURCE-MATURITY-VERIFIED-EVIDENCE-GAP-REPAIR-001` already created governed source facts for the six verified/readable targets.
- `SOURCE-MATURITY-VERIFIED-ATOM-FLOW-REPAIR-001` already created accepted atoms and supporting atom hits for the six targets.
- `SOURCE-MATURITY-ROUTING-GAP-REPAIR-001`, `SOURCE-MATURITY-FUB-ROUTING-GAP-REPAIR-001`, and related routing repairs already proved the internal review route pattern.
- `lib/source-maturity-routing-gap-repair.js` already owns candidate selection, record building, route evaluation, and verified synthesized item/action-route behavior.
- `lib/source-maturity-routing-gap-repair-db.js` already owns the governed internal action-route insert/update path.
- `lib/foundation-db.js` already owns `upsertRetrievalChunk`.
- `lib/source-maturity-grid.js` already marks the `routed` stage green only when `intelligence_action_routes` has a source signal or the latest Action Router run lists the source.
- `lib/action-route-review-inbox.js` and `lib/action-route-promotion-workflow.js` already keep proposed routes approval-gated and separate from trusted destination records.

## Scope

- Add `lib/source-maturity-verified-routing-gap-repair.js` as the focused verified source wrapper, constants, retrieval chunk builder, synthetic dogfood proof, multi-target evaluation, and closeout renderer.
- Add `scripts/process-source-maturity-verified-routing-gap-repair-check.mjs` as the focused proof and live sprint progression script.
- Repair the Strategy Hub v2 route-window gate exposed by this card: operational route inserts must not push strategy review routes out of the Strategy Hub payload. This is loading/API contract repair only, not Strategy Hub feature work or visual redesign.
- Target only:
  - `SRC-CLICKUP-001`, fact `fact:44ecd00a1c18edd32086bc2e`, atom `atom:79bc05e6c8dd38bd4cba5b44`, chunk `chunk:source-maturity-clickup-verified-boundary-review`.
  - `SRC-GDOCS-001`, fact `fact:95460ff02f9ff168ea45a467`, atom `atom:717f538b22e4c8361b774bcd`, chunk `chunk:source-maturity-google-docs-verified-boundary-review`.
  - `SRC-GSHEETS-001`, fact `fact:9072210d62317f86ff231c7c`, atom `atom:8ba533dce84c8837b07d544c`, chunk `chunk:source-maturity-google-sheets-verified-boundary-review`.
  - `SRC-DATAFORSEO-001`, fact `fact:a6571fb06859cecd05138fac`, atom `atom:dda7a732d7a2bec53cdc6d99`, chunk `chunk:source-maturity-dataforseo-verified-boundary-review`.
  - `SRC-GHL-001`, fact `fact:edcecea350071c499e040514`, atom `atom:74e61df97724577e92ecbbae`, chunk `chunk:source-maturity-ghl-verified-boundary-review`.
  - `SRC-META-001`, fact `fact:905fde9fc2fcf1d0f24662a1`, atom `atom:5ea6a2a9c629367e4ba752d8`, chunk `chunk:source-maturity-meta-verified-boundary-review`.
- Create or update one active retrieval chunk for each target from the existing atom/fact only.
- Create or update one governed synthesized item and one pending approval-required action route per target using existing fact, atom, and the new bounded chunk.
- Keep each route in `approval_status=pending` with `approval_required=true`.
- Do not create or apply destination backlog cards, decisions, question records, external actions, connector writes, source reads/writes, Drive permission changes, extraction jobs, provider calls, or model calls.

## Not Next

- No live extraction, extraction target creation, transcript fetch, screenshot capture, crawl, or model/provider call.
- No auth-required or paid run.
- No live provider/source read or write.
- No external write.
- No action-route apply.
- No Google Drive permission mutation.
- Do not mutate Drive permissions.
- No live Agent Feedback auto-send.
- Do not work `MEETING-VAULT-ACL-001` Phase B.
- No Harlan/Fal/voice/Canva/OpenHuman feature work.
- No broad Foundation UI redesign.
- No broad verified source mining and no route promotion in this card.

## Acceptance Criteria

- The live backlog card exists and moves through Current Sprint with complete scaffold metadata before `building_now`.
- The focused proof identifies all six target sources as real routed-stage source maturity gaps before mutation.
- The focused proof fails if any active source fact, accepted atom, or bounded evidence chunk is missing.
- The focused proof writes exactly six stable retrieval chunks, six stable synthesized items, and six stable pending routes for the target sources when run with explicit apply/close-card flags.
- Each route has `approval_status=pending`, `approval_required=true`, no destination record, and `metadata.noExternalWrite=true`.
- Each route metadata names `SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001` and `source-maturity-verified-routing-gap-repair-v1`.
- Each retrieval chunk metadata has `noLiveExtraction=true`, `noProviderCall=true`, `noPaidRun=true`, `noSourceReadWrite=true`, and `noExternalWrite=true`.
- The source maturity grid shows at least one route signal for each target after repair and no longer reports `nextGap=routed` for those targets.
- Strategy Hub v2 gets a dedicated strategy route window so newly inserted operational/source-maturity routes cannot starve strategy-route review proof.
- The proof demonstrates real function-path behavior and must reject substring-only claims.
- `backlog:hygiene`, focused proof, and full `process:foundation-ship` pass before push.

## Definition Of Done

- `lib/source-maturity-verified-routing-gap-repair.js` contains the verified source routing repair contract, retrieval chunk builder, synthetic dogfood proof, multi-target evaluation, and closeout renderer.
- `scripts/process-source-maturity-verified-routing-gap-repair-check.mjs` performs live Current Sprint progression, Plan Critic recording, focused proof, optional apply, and closeout writing.
- `lib/intelligence-action-router.js` exposes a bounded `strategyRecentRoutes` window alongside generic recent routes.
- `lib/strategy-shared-comms-routes.js` uses the dedicated strategy route window when building Strategy Hub v2 payloads.
- `package.json` registers `process:source-maturity-verified-routing-gap-repair-check`.
- The closeout registry names `source-maturity-verified-routing-gap-repair-v1`.
- The done-card verifier coverage list includes `SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001`.
- Full `process:foundation-ship` passes on committed `HEAD`, then the branch is pushed.

## Details

- Read the target facts from `intelligence_synthesis_facts`.
- Read only the six target atoms from `intelligence_atoms`.
- Create only the six bounded retrieval chunks in `intelligence_retrieval_chunks`.
- Build `source-maturity-verified-routing-gap-repair-v1` synthesized items with verified `synthesisVerification` metadata.
- Build `needs_owner_decision` routes to `open_questions` with verified route metadata, but do not insert open-question rows.
- Insert/update repair rows only when the focused proof is run with explicit apply/close-card flags.
- Re-read the source maturity grid after insertion to prove routeSignals changed through the same live source maturity function path that Foundation uses.

## Behavior Proof

Focused proof calls the actual function path:

- `buildVerifiedSourceRoutingRetrievalChunk`
- `upsertRetrievalChunk`
- `selectSourceMaturityRoutingRepairCandidate`
- `buildVerifiedSourceRoutingRepairRecords`
- `applySourceMaturityRoutingRepairRecords`
- `evaluateVerifiedSourceRoutingGapRepairs`
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
- All six target sources must have routeSignals >= 1 after repair.
- All six target sources must no longer have `nextGap=routed` after repair.
- The script text must reject substring-only proof by checking real module calls and live DB rows, not just markdown claims.

## Gate Decision Tree

1. Static syntax check first with `node --check`.
2. Focused proof in scoping and sprint-ready stages to validate plan, approval, backlog/current sprint metadata, and dogfood without route mutation.
3. Focused proof in building-now stage with `--apply` to create bounded retrieval chunks and internal pending routes from existing evidence.
4. Focused close-card proof to write the closeout and prove the repaired source maturity rows.
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
- Strategy Hub v2 route-window API contract

It does not touch external systems, connectors, OAuth, provider spend, Harlan/Fal/voice/Canva/OpenHuman features, Drive permissions, source systems, or broad UI layout.

## Risks

- If a route is applied during this card, Foundation would silently turn proposed intelligence into an operational record. Repair path: fail closed unless every route is pending, approval-required, and has no destination record.
- If a route lacks fact, atom, or chunk refs, the source maturity row could become false green. Repair path: fail the focused proof and do not write the route.
- If the proof reads/writes sources or starts extraction, this becomes unapproved connector/source work. Repair path: target existing DB fact/atom evidence only and require `noSourceReadWrite=true`.
- If the proof only checks markdown strings, the same wiring mistakes from earlier sprints can return. Repair path: call the real chunk builder, selector, record builder, live DB insert path, and source maturity grid.
- If operational route inserts push Strategy Hub strategy routes out of the recent route window, unrelated source-maturity work can red-line the Strategy Hub proof. Repair path: keep a dedicated bounded strategy route window and merge it into the Strategy Hub payload by route ID.

## Tests

- `node --check lib/source-maturity-routing-gap-repair.js lib/source-maturity-routing-gap-repair-db.js lib/source-maturity-verified-routing-gap-repair.js lib/intelligence-action-router.js lib/strategy-shared-comms-routes.js scripts/process-source-maturity-verified-routing-gap-repair-check.mjs`
- `npm run process:source-maturity-verified-routing-gap-repair-check -- --apply --stage=scoping --json`
- `npm run process:source-maturity-verified-routing-gap-repair-check -- --apply --stage=sprint_ready --json`
- `npm run process:source-maturity-verified-routing-gap-repair-check -- --apply --stage=building_now --json`
- `npm run process:source-maturity-verified-routing-gap-repair-check -- --close-card --json`
- `npm run backlog:hygiene -- --json`
- `npm run foundation:verify`
- `npm run process:foundation-ship -- --card=SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001 --planApprovalRef=docs/process/approvals/SOURCE-MATURITY-VERIFIED-ROUTING-GAP-REPAIR-001.json --closeoutKey=source-maturity-verified-routing-gap-repair-v1 --commitRef=HEAD`

## Operator Value

Steve gets six verified/readable source truths moved into the same reviewable Action Route path as other mature sources without opening source systems, running live extraction, creating trusted destination records, or writing externally.

## Speed Bound

The focused proof should stay under 2 minutes because it targets six sources, six facts, six atoms, six generated chunks, six routes, and one source maturity grid reload. Full verification remains proportional and runs only at ship time through `process:foundation-ship`.
